import React, { useState } from 'react';
import {
  Download,
  Package,
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileArchive,
  Trash2,
  Pencil,
  X,
  Check,
  Clock,
  HardDrive,
  RotateCcw,
  BarChart2,
  Image,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { useExport } from '../../hooks/useExport';
import { triggerDownload, type ExportRun } from '../../lib/exportUtils';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Inline notes editor ─────────────────────────────────────────────────────

function NotesCell({ run, onSave }: { run: ExportRun; onSave: (id: string, notes: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(run.notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(run.id, value);
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setValue(run.notes ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          className="flex-1 min-w-0 text-sm px-2 py-1 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Add a note..."
        />
        <button onClick={save} disabled={saving} className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="group flex items-center gap-1.5 text-sm text-left w-full min-w-0">
      <span className={`truncate ${run.notes ? 'text-foreground' : 'text-muted-foreground italic'}`}>
        {run.notes || 'Add note...'}
      </span>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
    </button>
  );
}

// ─── Full-page stats view ─────────────────────────────────────────────────────

function StatsView({ run, onBack }: { run: ExportRun; onBack: () => void }) {
  const entityRows = Object.entries(run.entity_counts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const assetRows = Object.entries(run.asset_counts).filter(([, v]) => v > 0);
  const totalRecords = Object.values(run.entity_counts).reduce((s, v) => s + v, 0);
  const totalAssets = Object.values(run.asset_counts).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-8">
      {/* Back nav */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Export History
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <BarChart2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Export Contents</h3>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{run.filename}</p>
          </div>
        </div>
        <button
          onClick={() => triggerDownload(run.public_url, run.filename)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          <Download className="w-4 h-4" />
          Download ZIP
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-secondary gap-1.5">
          <span className="text-3xl font-bold tabular-nums">{totalRecords.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">Total Records</span>
        </div>
        <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-secondary gap-1.5">
          <span className="text-3xl font-bold tabular-nums">{totalAssets}</span>
          <span className="text-sm text-muted-foreground">Asset Files</span>
        </div>
        <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-secondary gap-1.5">
          <span className="text-3xl font-bold">{formatBytes(run.file_size_bytes)}</span>
          <span className="text-sm text-muted-foreground">Archive Size</span>
        </div>
      </div>

      {/* Entity counts bar chart */}
      {entityRows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Database className="w-3.5 h-3.5" />
            Data Tables — {entityRows.length} non-empty
          </div>
          <div className="space-y-2">
            {entityRows.map(([name, count]) => {
              const maxCount = entityRows[0][1];
              const pct = maxCount > 0 ? Math.max(2, Math.round((count / maxCount) * 100)) : 2;
              return (
                <div key={name} className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-48 shrink-0 truncate font-mono">
                    {name.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 h-6 rounded-lg bg-secondary overflow-hidden relative">
                    <div
                      className="h-full rounded-lg bg-primary/25 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold tabular-nums">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset folders */}
      {assetRows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Image className="w-3.5 h-3.5" />
            Asset Folders
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {assetRows.map(([folder, count]) => (
              <div key={folder} className="flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-secondary">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{folder}</span>
                </div>
                <span className="text-2xl font-bold tabular-nums">{count}</span>
                <span className="text-xs text-muted-foreground">files</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 bg-secondary text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-muted-foreground">Exported at</span>
            <span className="font-medium">{formatDate(run.exported_at)}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-muted-foreground">Storage path</span>
            <span className="font-mono text-xs text-muted-foreground">{run.storage_path}</span>
          </div>
          {run.notes && (
            <div className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-muted-foreground">Notes</span>
              <span className="font-medium">{run.notes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteDialog({ run, onConfirm, onCancel }: {
  run: ExportRun;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-full bg-destructive/10 text-destructive shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Delete Export?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This will permanently remove the ZIP from storage and delete the history record. You cannot undo this.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-mono text-muted-foreground truncate">
          {run.filename}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExportManager() {
  const { progress, history, startExport, saveNotes, deleteRun, resetProgress, refreshHistory } = useExport();
  const { isExporting, progress: pct, statusMessage, error, latestRun } = progress;

  const [statsRun, setStatsRun] = useState<ExportRun | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExportRun | null>(null);

  const topEntities = Object.entries(latestRun?.entity_counts ?? {})
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12);

  const includedItems = [
    'Profiles & Users', 'Activity Types', 'Levels & XP', 'Badges & Constellations',
    'Quests & Steps', 'Challenges', 'Campaigns', 'Rewards & Rules',
    'Journeys', 'Communities', 'Pulses & Ideas', 'Projects',
    'Email Templates', 'Announcements', 'Icon & Image Library',
    'Points Ledger', 'Leaderboard Records', 'User Progress',
    'Industry Sectors', 'Messaging',
  ];

  if (statsRun) {
    return <StatsView run={statsRun} onBack={() => setStatsRun(null)} />;
  }

  return (
    <>
      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteDialog
          run={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteRun(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}

      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <FileArchive className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold">Export Full Backup</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Download a complete ZIP of all app data and icon assets. Exports are stored in Supabase and available for re-download at any time.
            </p>
          </div>
        </div>

        {/* What's included */}
        {!latestRun && !isExporting && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Database className="w-3.5 h-3.5" />
                Data &amp; Assets Included
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {includedItems.map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="w-3.5 h-3.5" />
                ZIP Structure
              </div>
              <pre className="text-xs text-muted-foreground leading-relaxed font-mono">{`export.zip
├── manifest.json
├── data/
│   ├── badges.json
│   ├── quests.json
│   └── ... (one per table)
└── assets/
    ├── badge-icons/
    ├── icon-library/
    ├── image-library/
    └── icons/`}</pre>
            </div>
          </div>
        )}

        {/* Progress */}
        {isExporting && (
          <div className="border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              <span className="font-medium">Exporting — please keep this tab open...</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="truncate max-w-xs">{statusMessage}</span>
                <span className="shrink-0 ml-4 font-mono tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isExporting && (
          <div className="border border-destructive/40 bg-destructive/5 rounded-xl p-5 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <div>
                <p className="font-semibold text-destructive">Export failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <button onClick={resetProgress} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors">
                <RotateCcw className="w-4 h-4" />
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Success card */}
        {latestRun && !isExporting && (
          <div className="border border-green-500/30 bg-green-500/5 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Export complete</p>
                  <p className="text-sm text-muted-foreground font-mono">{latestRun.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <HardDrive className="w-4 h-4" />
                {formatBytes(latestRun.file_size_bytes)}
              </div>
            </div>

            <a
              href={latestRun.public_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => { e.preventDefault(); triggerDownload(latestRun.public_url, latestRun.filename); }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-green-500/40 bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 font-medium transition-colors"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="truncate">{latestRun.filename}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-auto" />
            </a>

            {topEntities.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Records exported</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {topEntities.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-lg text-sm">
                      <span className="text-muted-foreground truncate">{name.replace(/_/g, ' ')}</span>
                      <span className="font-mono font-semibold ml-2 shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={resetProgress} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors">
              <RotateCcw className="w-4 h-4" />
              New export
            </button>
          </div>
        )}

        {/* CTA */}
        {!isExporting && !latestRun && (
          <div className="flex items-center justify-between p-5 bg-secondary rounded-xl">
            <div>
              <p className="font-semibold">Ready to export</p>
              <p className="text-sm text-muted-foreground">All tables and public assets will be bundled and stored.</p>
            </div>
            <button
              onClick={startExport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              Export Full Backup
            </button>
          </div>
        )}

        {/* Export History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg">Export History</h4>
            <button
              onClick={refreshHistory}
              disabled={history.loading}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${history.loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {history.error && (
            <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {history.error}
            </div>
          )}

          {history.loading && !history.runs.length && (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-14 rounded-lg bg-secondary animate-pulse" />
              ))}
            </div>
          )}

          {!history.loading && history.runs.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No exports yet. Run your first export above.
            </div>
          )}

          {history.runs.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary text-left">
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">File</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Size</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Notes</th>
                    <th className="px-4 py-3 w-28 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.runs.map(run => (
                    <tr key={run.id} className="hover:bg-accent/30 transition-colors group">
                      {/* File */}
                      <td className="px-4 py-3 min-w-0">
                        <button
                          onClick={() => triggerDownload(run.public_url, run.filename)}
                          className="flex items-center gap-2 group/dl min-w-0 text-left"
                          title="Download"
                        >
                          <FileArchive className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate font-mono text-xs text-foreground group-hover/dl:text-primary transition-colors">
                            {run.filename}
                          </span>
                          <Download className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/dl:opacity-100 transition-opacity shrink-0" />
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatDate(run.exported_at)}
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <HardDrive className="w-3.5 h-3.5 shrink-0" />
                          {formatBytes(run.file_size_bytes)}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 max-w-xs">
                        <NotesCell run={run} onSave={saveNotes} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Stats / contents */}
                          <button
                            onClick={() => setStatsRun(run)}
                            className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="View contents & statistics"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(run)}
                            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete export"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
