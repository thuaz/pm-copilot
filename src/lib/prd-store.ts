export interface PRDDocument {
  id: string;
  title: string;
  content: string;
  version: number;
  source: "recording" | "chat" | "wizard" | "iteration";
  sourceNote?: string;
  createdAt: string;
  updatedAt: string;
}

export function getAllPRDs(): PRDDocument[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("prd-docs") || "[]");
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
  sourceNote?: string
): PRDDocument {
  const prd: PRDDocument = {
    id: `prd-${Date.now()}`,
    title,
    content,
    version: 1,
    source,
    sourceNote,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  savePRD(prd);
  return prd;
}

export function iteratePRD(
  id: string,
  newContent: string,
  sourceNote?: string
): PRDDocument | null {
  const prd = getPRD(id);
  if (!prd) return null;
  prd.content = newContent;
  prd.version += 1;
  prd.source = "iteration";
  prd.sourceNote = sourceNote;
  prd.updatedAt = new Date().toISOString();
  savePRD(prd);
  return prd;
}
