import { useState, useCallback, useEffect } from 'react';
import {
  fetchAllEntities,
  collectAssetEntries,
  buildZip,
  uploadExportAndRecord,
  fetchExportHistory,
  updateExportNotes,
  deleteExportRun,
  type ExportRun,
  type ExportManifest,
} from '../lib/exportUtils';

export interface ExportProgress {
  isExporting: boolean;
  progress: number;
  statusMessage: string;
  error: string | null;
  latestRun: ExportRun | null;
}

export interface ExportHistoryState {
  runs: ExportRun[];
  loading: boolean;
  error: string | null;
}

export function useExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
    statusMessage: '',
    error: null,
    latestRun: null,
  });

  const [history, setHistory] = useState<ExportHistoryState>({
    runs: [],
    loading: true,
    error: null,
  });

  const loadHistory = useCallback(async () => {
    setHistory(h => ({ ...h, loading: true, error: null }));
    try {
      const runs = await fetchExportHistory();
      setHistory({ runs, loading: false, error: null });
    } catch (err) {
      setHistory(h => ({
        ...h,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load history.',
      }));
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const startExport = useCallback(async () => {
    setProgress({ isExporting: true, progress: 0, statusMessage: 'Starting export...', error: null, latestRun: null });

    try {
      // Phase 1: Fetch all data (0–50%)
      const entities = await fetchAllEntities((msg) => {
        setProgress(s => ({ ...s, statusMessage: msg }));
      });

      setProgress(s => ({ ...s, progress: 50, statusMessage: 'Data fetched. Collecting assets...' }));

      // Phase 2: Download assets (50–85%)
      const assets = await collectAssetEntries(entities, (msg, done, total) => {
        const pct = total > 0 ? 50 + Math.round((done / total) * 35) : 85;
        setProgress(s => ({ ...s, progress: pct, statusMessage: msg }));
      });

      setProgress(s => ({ ...s, progress: 87, statusMessage: 'Building ZIP archive...' }));

      // Phase 3: Build ZIP
      const enc = new TextEncoder();
      const zipEntries: { name: string; data: Uint8Array }[] = [];

      const entityCounts: Record<string, number> = {};
      for (const entity of entities) {
        entityCounts[entity.name] = entity.data.length;
        zipEntries.push({
          name: `data/${entity.name}.json`,
          data: enc.encode(JSON.stringify(entity.data, null, 2)),
        });
      }

      for (const asset of assets) {
        zipEntries.push({ name: asset.path, data: asset.data });
      }

      const assetCounts = {
        'badge-icons': assets.filter(a => a.path.startsWith('assets/badge-icons')).length,
        'icon-library': assets.filter(a => a.path.startsWith('assets/icon-library')).length,
        'image-library': assets.filter(a => a.path.startsWith('assets/image-library')).length,
        'icons': assets.filter(a => a.path.startsWith('assets/icons')).length,
      };

      const manifest: ExportManifest = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        source: 'USMBOK Gamification Platform',
        entity_counts: entityCounts,
        asset_counts: assetCounts,
      };
      zipEntries.unshift({
        name: 'manifest.json',
        data: enc.encode(JSON.stringify(manifest, null, 2)),
      });

      setProgress(s => ({ ...s, progress: 92, statusMessage: 'Compressing...' }));
      const zipBytes = buildZip(zipEntries);

      setProgress(s => ({ ...s, progress: 95, statusMessage: 'Uploading to storage...' }));

      const date = new Date().toISOString().slice(0, 10);
      const time = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
      const filename = `usmbok-export-${date}-${time}.zip`;

      const run = await uploadExportAndRecord(zipBytes, filename, manifest);

      setProgress({
        isExporting: false,
        progress: 100,
        statusMessage: 'Export complete.',
        error: null,
        latestRun: run,
      });

      // Refresh history
      setHistory(h => ({ ...h, runs: [run, ...h.runs] }));
    } catch (err) {
      setProgress(s => ({
        ...s,
        isExporting: false,
        progress: 0,
        statusMessage: '',
        error: err instanceof Error ? err.message : 'Export failed.',
      }));
    }
  }, []);

  const saveNotes = useCallback(async (id: string, notes: string) => {
    await updateExportNotes(id, notes);
    setHistory(h => ({
      ...h,
      runs: h.runs.map(r => r.id === id ? { ...r, notes } : r),
    }));
  }, []);

  const deleteRun = useCallback(async (run: ExportRun) => {
    await deleteExportRun(run);
    setHistory(h => ({ ...h, runs: h.runs.filter(r => r.id !== run.id) }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({ isExporting: false, progress: 0, statusMessage: '', error: null, latestRun: null });
  }, []);

  return {
    progress,
    history,
    startExport,
    saveNotes,
    deleteRun,
    resetProgress,
    refreshHistory: loadHistory,
  };
}
