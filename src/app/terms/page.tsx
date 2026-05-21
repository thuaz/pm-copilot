"use client";

import { useState, useEffect } from "react";
import { callAI, callAIStream } from "@/lib/ai";
import { TERMS_SYSTEM_PROMPT, TERMS_BATCH_SYSTEM_PROMPT } from "@/lib/prompts/terms";
import { useProject } from "@/lib/project-context";
import { Search, FileText, Loader2, Copy, Check, Star, Trash2, Upload, Lightbulb } from "lucide-react";
import { MD } from "@/components/markdown";

interface SavedTerm {
  term: string;
  explanation: string;
  savedAt: string;
  projectId?: string;
}

function getSavedTerms(): SavedTerm[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("saved-terms") || "[]");
  } catch {
    return [];
  }
}

function saveTermList(terms: SavedTerm[]) {
  localStorage.setItem("saved-terms", JSON.stringify(terms));
}

export default function TermsPage() {
  const { currentProjectId } = useProject();
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedTerms, setSavedTerms] = useState<SavedTerm[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const all = getSavedTerms();
    const filtered = currentProjectId
      ? all.filter((t) => t.projectId === currentProjectId)
      : all;
    setSavedTerms(filtered);
  }, [currentProjectId]);

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      const systemPrompt =
        mode === "single" ? TERMS_SYSTEM_PROMPT : TERMS_BATCH_SYSTEM_PROMPT;
      const stream = callAIStream(input, systemPrompt);
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        setResult(acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!input.trim() || !result) return;
    const newTerm: SavedTerm = {
      term: input.trim().substring(0, 50),
      explanation: result.substring(0, 200),
      savedAt: new Date().toISOString(),
      projectId: currentProjectId ?? undefined,
    };
    // Persist to full list (all projects)
    const allTerms = getSavedTerms();
    allTerms.unshift(newTerm);
    saveTermList(allTerms);
    // Refresh filtered display
    setSavedTerms(currentProjectId
      ? allTerms.filter((t) => t.projectId === currentProjectId)
      : allTerms);
  };

  const handleDeleteSaved = (index: number) => {
    // Find the term to delete from the filtered list
    const termToDelete = savedTerms[index];
    if (!termToDelete) return;
    // Remove from full list by matching term + savedAt
    const allTerms = getSavedTerms().filter(
      (t) => !(t.term === termToDelete.term && t.savedAt === termToDelete.savedAt)
    );
    saveTermList(allTerms);
    // Refresh filtered display
    setSavedTerms(currentProjectId
      ? allTerms.filter((t) => t.projectId === currentProjectId)
      : allTerms);
  };

  const handleUseSaved = (term: SavedTerm) => {
    setInput(term.term);
    setResult(term.explanation);
    setShowSaved(false);
  };

  const handleImportTerms = () => {
    if (!importText.trim()) return;
    const lines = importText.trim().split("\n");
    let count = 0;
    const allTerms = getSavedTerms();
    for (const line of lines) {
      const parts = line.split(/[,\t，]/);
      if (parts.length >= 2) {
        const term = parts[0].trim();
        const explanation = parts.slice(1).join(",").trim();
        if (term && explanation) {
          // Don't duplicate
          if (!allTerms.some((t) => t.term === term)) {
            allTerms.unshift({
              term,
              explanation: explanation.substring(0, 200),
              savedAt: new Date().toISOString(),
              projectId: currentProjectId ?? undefined,
            });
            count++;
          }
        }
      } else if (parts[0].trim()) {
        // Just a term name, save with placeholder
        const term = parts[0].trim();
        if (!allTerms.some((t) => t.term === term)) {
          allTerms.unshift({
            term,
            explanation: "(待查询)",
            savedAt: new Date().toISOString(),
            projectId: currentProjectId ?? undefined,
          });
          count++;
        }
      }
    }
    saveTermList(allTerms);
    setSavedTerms(currentProjectId
      ? allTerms.filter((t) => t.projectId === currentProjectId)
      : allTerms);
    setImportText("");
    setShowImport(false);
    setShowSaved(true);
    alert(`成功导入 ${count} 个术语`);
  };

  // Auto-highlight known terms in input
  const getKnownTermHints = (text: string): string[] => {
    if (!text.trim()) return [];
    const allTerms = getSavedTerms();
    return allTerms
      .filter((t) => text.toLowerCase().includes(t.term.toLowerCase()))
      .map((t) => t.term);
  };

  const knownHints = mode === "batch" ? getKnownTermHints(input) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">医学术语助手</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          输入术语或粘贴会议记录，AI 帮你翻译成通俗语言
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("single")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            mode === "single"
              ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          查单个术语
        </button>
        <button
          onClick={() => setMode("batch")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            mode === "batch"
              ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          分析整段内容
        </button>
        <button
          onClick={() => setShowSaved(!showSaved)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showSaved
              ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          收藏夹 ({savedTerms.length})
        </button>
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-muted-foreground)] hover:bg-gray-50"
        >
          <Upload className="w-3.5 h-3.5" />
          导入
        </button>
      </div>

      {showImport && (
        <div className="rounded-xl border border-[var(--color-border)] p-4 mb-4">
          <h3 className="text-sm font-medium mb-2">批量导入术语</h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mb-2">
            每行一个术语，格式：术语名,解释（或仅术语名）。也支持从 Excel 复制粘贴。
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"HIS,Hospital Information System 医院信息系统\nEMR,Electronic Medical Record 电子病历\nPACS\nLIS"}
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleImportTerms}
              disabled={!importText.trim()}
              className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40"
            >
              导入
            </button>
            <button
              onClick={() => { setShowImport(false); setImportText(""); }}
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Known term hints in batch mode */}
      {mode === "batch" && knownHints.length > 0 && !showSaved && (
        <div className="mb-3 p-2 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            发现已收藏的术语：
            <span className="flex flex-wrap gap-1 mt-1">
              {knownHints.slice(0, 10).map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">{t}</span>
              ))}
              {knownHints.length > 10 && <span className="text-blue-500">+{knownHints.length - 10} 个</span>}
            </span>
          </div>
        </div>
      )}

      {showSaved ? (
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          {savedTerms.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">
              还没有收藏的术语
            </p>
          ) : (
            <div className="space-y-2">
              {savedTerms.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.term}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-2">
                      {item.explanation}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleUseSaved(item)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400"
                      title="使用"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(i)}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Input */}
          <div className="mb-4">
            {mode === "single" ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="输入医学术语，如：HIS、EMR、PACS..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !input.trim()}
                  className="px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  查询
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="粘贴与医疗客户的对话、会议记录或需求描述..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !input.trim()}
                  className="mt-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  分析术语
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                <span className="text-sm font-medium">
                  {mode === "single" ? "术语解释" : "术语分析结果"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                    title="复制"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleSave}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                    title="收藏"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 prose prose-sm max-w-none">
                <MD>{result}</MD>
                {loading && <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-0.5 align-text-bottom" />}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
