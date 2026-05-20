"use client";

import { useState } from "react";
import { callAI, callAIStream } from "@/lib/ai";
import { TERMS_SYSTEM_PROMPT, TERMS_BATCH_SYSTEM_PROMPT } from "@/lib/prompts/terms";
import { Search, FileText, Loader2, Copy, Check, Star, Trash2 } from "lucide-react";
import { MD } from "@/components/markdown";

interface SavedTerm {
  term: string;
  explanation: string;
  savedAt: string;
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
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedTerms, setSavedTerms] = useState<SavedTerm[]>(getSavedTerms);
  const [showSaved, setShowSaved] = useState(false);

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
    };
    const updated = [newTerm, ...savedTerms];
    setSavedTerms(updated);
    saveTermList(updated);
  };

  const handleDeleteSaved = (index: number) => {
    const updated = savedTerms.filter((_, i) => i !== index);
    setSavedTerms(updated);
    saveTermList(updated);
  };

  const handleUseSaved = (term: SavedTerm) => {
    setInput(term.term);
    setResult(term.explanation);
    setShowSaved(false);
  };

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
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showSaved
              ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          收藏夹 ({savedTerms.length})
        </button>
      </div>

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
