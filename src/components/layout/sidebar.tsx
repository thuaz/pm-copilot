"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Monitor,
  Mic,
  StickyNote,
  ArrowRightLeft,
  Settings,
  Menu,
  X,
  MessageCircleHeart,
  ChevronDown,
  Plus,
  FolderOpen,
  Check,
  Pencil,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { useProject } from "@/lib/project-context";

const navItems = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  // Meeting group — both record and notes share the same unified history
  { href: "/recording", label: "录音分析", icon: Mic, group: "meeting" as const },
  { href: "/notes", label: "会议记录", icon: StickyNote, group: "meeting" as const },
  { href: "/meetings", label: "会议历史", icon: CalendarDays, group: "meeting" as const },
  { href: "/comm-guide", label: "沟通教练", icon: MessageCircleHeart },
  { href: "/terms", label: "医学术语", icon: BookOpen },
  { href: "/prd", label: "PRD 生成", icon: FileText },
  { href: "/prototype", label: "原型生成", icon: Monitor },
  { href: "/dev-comm", label: "开发沟通", icon: ArrowRightLeft },
];

function ProjectSelector() {
  const {
    projects,
    currentProject,
    currentProjectId,
    setCurrentProject,
    createProject,
    updateProject,
    deleteProject,
  } = useProject();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
        setEditingId(null);
        setDeleteConfirmId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (showCreate && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [showCreate]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject(newName.trim());
    setNewName("");
    setShowCreate(false);
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateProject(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    setDeleteConfirmId(null);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors text-left"
      >
        <FolderOpen className="w-4 h-4 shrink-0 text-[var(--color-muted-foreground)]" />
        <span className="flex-1 truncate text-[var(--color-foreground)]">
          {currentProject ? currentProject.name : "全部"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--color-muted-foreground)] transition-transform shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] py-1 max-h-[320px] overflow-y-auto">
          {/* "All" option */}
          <button
            onClick={() => {
              setCurrentProject(null);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${
              currentProjectId === null ? "text-[var(--color-primary)]" : ""
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: "var(--color-muted-foreground)" }}
            />
            <span className="flex-1">全部</span>
            {currentProjectId === null && (
              <Check className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Project list */}
          {projects.map((proj) => (
            <div key={proj.id}>
              {editingId === proj.id ? (
                <div className="flex items-center gap-1 px-3 py-1.5">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(proj.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 px-2 py-1 rounded border border-[var(--color-primary)] text-sm focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(proj.id)}
                    className="p-1 rounded hover:bg-gray-100 text-green-600"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : deleteConfirmId === proj.id ? (
                <div className="px-3 py-2">
                  <p className="text-xs text-red-600 mb-1.5">
                    删除「{proj.name}」？
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(proj.id)}
                      className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 rounded text-xs border border-gray-300 hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`group flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left cursor-pointer ${
                    currentProjectId === proj.id
                      ? "text-[var(--color-primary)]"
                      : ""
                  }`}
                  onClick={() => {
                    setCurrentProject(proj.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: proj.color }}
                  />
                  <span className="flex-1 truncate">{proj.name}</span>
                  {currentProjectId === proj.id && (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <div className="hidden group-hover:flex gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(proj.id, proj.name);
                      }}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(proj.id);
                      }}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Create new project */}
          {showCreate ? (
            <div className="flex items-center gap-1 px-3 py-1.5 border-t border-gray-100 mt-1">
              <input
                ref={createInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setShowCreate(false);
                    setNewName("");
                  }
                }}
                placeholder="项目名称..."
                className="flex-1 px-2 py-1 rounded border border-[var(--color-primary)] text-sm focus:outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="p-1 rounded hover:bg-gray-100 text-green-600 disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-gray-50 transition-colors border-t border-gray-100 mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              新建项目
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const NavLinks = () => (
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const prevItem = idx > 0 ? navItems[idx - 1] : null;
        // Insert a section label before the meeting group
        const showGroupLabel = item.group === "meeting" && (!prevItem || prevItem.group !== "meeting");
        return (
          <div key={item.href}>
            {showGroupLabel && (
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                会议
              </p>
            )}
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-accent)] text-[var(--color-sidebar-active)] font-medium"
                  : "text-[var(--color-sidebar-foreground)] hover:bg-gray-100"
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
            </Link>
          </div>
        );
      })}
      <div className="border-t border-[var(--color-border)] my-2" />
      <Link
        href="/projects"
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          pathname === "/projects"
            ? "bg-[var(--color-accent)] text-[var(--color-sidebar-active)] font-medium"
            : "text-[var(--color-sidebar-foreground)] hover:bg-gray-100"
        }`}
      >
        <FolderOpen className="w-[18px] h-[18px] shrink-0" />
        项目管理
      </Link>
      <Link
        href="/settings"
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          pathname === "/settings"
            ? "bg-[var(--color-accent)] text-[var(--color-sidebar-active)] font-medium"
            : "text-[var(--color-sidebar-foreground)] hover:bg-gray-100"
        }`}
      >
        <Settings className="w-[18px] h-[18px] shrink-0" />
        设置
      </Link>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] flex items-center justify-between px-4 z-50">
        <h1 className="text-base font-bold">PM Copilot</h1>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile slide-out menu */}
      <div
        className={`lg:hidden fixed top-14 left-0 bottom-0 w-64 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex flex-col z-50 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            PM 助手
          </p>
        </div>
        <div className="px-2 py-2">
          <ProjectSelector />
        </div>
        <NavLinks />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex-col z-50">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h1 className="text-lg font-bold text-[var(--color-foreground)]">
            PM Copilot
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            PM 助手
          </p>
        </div>
        <div className="px-3 py-2">
          <ProjectSelector />
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
