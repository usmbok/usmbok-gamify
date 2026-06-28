import { supabase } from './supabase';

export interface ExportManifest {
  version: string;
  exported_at: string;
  source: string;
  entity_counts: Record<string, number>;
  asset_counts: Record<string, number>;
}

export interface ExportRun {
  id: string;
  filename: string;
  storage_path: string;
  public_url: string;
  file_size_bytes: number;
  entity_counts: Record<string, number>;
  asset_counts: Record<string, number>;
  exported_by: string | null;
  exported_at: string;
  notes: string | null;
}

// ─── ZIP builder (no external deps) ────────────────────────────────────────

function encodeStr(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function u16le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}
function u32le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}

function crc32(data: Uint8Array): number {
  const table = makeCrc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crc32Table: Uint32Array | null = null;
function makeCrc32Table(): Uint32Array {
  if (_crc32Table) return _crc32Table;
  _crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    _crc32Table[i] = c;
  }
  return _crc32Table;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encodeStr(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04,
      ...u16le(20),
      ...u16le(0),
      ...u16le(0),
      ...u16le(0),
      ...u16le(0),
      ...u32le(crc),
      ...u32le(size),
      ...u32le(size),
      ...u16le(nameBytes.length),
      ...u16le(0),
      ...nameBytes,
      ...entry.data,
    ]);
    localHeaders.push(local);

    const central = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02,
      ...u16le(20),
      ...u16le(20),
      ...u16le(0),
      ...u16le(0),
      ...u16le(0),
      ...u16le(0),
      ...u32le(crc),
      ...u32le(size),
      ...u32le(size),
      ...u16le(nameBytes.length),
      ...u16le(0),
      ...u16le(0),
      ...u16le(0),
      ...u16le(0),
      ...u32le(0),
      ...u32le(offset),
      ...nameBytes,
    ]);
    centralHeaders.push(central);
    offset += local.length;
  }

  const centralStart = offset;
  const centralSize = centralHeaders.reduce((s, h) => s + h.length, 0);

  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06,
    ...u16le(0),
    ...u16le(0),
    ...u16le(entries.length),
    ...u16le(entries.length),
    ...u32le(centralSize),
    ...u32le(centralStart),
    ...u16le(0),
  ]);

  const totalSize = offset + centralSize + eocd.length;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const b of localHeaders) { result.set(b, pos); pos += b.length; }
  for (const b of centralHeaders) { result.set(b, pos); pos += b.length; }
  result.set(eocd, pos);
  return result;
}

// ─── Data fetchers ───────────────────────────────────────────────────────────

type FetchResult = { name: string; data: unknown[] };

async function fetchAll(table: string): Promise<unknown[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
  return data ?? [];
}

export async function fetchAllEntities(
  onProgress: (msg: string) => void
): Promise<FetchResult[]> {
  const tables = [
    'profiles',
    'activity_types',
    'engagement_events',
    'points_ledger',
    'levels',
    'user_levels',
    'badge_constellations',
    'badges',
    'user_badges',
    'quests',
    'quest_steps',
    'user_quest_progress',
    'challenges',
    'user_challenge_progress',
    'leaderboard_records',
    'campaigns',
    'scheduled_events',
    'rewards_catalog',
    'reward_rules',
    'journeys',
    'journey_quests',
    'user_journey_progress',
    'projects',
    'project_levels',
    'project_quests',
    'project_challenges',
    'project_reward_rules',
    'communities',
    'community_members',
    'pulses',
    'ideas',
    'idea_votes',
    'gift_packs',
    'announcements',
    'email_templates',
    'email_footer_templates',
    'email_schedules',
    'icon_library_items',
    'icon_categories',
    'image_library',
    'admin_messages',
    'notifications',
    'industry_sectors',
    'sector_roles',
    'user_roles',
  ];

  const results: FetchResult[] = [];
  for (const table of tables) {
    onProgress(`Fetching ${table}...`);
    try {
      const data = await fetchAll(table);
      results.push({ name: table, data });
    } catch {
      results.push({ name: table, data: [] });
    }
  }
  return results;
}

// ─── Asset fetchers ──────────────────────────────────────────────────────────

export async function collectAssetEntries(
  entities: FetchResult[],
  onProgress: (msg: string, done: number, total: number) => void
): Promise<{ path: string; data: Uint8Array }[]> {
  const urlMap = new Map<string, string>();

  const addUrl = (url: string | null | undefined, folder: string) => {
    if (!url || urlMap.has(url)) return;
    try {
      const u = new URL(url);
      const filename = u.pathname.split('/').pop() || 'file';
      urlMap.set(url, `assets/${folder}/${filename}`);
    } catch {
      // skip invalid URLs
    }
  };

  for (const entity of entities) {
    for (const row of entity.data as Record<string, unknown>[]) {
      if (entity.name === 'badges' || entity.name === 'badge_constellations') {
        addUrl(row.icon_url as string, 'badge-icons');
        addUrl(row.cover_image_url as string, 'badge-icons');
      } else if (entity.name === 'icon_library_items') {
        addUrl(row.url as string, 'icon-library');
      } else if (entity.name === 'image_library') {
        addUrl(row.public_url as string, 'image-library');
      } else {
        addUrl(row.icon_url as string, 'icons');
      }
    }
  }

  const urls = Array.from(urlMap.entries());
  const assets: { path: string; data: Uint8Array }[] = [];

  for (let i = 0; i < urls.length; i++) {
    const [url, path] = urls[i];
    onProgress(`Downloading ${path.split('/').pop()}`, i + 1, urls.length);
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const buf = await resp.arrayBuffer();
      assets.push({ path, data: new Uint8Array(buf) });
    } catch {
      // skip unreachable assets
    }
  }

  return assets;
}

// ─── Upload to Supabase Storage and record the run ──────────────────────────

export async function uploadExportAndRecord(
  zipBytes: Uint8Array,
  filename: string,
  manifest: ExportManifest
): Promise<ExportRun> {
  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const storagePath = `runs/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('exports')
    .upload(storagePath, blob, { contentType: 'application/zip', upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from('exports')
    .getPublicUrl(storagePath);

  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id ?? null;

  const { data: run, error: insertError } = await supabase
    .from('export_runs')
    .insert({
      filename,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      file_size_bytes: zipBytes.byteLength,
      entity_counts: manifest.entity_counts,
      asset_counts: manifest.asset_counts,
      exported_by: userId,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed to record export: ${insertError.message}`);
  return run as ExportRun;
}

// ─── History CRUD ────────────────────────────────────────────────────────────

export async function fetchExportHistory(): Promise<ExportRun[]> {
  const { data, error } = await supabase
    .from('export_runs')
    .select('*')
    .order('exported_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExportRun[];
}

export async function updateExportNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('export_runs')
    .update({ notes })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteExportRun(run: ExportRun): Promise<void> {
  // Delete storage object first
  await supabase.storage.from('exports').remove([run.storage_path]);
  // Then delete the record
  const { error } = await supabase.from('export_runs').delete().eq('id', run.id);
  if (error) throw new Error(error.message);
}

// ─── Download trigger ────────────────────────────────────────────────────────

export function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
