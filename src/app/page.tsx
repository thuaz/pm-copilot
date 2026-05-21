"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, FileText, Monitor, Mic, StickyNote, ArrowRightLeft, ArrowRight,
  Lightbulb, Clock, CheckSquare, Plus, Trash2, ChevronRight, ListTodo,
  FilePlus, Mic as MicIcon, Sparkles, FolderOpen, Download, AlertTriangle, X,
  AlertCircle, Calendar, Flag,
} from "lucide-react";
import { getAIConfig, hasDefaultAI } from "@/lib/ai";
import { getAllPRDs, type PRDDocument } from "@/lib/prd-store";
import { getAllMeetings, type Meeting } from "@/lib/meeting-store";
import { useProject } from "@/lib/project-context";

// --- Todo Store ---
interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  projectId?: string;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  linkedPRD?: string;
  linkedMeeting?: string;
}

function getTodos(projectId?: string | null): TodoItem[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem("pm-todos") || "[]") as TodoItem[];
    if (projectId === null || projectId === undefined) return all;
    return all.filter((t) => t.projectId === projectId);
  } catch { return []; }
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem("pm-todos", JSON.stringify(todos));
}

// --- Quick Actions ---
const quickActions = [
  {
    href: "/recording",
    label: "录音分析",
    desc: "开会录音，自动转文字、提取术语",
    icon: Mic,
    color: "bg-red-50 text-red-600",
  },
  {
    href: "/prd",
    label: "写 PRD",
    desc: "像聊天一样写产品需求文档",
    icon: FileText,
    color: "bg-green-50 text-green-600",
  },
  {
    href: "/terms",
    label: "医学术语",
    desc: "不懂的医疗词汇？输入即解释",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/prototype",
    label: "出原型",
    desc: "描述功能，自动生成页面",
    icon: Monitor,
    color: "bg-purple-50 text-purple-600",
  },
  {
    href: "/dev-comm",
    label: "开发沟通",
    desc: "和程序员说话的翻译器",
    icon: ArrowRightLeft,
    color: "bg-pink-50 text-pink-600",
  },
  {
    href: "/notes",
    label: "会议记录",
    desc: "粘贴沟通内容，自动提炼要点",
    icon: StickyNote,
    color: "bg-orange-50 text-orange-600",
  },
];

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 9) return "早上好";
  if (h < 12) return "上午好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

function getTimeTip(): string {
  const h = new Date().getHours();
  if (h < 9) return "开会前先用「医学术语」预习一下";
  if (h < 12) return "上午适合写 PRD，思路最清晰";
  if (h < 14) return "午休时间可以整理下上午的会议记录";
  if (h < 18) return "下午适合和开发沟通，跟进需求";
  return "晚上可以复盘今天的工作，规划明天";
}

// ── Backup helpers ──

const BACKUP_DATA_KEYS = [
  "prd-docs", "prd-draft", "saved-terms", "saved-notes", "pm-todos", "prototypes",
  "pm-projects", "pm-current-project", "ai-config", "workflow-dismissed", "comm-guide-favorites",
];

function collectAllData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  BACKUP_DATA_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  });
  return data;
}

function getDaysSinceLastBackup(): number | null {
  const raw = localStorage.getItem("last-backup-date");
  if (!raw) return null;
  const last = new Date(raw);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

function performQuickBackup() {
  const data = collectAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pm-copilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem("last-backup-date", new Date().toISOString().slice(0, 10));
}

export default function Dashboard() {
  const hasAI = hasDefaultAI() || !!getAIConfig();
  const { currentProject, currentProjectId } = useProject();
  const [prds, setPrds] = useState<PRDDocument[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoInput, setTodoInput] = useState("");
  const [todoPriority, setTodoPriority] = useState<"high" | "medium" | "low">("medium");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [backupDays, setBackupDays] = useState<number | null>(null);
  const [backupDone, setBackupDone] = useState(false);
  const [showFirstVisitModal, setShowFirstVisitModal] = useState(false);

  useEffect(() => {
    setPrds(getAllPRDs(currentProjectId));
    setMeetings(getAllMeetings(currentProjectId));
    setTodos(getTodos(currentProjectId));
    const dismissed = localStorage.getItem("workflow-dismissed");
    setShowWorkflow(!dismissed);

    // Backup reminder check
    setBackupDays(getDaysSinceLastBackup());

    // First visit modal
    const visited = localStorage.getItem("pm-first-visit-dismissed");
    if (!visited) {
      setShowFirstVisitModal(true);
    }
  }, [currentProjectId]);

  const recentPRDs = prds.slice(0, 5);
  const recentMeetings = meetings.slice(0, 5);
  const pendingTodos = todos.filter((t) => !t.done);
  const doneTodos = todos.filter((t) => t.done);

  // Stats
  const totalPRDs = prds.length;
  const iteratedPRDs = prds.filter((p) => p.version > 1).length;
  const todoRate = todos.length > 0 ? Math.round((doneTodos.length / todos.length) * 100) : 0;

  // Todo handlers
  const addTodo = () => {
    if (!todoInput.trim()) return;
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text: todoInput.trim(),
      done: false,
      createdAt: new Date().toISOString(),
      projectId: currentProjectId || undefined,
      priority: todoPriority,
      dueDate: todoDueDate || undefined,
    };
    // Save to all todos (not just filtered)
    const allTodos = JSON.parse(localStorage.getItem("pm-todos") || "[]") as TodoItem[];
    const updated = [newTodo, ...allTodos];
    saveTodos(updated);
    // Refresh filtered view
    setTodos(getTodos(currentProjectId));
    setTodoInput("");
    setTodoPriority("medium");
    setTodoDueDate("");
  };

  const toggleTodo = (id: string) => {
    const allTodos = JSON.parse(localStorage.getItem("pm-todos") || "[]") as TodoItem[];
    const updated = allTodos.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    saveTodos(updated);
    setTodos(getTodos(currentProjectId));
  };

  const deleteTodo = (id: string) => {
    const allTodos = JSON.parse(localStorage.getItem("pm-todos") || "[]") as TodoItem[];
    const updated = allTodos.filter((t) => t.id !== id);
    saveTodos(updated);
    setTodos(getTodos(currentProjectId));
  };

  const dismissWorkflow = () => {
    setShowWorkflow(false);
    localStorage.setItem("workflow-dismissed", "1");
  };

  const restoreWorkflow = () => {
    localStorage.removeItem("workflow-dismissed");
    setShowWorkflow(true);
  };

  const handleQuickBackup = () => {
    performQuickBackup();
    setBackupDone(true);
    setBackupDays(0);
    setTimeout(() => setBackupDone(false), 3000);
  };

  const dismissFirstVisit = () => {
    setShowFirstVisitModal(false);
    localStorage.setItem("pm-first-visit-dismissed", "1");
  };

  const workflow = [
    { step: "1", label: "开会前", desc: "用「医学术语」预习专业词汇" },
    { step: "2", label: "开会时", desc: "用「录音分析」一键录音" },
    { step: "3", label: "开会后", desc: "录音自动转文字 + 提取要点" },
    { step: "4", label: "写需求", desc: "用「PRD 生成」写需求文档" },
    { step: "5", label: "出原型", desc: "用「原型生成」出页面效果" },
    { step: "6", label: "交开发", desc: "用「开发沟通」把需求翻译给程序员" },
  ];

  return (
    <div>
      {/* First Visit Modal */}
      {showFirstVisitModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={dismissFirstVisit}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Lightbulb className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold">欢迎使用 PM Copilot!</h2>
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)] space-y-3 mb-5">
              <p>
                PM Copilot 帮你完成从开会录音、写 PRD 到和开发沟通的完整流程。
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
                <p className="font-medium mb-1">重要提示</p>
                <p>
                  你的所有数据（PRD、会议记录、待办等）都保存在浏览器本地，不会上传到服务器。
                </p>
                <p className="mt-1">
                  <strong>换电脑或清除浏览器数据会丢失所有内容。</strong>建议定期使用「一键备份」功能保存数据到文件。
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { dismissFirstVisit(); handleQuickBackup(); }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-blue-700 min-h-[44px]"
              >
                立即备份
              </button>
              <button
                onClick={dismissFirstVisit}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50 min-h-[44px]"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Reminder Banner */}
      {backupDays !== null && backupDays >= 7 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-800">
              已经 <strong>{backupDays}</strong> 天没有备份了，建议立即备份
            </span>
          </div>
          <button
            onClick={handleQuickBackup}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 shrink-0 min-h-[44px]"
          >
            <Download className="w-4 h-4" /> 一键备份
          </button>
        </div>
      )}

      {/* Quick Backup Button — always visible */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={handleQuickBackup}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors min-h-[44px] ${
            backupDone
              ? "bg-green-50 border-green-200 text-green-700"
              : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-gray-50 hover:text-[var(--color-foreground)]"
          }`}
        >
          <Download className="w-4 h-4" />
          {backupDone ? "已备份" : "一键备份"}
        </button>
        {!showWorkflow && (
          <button
            onClick={restoreWorkflow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-gray-50 hover:text-[var(--color-foreground)] transition-colors min-h-[44px]"
          >
            <Lightbulb className="w-4 h-4" />
            使用指南
          </button>
        )}
        {backupDays !== null && backupDays < 7 && (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            上次备份: {backupDays === 0 ? "今天" : `${backupDays} 天前`}
          </span>
        )}
      </div>

      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {getTimeGreeting()} 👋
          {currentProject && (
            <span className="inline-flex items-center gap-1.5 ml-2 text-base font-normal text-[var(--color-muted-foreground)]">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: currentProject.color }}
              />
              {currentProject.name}
            </span>
          )}
        </h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">{getTimeTip()}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted-foreground)]">PRD 文档</span>
            <FileText className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold mt-1">{totalPRDs}</div>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            {iteratedPRDs} 个经过迭代
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted-foreground)]">待办事项</span>
            <ListTodo className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold mt-1">{pendingTodos.length}</div>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            已完成 {doneTodos.length} 项
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted-foreground)]">完成率</span>
            <CheckSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold mt-1">{todoRate}%</div>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            任务完成进度
          </div>
        </div>
      </div>

      {/* Two-column: Recent PRDs + Todos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Recent PRDs */}
        <div className="rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[var(--color-muted-foreground)]" />
              最近编辑的 PRD
            </h2>
            {prds.length > 0 && (
              <Link href="/prd" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-0.5">
                查看全部 <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="p-2">
            {recentPRDs.length === 0 ? (
              <div className="py-6 text-center">
                <FilePlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-[var(--color-muted-foreground)] mb-2">还没有 PRD 文档</p>
                <Link
                  href="/prd"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3" /> 创建第一个 PRD
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentPRDs.map((prd) => (
                  <Link
                    key={prd.id}
                    href="/prd"
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-[var(--color-primary)] transition-colors">
                        {prd.title}
                      </div>
                      <div className="text-xs text-[var(--color-muted-foreground)] truncate">
                        v{prd.version} · {new Date(prd.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Meetings */}
        <div className="rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-medium flex items-center gap-1.5">
              <MicIcon className="w-4 h-4 text-[var(--color-muted-foreground)]" />
              最近会议
            </h2>
            {meetings.length > 0 && (
              <Link href="/meetings" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-0.5">
                查看全部 <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="p-2">
            {recentMeetings.length === 0 ? (
              <div className="py-4 text-center">
                <MicIcon className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-[var(--color-muted-foreground)]">暂无会议记录</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentMeetings.map((m) => (
                  <Link
                    key={m.id}
                    href="/meetings"
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center text-white text-[10px] ${m.type === "recording" ? "bg-red-500" : "bg-orange-500"}`}>
                      {m.type === "recording" ? "🎙" : "📝"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-[var(--color-primary)] transition-colors">
                        {m.title}
                      </div>
                      <div className="text-xs text-[var(--color-muted-foreground)] truncate">
                        {m.type === "recording" ? "录音" : "笔记"} · {new Date(m.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Todos */}
        <div className="rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-medium flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-[var(--color-muted-foreground)]" />
              我的待办
              {currentProject && (
                <span
                  className="w-2 h-2 rounded-full inline-block ml-1"
                  style={{ background: currentProject.color }}
                  title={currentProject.name}
                />
              )}
            </h2>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {pendingTodos.length} 项待办
            </span>
          </div>
          <div className="p-3">
            {/* Add todo input */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={todoInput}
                onChange={(e) => setTodoInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                placeholder="添加待办事项，回车确认..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                onClick={addTodo}
                disabled={!todoInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Priority & due date row */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <Flag className="w-3 h-3 text-[var(--color-muted-foreground)]" />
                {(["high", "medium", "low"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setTodoPriority(p)}
                    className={`px-2 py-0.5 rounded text-[10px] tap-exempt ${
                      todoPriority === p
                        ? p === "high" ? "bg-red-100 text-red-600"
                          : p === "medium" ? "bg-amber-100 text-amber-600"
                          : "bg-gray-100 text-gray-500"
                        : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
                    }`}
                  >
                    {p === "high" ? "高" : p === "medium" ? "中" : "低"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <Calendar className="w-3 h-3 text-[var(--color-muted-foreground)]" />
                <input
                  type="date"
                  value={todoDueDate}
                  onChange={(e) => setTodoDueDate(e.target.value)}
                  className="px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[10px] text-[var(--color-muted-foreground)] focus:outline-none tap-exempt"
                />
              </div>
            </div>

            {todos.length === 0 ? (
              <div className="py-4 text-center">
                <CheckSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  暂无待办事项
                </p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[280px] overflow-y-auto">
                {pendingTodos.map((todo) => (
                  <div key={todo.id} className="flex items-center gap-2 group p-1.5 rounded hover:bg-gray-50">
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                        todo.priority === "high" ? "border-red-400"
                          : "border-gray-300 hover:border-[var(--color-primary)]"
                      }`}
                    />
                    <span className="flex-1 text-sm min-w-0 truncate">{todo.text}</span>
                    {todo.priority === "high" && (
                      <Flag className="w-3 h-3 text-red-500 shrink-0" />
                    )}
                    {todo.dueDate && (
                      <span className={`text-[10px] shrink-0 ${
                        new Date(todo.dueDate) < new Date() ? "text-red-500 font-medium" : "text-[var(--color-muted-foreground)]"
                      }`}>
                        {new Date(todo.dueDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {doneTodos.length > 0 && (
                  <>
                    <div className="text-xs text-[var(--color-muted-foreground)] py-1 px-1.5 mt-1">
                      已完成 ({doneTodos.length})
                    </div>
                    {doneTodos.slice(0, 5).map((todo) => (
                      <div key={todo.id} className="flex items-center gap-2 group p-1.5 rounded hover:bg-gray-50">
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className="w-4 h-4 rounded border border-green-500 bg-green-500 text-white shrink-0 flex items-center justify-center"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <span className="flex-1 text-sm text-[var(--color-muted-foreground)] line-through min-w-0 truncate">{todo.text}</span>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          快捷操作
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all"
              >
                <div className={`p-2 rounded-lg ${action.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {action.desc}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Workflow Guide - dismissible */}
      {showWorkflow && (
        <div className="rounded-xl border border-[var(--color-border)] p-5 mb-6 relative">
          <button
            onClick={dismissWorkflow}
            className="absolute top-3 right-3 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            不再显示
          </button>
          <h2 className="font-medium text-sm mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            新手工作流程
          </h2>
          <div className="flex flex-wrap gap-3">
            {workflow.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-xs flex items-center justify-center">
                    {item.step}
                  </span>
                  <div>
                    <div className="text-xs font-medium">{item.label}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {item.desc}
                    </div>
                  </div>
                </div>
                {i < workflow.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First Time Setup */}
      {!hasAI && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
          <h2 className="font-medium text-sm text-blue-800 mb-2">
            首次使用？
          </h2>
          <p className="text-sm text-blue-700">
            工具已经配置好 AI 服务，可以直接使用。如果想用自己的 AI 服务获得更快体验，可以到「设置」页面配置。
          </p>
          <Link
            href="/settings"
            className="inline-block mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            了解更多
          </Link>
        </div>
      )}
    </div>
  );
}
