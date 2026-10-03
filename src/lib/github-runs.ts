const REPO = 'QuickLastMile/monitoreo-quick-automation';

export type RunStatus = 'success' | 'failure' | 'cancelled' | 'in_progress' | 'other';

export type WorkflowRun = {
  id: number;
  event: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
};

export type RunsSnapshot = {
  runs: WorkflowRun[];
  // Si la corrida más reciente no fue exitosa, desde cuándo viene fallando
  // seguido (primera corrida de la racha de fallos actual) — para responder
  // directamente "¿desde cuándo no está corriendo bien?".
  failingSince: string | null;
  consecutiveFailures: number;
};

function normalizeStatus(r: { status: string; conclusion: string | null }): RunStatus {
  if (r.status !== 'completed') return 'in_progress';
  if (r.conclusion === 'success') return 'success';
  if (r.conclusion === 'cancelled') return 'cancelled';
  if (r.conclusion === 'failure') return 'failure';
  return 'other';
}

async function fetchRunsUncached(): Promise<RunsSnapshot> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Falta la variable de entorno GITHUB_TOKEN.');

  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=60`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GitHub API respondió ${res.status} al listar corridas.`);
  const data = await res.json();

  const runs: WorkflowRun[] = (data.workflow_runs || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    event: r.event,
    status: r.status,
    conclusion: r.conclusion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
  }));

  let failingSince: string | null = null;
  let consecutiveFailures = 0;
  for (const run of runs) {
    const st = normalizeStatus(run);
    if (st === 'in_progress') continue; // no cuenta ni rompe la racha
    if (st === 'success') break;
    consecutiveFailures += 1;
    failingSince = run.createdAt;
  }

  return { runs, failingSince, consecutiveFailures };
}

let cached: { data: RunsSnapshot; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getRunsSnapshot(): Promise<RunsSnapshot> {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await fetchRunsUncached();
  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export { normalizeStatus };
