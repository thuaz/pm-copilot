"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search, FileText, Mic, StickyNote, CheckSquare, BookOpen, ArrowRight,
  X, Clock,
} from "lucide-react";
import { getAllPRDs, type PRDDocument } from "@/lib/prd-store";
import { getAllMeetings, type Meeting } from "@/lib/meeting-store";
import { useProject } from "@/lib/project-context";

interface SearchResult {
  type: "prd" | "meeting" | "todo";
  id: string;
  title: string;
  snippet: string;
  href: string;
  icon: React.ReactNode;
  date: string;
  tags?: string[];
}

export default function SearchPage() {
  const { currentProjectId } = useProject();
  const [query, setQuery] = useState("");
  const [prds, setPrds] = useState<PRDDocument[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [todos, setTodos] = useState<{ id: string; text: string; done: boolean; createdAt: string }[]>([]);

  useEffect(() => {
    setPrds(getAllPRDs(currentProjectId));
    setMeetings(getAllMeetings(currentProjectId));
    try {
      setTodos(JSON.parse(localStorage.getItem("pm-todos") || "[]"));
    } catch { setTodos([]); }
  }, [currentProjectId]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    // PRDs
    for (const p of prds) {
      const titleMatch = p.title.toLowerCase().includes(q);
      const contentMatch = p.content.toLowerCase().includes(q);
      if (titleMatch || contentMatch) {
        out.push({
          type: "prd",
          id: p.id,
          title: p.title,
          snippet: titleMatch
            ? p.title
            : snippetAround(p.content, q),
          href: "/prd",
          icon: <FileText className="w-4 h-4 text-green-500 shrink-0" />,
          date: p.updatedAt,
          tags: (p as any).tags,
        });
      }
    }

    // Meetings
    for (const m of meetings) {
      const titleMatch = m.title.toLowerCase().includes(q);
      const summaryMatch = m.summary.toLowerCase().includes(q);
      const contentMatch = m.content.toLowerCase().includes(q);
      if (titleMatch || summaryMatch || contentMatch) {
        out.push({
          type: "meeting",
          id: m.id,
          title: m.title,
          snippet: titleMatch
            ? m.title
            : summaryMatch
            ? snippetAround(m.summary, q)
            : snippetAround(m.content, q),
          href: "/meetings",
          icon: m.type === "recording"
            ? <Mic className="w-4 h-4 text-blue-500 shrink-0" />
            : <StickyNote className="w-4 h-4 text-orange-500 shrink-0" />,
          date: m.createdAt,
        });
      }
    }

    // Todos
    for (const t of todos) {
      if (t.text.toLowerCase().includes(q)) {
        out.push({
          type: "todo",
          id: t.id,
          title: t.text,
          snippet: t.text,
          href: "/",
          icon: <CheckSquare className={`w-4 h-4 shrink-0 ${t.done ? "text-green-500" : "text-gray-400"}`} />,
          date: t.createdAt,
        });
      }
    }

    // Sort by date desc
    out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return out;
  }, [query, prds, meetings, todos]);

  const counts = useMemo(() => ({
    prd: results.filter((r) => r.type === "prd").length,
    meeting: results.filter((r) => r.type === "meeting").length,
    todo: results.filter((r) => r.type === "todo").length,
  }), [results]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">全局搜索</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          搜索 PRD、会议记录、待办事项中的所有内容
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted-foreground)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入关键词，如「中心医院」「需求确认」「接口设计」..."
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {query.trim() ? (
        <>
          {/* Category counts */}
          <div className="flex gap-4 mb-4 text-xs text-[var(--color-muted-foreground)]">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-green-500" /> {counts.prd} 篇 PRD
            </span>
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3 text-blue-500" /> {counts.meeting} 条会议
            </span>
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-gray-400" /> {counts.todo} 项待办
            </span>
          </div>

          {results.length === 0 ? (
            <div className="py-16 text-center">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                没有找到包含「{query}」的内容
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                试试其他关键词，或切换到其他项目
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
              {results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="mt-0.5">{r.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-[var(--color-primary)] transition-colors">
                      {highlightMatch(r.title, query)}
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-2">
                      {r.snippet}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[var(--color-muted-foreground)]">
                        {r.type === "prd" ? "PRD" : r.type === "meeting" ? "会议" : "待办"}
                      </span>
                      <span className="text-[10px] text-[var(--color-muted-foreground)] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(r.date).toLocaleString("zh-CN")}
                      </span>
                      {r.tags && r.tags.length > 0 && (
                        <span className="flex gap-1">
                          {r.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[var(--color-muted-foreground)]">
            输入关键词开始搜索
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            支持 PRD 文档、会议记录、待办事项的全文搜索
          </p>
        </div>
      )}
    </div>
  );
}

/** Extract a snippet around the first match */
function snippetAround(text: string, query: string, radius = 50): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx < 0) return text.substring(0, 100);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  let s = text.substring(start, end).replace(/[#*_\n]/g, " ").trim();
  if (start > 0) s = "..." + s;
  if (end < text.length) s = s + "...";
  return s;
}

/** Highlight matching text with <mark> */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.substring(0, idx)}
      <mark className="bg-yellow-200 text-[var(--color-foreground)] rounded px-0.5">
        {text.substring(idx, idx + query.length)}
      </mark>
      {text.substring(idx + query.length)}
    </>
  );
}
