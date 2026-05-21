"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllMeetings, deleteMeeting, type Meeting } from "@/lib/meeting-store";
import { useProject } from "@/lib/project-context";
import {
  Mic, StickyNote, Trash2, Search, Filter, CalendarDays,
  FileText, ArrowRight, Clock,
} from "lucide-react";
import { MD } from "@/components/markdown";

type FilterType = "all" | "recording" | "notes";

export default function MeetingsPage() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setMeetings(getAllMeetings(currentProjectId));
  }, [currentProjectId]);

  const filtered = meetings.filter((m) => {
    if (filter !== "all" && m.type !== filter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q)
    );
  });

  const selected = selectedId ? meetings.find((m) => m.id === selectedId) || null : null;

  const handleDelete = (id: string) => {
    deleteMeeting(id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleToPRD = (meeting: Meeting) => {
    localStorage.setItem("prd-draft", meeting.summary);
    router.push("/prd");
  };

  const typeLabel = (type: Meeting["type"]) =>
    type === "recording" ? "录音分析" : "会议记录";

  const TypeIcon = ({ type }: { type: Meeting["type"] }) =>
    type === "recording" ? (
      <Mic className="w-3.5 h-3.5 text-blue-500" />
    ) : (
      <StickyNote className="w-3.5 h-3.5 text-green-500" />
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">会议历史</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            所有录音分析和会议记录的统一历史
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {filtered.length} 条记录
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索会议..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          {([
            { key: "all", label: "全部" },
            { key: "recording", label: "录音" },
            { key: "notes", label: "笔记" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] py-16 flex flex-col items-center justify-center">
          <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {meetings.length === 0
              ? "还没有会议记录"
              : "没有匹配的记录"}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            录音分析或会议记录保存后会自动出现在这里
          </p>
        </div>
      ) : selected ? (
        /* Detail view */
        <div>
          <button
            onClick={() => setSelectedId(null)}
            className="text-sm text-[var(--color-primary)] hover:underline mb-4 flex items-center gap-1"
          >
            &larr; 返回列表
          </button>

          <div className="rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <TypeIcon type={selected.type} />
                <span className="text-sm font-medium">{selected.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-[var(--color-muted-foreground)]">
                  {typeLabel(selected.type)}
                </span>
              </div>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {new Date(selected.createdAt).toLocaleString("zh-CN")}
              </span>
            </div>

            {/* Summary */}
            <div className="p-4 border-b border-[var(--color-border)]">
              <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-2">AI 分析</p>
              <div className="prose prose-sm max-w-none">
                <MD>{selected.summary}</MD>
              </div>
            </div>

            {/* Raw content */}
            <details>
              <summary className="px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                原始内容（{selected.type === "recording" ? "转写文字" : "输入文本"}）
              </summary>
              <div className="px-4 pb-4 text-sm text-[var(--color-muted-foreground)] whitespace-pre-wrap border-t border-[var(--color-border)] pt-3 max-h-[300px] overflow-y-auto">
                {selected.content}
              </div>
            </details>

            <div className="px-4 py-3 flex items-center gap-3 border-t border-[var(--color-border)]">
              <button
                onClick={() => handleToPRD(selected)}
                className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                用此结果生成 PRD
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="text-xs text-red-500 hover:underline flex items-center gap-1 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="group flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedId(m.id)}
            >
              <div className="mt-0.5">
                <TypeIcon type={m.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.title}</div>
                <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-2">
                  {m.summary.substring(0, 150).replace(/[#*_]/g, "")}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[var(--color-muted-foreground)]">
                    {typeLabel(m.type)}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted-foreground)] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(m.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(m.id);
                }}
                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
