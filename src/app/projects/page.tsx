"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  FolderOpen,
} from "lucide-react";
import { useProject } from "@/lib/project-context";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, createProject, updateProject, deleteProject } = useProject();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject(newName.trim(), newDesc.trim());
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
  };

  const handleStartEdit = (id: string, name: string, desc: string) => {
    setEditingId(id);
    setEditName(name);
    setEditDesc(desc);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateProject(id, { name: editName.trim(), description: editDesc.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    setDeleteConfirmId(null);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 text-[var(--color-muted-foreground)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">项目管理</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            创建和管理项目，按项目组织 PRD、待办等数据
          </p>
        </div>
      </div>

      <div className="max-w-lg">
        {/* Create project */}
        {showCreate ? (
          <div className="rounded-xl border border-[var(--color-border)] p-4 mb-4">
            <h3 className="text-sm font-medium mb-3">新建项目</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                  项目名称
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  placeholder="例如：HIS 系统、患者管理平台..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                  项目描述（可选）
                </label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="简要描述项目..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40"
                >
                  创建
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                    setNewDesc("");
                  }}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors mb-4"
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
        )}

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
            <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-[var(--color-muted-foreground)] mb-1">
              还没有创建项目
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              项目可以帮你按产品分组管理 PRD、待办等数据
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((proj) => (
              <div key={proj.id}>
                {editingId === proj.id ? (
                  <div className="rounded-xl border border-[var(--color-primary)] p-4">
                    <div className="space-y-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(proj.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                        autoFocus
                      />
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="项目描述..."
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(proj.id)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> 保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                ) : deleteConfirmId === proj.id ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700 mb-2">
                      确定删除项目「{proj.name}」？
                    </p>
                    <p className="text-xs text-red-600 mb-3">
                      项目下的数据不会被删除，但会变成未分类状态。
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(proj.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                      >
                        确认删除
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] hover:border-gray-300 transition-colors">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: proj.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{proj.name}</div>
                      {proj.description && (
                        <div className="text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">
                          {proj.description}
                        </div>
                      )}
                      <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        创建于 {new Date(proj.createdAt).toLocaleDateString("zh-CN")}
                      </div>
                    </div>
                    <div className="hidden group-hover:flex gap-1 shrink-0">
                      <button
                        onClick={() =>
                          handleStartEdit(proj.id, proj.name, proj.description)
                        }
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(proj.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
