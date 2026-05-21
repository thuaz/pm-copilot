"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileText, Mic, StickyNote, CheckSquare, Clock, ArrowRight,
  CalendarDays, Filter,
} from "lucide-react";
import { getAllPRDs, type PRDDocument } from "@/lib/prd-store";
import { getAllMeetings, type Meeting } from "@/lib/meeting-store";
import { useProject } from "@/lib/project-context";

interface TimelineEntry {
  type: "prd" | "meeting" | "todo" | "todo-done";
  id: string;
  title: string;
  date: string;
  href: string;
  icon: React.ReactNode;
  detail: string;
}

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff < 7) return `${diff} 天前`;
  return d.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}

export default function TimelinePage() {
  const { currentProject, currentProjectId } = useProject();
  const [prds, setPrds] = useState<PRDDocument[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [todos, setTodos] = useState<{ id: string; text: string; done: boolean; createdAt: string }[]>([]);
  const [filter, setFilter] = useState<"all" | "prd" | "meeting" | "todo">("all");

  useEffect(() => {
    setPrds(getAllPRDs(currentProjectId));
    setMeetings(getAllMeetings(currentProjectId));
    try {
      setTodos(JSON.parse(localStorage.getItem("pm-todos") || "[]"));
    } catch { setTodos([]); }
  }, [currentProjectId]);

  const entries = useMemo<TimelineEntry[]>(() => {
    const out: TimelineEntry[] = [];

    for (const p of prds) {
      out.push({
        type: "prd",
        id: p.id,
        title: p.title,
        date: p.updatedAt,
        href: "/prd",
        icon: <FileText className="w-4 h-4 text-green-500" />,
        detail: `v${p.version} · ${p.source === "recording" ? "录音生成" : p.source === "iteration" ? "迭代" : p.source === "chat" ? "对话生成" : p.source}${p.tags && p.tags.length > 0 ? " · " + p.tags.join(", ") : ""}`,
      });
    }

    for (const m of meetings) {
      out.push({
        type: "meeting",
        id: m.id,
        title: m.title,
        date: m.createdAt,
        href: "/meetings",
        icon: m.type === "recording"
          ? <Mic className="w-4 h-4 text-blue-500" />
          : <StickyNote className="w-4 h-4 text-orange-500" />,
        detail: m.type === "recording" ? "录音分析" : "会议记录",
      });
    }

    for (const t of todos) {
      out.push({
        type: t.done ? "todo-done" : "todo",
        id: t.id,
        title: t.text,
        date: t.createdAt,
        href: "/",
        icon: <CheckSquare className={`w-4 h-4 ${t.done ? "text-green-500" : "text-gray-400"}`} />,
        detail: t.done ? "已完成" : "待办",
      });
    }

    out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return out;
  }, [prds, meetings, todos]);

  const filtered = filter === "all" ? entries : entries.filter((e) => {
    if (filter === "prd") return e.type === "prd";
    if (filter === "meeting") return e.type === "meeting";
    if (filter === "todo") return e.type === "todo" || e.type === "todo-done";
    return true;
  });

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; date: string; items: TimelineEntry[] }[] = [];
    let currentGroup: typeof groups[0] | null = null;
    for (const entry of filtered) {
      const label = formatDateGroup(entry.date);
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, date: entry.date, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(entry);
    }
    return groups;
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">项目时间线</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            按时间查看所有会议、PRD 和待办的完整记录
            {currentProject && (
              <span className="inline-flex items-center gap-1 ml-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: currentProject.color }} />
                {currentProject.name}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--color-muted-foreground)]" />
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            {([
              { key: "all" as const, label: "全部" },
              { key: "meeting" as const, label: "会议" },
              { key: "prd" as const, label: "PRD" },
              { key: "todo" as const, label: "待办" },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
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
      </div>

      {grouped.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[var(--color-muted-foreground)]">暂无记录</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            录音、写 PRD、创建待办后，时间线会自动生成
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[var(--color-muted-foreground)]" />
                <h2 className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  {group.label}
                </h2>
                <span className="text-[10px] text-[var(--color-muted-foreground)] bg-gray-100 px-1.5 py-0.5 rounded">
                  {group.items.length}
                </span>
              </div>
              <div className="relative pl-6 border-l-2 border-gray-200 ml-1.5 space-y-3">
                {group.items.map((entry) => (
                  <Link
                    key={`${entry.type}-${entry.id}`}
                    href={entry.href}
                    className="group flex items-start gap-3 -ml-[25px] relative"
                  >
                    {/* Dot on timeline */}
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-300 group-hover:border-[var(--color-primary)] shrink-0 mt-1.5 z-[1]" />
                    <div className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] p-3 hover:border-[var(--color-primary)] transition-colors group-hover:shadow-sm">
                      <div className="flex items-center gap-2">
                        {entry.icon}
                        <span className="text-sm font-medium truncate group-hover:text-[var(--color-primary)] transition-colors flex-1">
                          {entry.title}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[var(--color-primary)] shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[var(--color-muted-foreground)]">
                          {entry.type === "prd" ? "PRD" : entry.type === "meeting" ? "会议" : entry.type === "todo-done" ? "已完成" : "待办"}
                        </span>
                        <span className="text-[10px] text-[var(--color-muted-foreground)]">
                          {entry.detail}
                        </span>
                        <span className="text-[10px] text-[var(--color-muted-foreground)] ml-auto">
                          {new Date(entry.date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
