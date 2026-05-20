"use client";

import { useState, useEffect } from "react";
import { callAIStream } from "@/lib/ai";
import {
  Loader2, Sparkles, FileText, Copy, Check, Clock, Trash2,
  ChevronDown, Save, Search,
} from "lucide-react";
import { MD } from "@/components/markdown";

interface SavedNote {
  id: string;
  input: string;
  result: string;
  savedAt: string;
}

function getSavedNotes(): SavedNote[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("saved-notes") || "[]");
  } catch { return []; }
}

function saveNotesList(notes: SavedNote[]) {
  localStorage.setItem("saved-notes", JSON.stringify(notes));
}

export default function NotesPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSavedNotes(getSavedNotes());
  }, []);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      const stream = callAIStream(
        `请分析以下会议记录/沟通内容，提取关键信息：\n\n${input}`,
        `你是一位资深的 ToB 医疗行业产品经理助手。分析用户与医疗客户的沟通记录，提取以下内容：

1. **关键需求**：客户明确提出或暗示的需求
2. **医疗术语**：出现的专业术语及解释
3. **待确认事项**：需要进一步和客户确认的问题
4. **Action Items**：后续需要做的事情
5. **需求摘要**：一段话总结核心需求

请用结构化格式输出。`
      );
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        setResult(acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失败");
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
    const note: SavedNote = {
      id: `note-${Date.now()}`,
      input: input.substring(0, 500),
      result,
      savedAt: new Date().toISOString(),
    };
    const updated = [note, ...savedNotes];
    setSavedNotes(updated);
    saveNotesList(updated);
  };

  const handleDeleteNote = (id: string) => {
    const updated = savedNotes.filter((n) => n.id !== id);
    setSavedNotes(updated);
    saveNotesList(updated);
  };

  const handleOpenNote = (note: SavedNote) => {
    setInput(note.input);
    setResult(note.result);
    setShowHistory(false);
  };

  const handleToPRD = () => {
    if (!result) return;
    localStorage.setItem("prd-draft", result);
    window.location.href = "/prd";
  };

  const filteredNotes = savedNotes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return n.input.toLowerCase().includes(q) || n.result.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">会议记录助手</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            记录与客户的沟通内容，AI 自动提取需求和待办
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showHistory
              ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          历史记录 ({savedNotes.length})
        </button>
      </div>

      {showHistory ? (
        <div className="rounded-xl border border-[var(--color-border)]">
          <div className="p-3 border-b border-[var(--color-border)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索历史记录..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
          {savedNotes.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-[var(--color-muted-foreground)]">还没有保存的记录</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">分析完成后点击「保存」即可存档</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[var(--color-muted-foreground)]">没有匹配「{searchQuery}」的记录</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleOpenNote(note)}
                >
                  <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm line-clamp-2">{note.input.substring(0, 100)}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)] mt-1">
                      {new Date(note.savedAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="粘贴或输入与医疗客户的沟通内容、会议记录..."
                rows={16}
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !input.trim()}
                  className="px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  分析内容
                </button>
                {result && input.trim() && (
                  <button
                    onClick={handleSave}
                    className="px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                )}
              </div>
            </div>

            <div>
              {result ? (
                <div className="rounded-xl border border-[var(--color-border)] h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                    <span className="text-sm font-medium">分析结果</span>
                    <div className="flex gap-1">
                      <button
                        onClick={handleCopy}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none">
                    <MD>{result}</MD>
                    {loading && <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-0.5 align-text-bottom" />}
                  </div>
                  <div className="px-4 py-2.5 border-t border-[var(--color-border)]">
                    <button
                      onClick={handleToPRD}
                      className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      用此结果生成 PRD
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] h-64 flex flex-col items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-[var(--color-muted-foreground)]">分析结果将在这里显示</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">粘贴会议记录后点击「分析内容」</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
