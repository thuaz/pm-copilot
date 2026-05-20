export interface PRDHistoryEntry {
  version: number;
  content: string;
  updatedAt: string;
  summary?: string;
}

export interface PRDDocument {
  id: string;
  title: string;
  content: string;
  version: number;
  source: "recording" | "chat" | "wizard" | "iteration";
  sourceNote?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  history?: PRDHistoryEntry[];
}

export function getAllPRDs(projectId?: string | null): PRDDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem("prd-docs") || "[]") as PRDDocument[];
    if (projectId === null || projectId === undefined) return all;
    return all.filter((p) => p.projectId === projectId);
  } catch {
    return [];
  }
}

export function getPRD(id: string): PRDDocument | null {
  return getAllPRDs().find((p) => p.id === id) || null;
}

export function savePRD(prd: PRDDocument): void {
  const docs = getAllPRDs();
  const idx = docs.findIndex((p) => p.id === prd.id);
  if (idx >= 0) {
    docs[idx] = prd;
  } else {
    docs.unshift(prd);
  }
  localStorage.setItem("prd-docs", JSON.stringify(docs));
}

export function createPRD(
  title: string,
  content: string,
  source: PRDDocument["source"],
  sourceNote?: string,
  projectId?: string
): PRDDocument {
  const prd: PRDDocument = {
    id: `prd-${Date.now()}`,
    title,
    content,
    version: 1,
    source,
    sourceNote,
    projectId: projectId || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  savePRD(prd);
  return prd;
}

const MAX_HISTORY_ENTRIES = 10;

export function iteratePRD(
  id: string,
  newContent: string,
  sourceNote?: string
): PRDDocument | null {
  const prd = getPRD(id);
  if (!prd) return null;

  // Push the current content into history before overwriting
  const history: PRDHistoryEntry[] = prd.history ? [...prd.history] : [];
  history.push({
    version: prd.version,
    content: prd.content,
    updatedAt: prd.updatedAt,
    summary: prd.sourceNote,
  });
  // Keep only the most recent entries
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.splice(0, history.length - MAX_HISTORY_ENTRIES);
  }

  prd.history = history;
  prd.content = newContent;
  prd.version += 1;
  prd.source = "iteration";
  prd.sourceNote = sourceNote;
  prd.updatedAt = new Date().toISOString();
  savePRD(prd);
  return prd;
}

export function getPRDHistory(id: string): PRDHistoryEntry[] {
  const prd = getPRD(id);
  if (!prd || !prd.history) return [];
  return [...prd.history].reverse(); // newest first
}

export function restorePRDVersion(
  id: string,
  version: number
): PRDDocument | null {
  const prd = getPRD(id);
  if (!prd || !prd.history) return null;

  const entry = prd.history.find((h) => h.version === version);
  if (!entry) return null;

  // Push the current content into history before restoring
  const history: PRDHistoryEntry[] = [...prd.history];
  history.push({
    version: prd.version,
    content: prd.content,
    updatedAt: prd.updatedAt,
    summary: prd.sourceNote,
  });
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.splice(0, history.length - MAX_HISTORY_ENTRIES);
  }

  prd.history = history;
  prd.content = entry.content;
  prd.version += 1;
  prd.source = "iteration";
  prd.sourceNote = `恢复到 v${version}`;
  prd.updatedAt = new Date().toISOString();
  savePRD(prd);
  return prd;
}
