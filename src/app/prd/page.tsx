"use client";

import { useState, useEffect, useRef } from "react";
import { callAIStream } from "@/lib/ai";
import { PRD_SYSTEM_PROMPT } from "@/lib/prompts/terms";
import { getAllPRDs, createPRD, iteratePRD, getPRDHistory, restorePRDVersion, type PRDDocument, type PRDHistoryEntry } from "@/lib/prd-store";
import { exportPRD, type ExportFormat } from "@/lib/export";
import { useProject } from "@/lib/project-context";
import {
  Loader2,
  Copy,
  Check,
  Download,
  MessageSquare,
  FileText,
  Sparkles,
  Plus,
  List,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronDown,
  Search,
  History,
  Eye,
  RotateCcw,
  X,
  BookOpen,
  Bold,
  Italic,
  Heading2,
  Heading3,
  ListOrdered,
  CheckSquare,
  Code,
  Link,
  Minus,
  Quote,
} from "lucide-react";
import { MD } from "@/components/markdown";

type View = "list" | "chat" | "wizard" | "detail";

export default function PRDPage() {
  const { currentProjectId } = useProject();
  const [view, setView] = useState<View>("list");
  const [prds, setPrds] = useState<PRDDocument[]>([]);
  const [selectedPRD, setSelectedPRD] = useState<PRDDocument | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [wizardData, setWizardData] = useState<Record<string, string>>({});
  const [prdOutput, setPrdOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Iteration
  const [iterating, setIterating] = useState(false);
  const [iterInput, setIterInput] = useState("");
  const [iterOutput, setIterOutput] = useState("");
  // Version History
  const [showHistory, setShowHistory] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<PRDHistoryEntry | null>(null);
  const [restoringVersion, setRestoringVersion] = useState(false);
  // Terms Reference Panel
  const [showTermsPanel, setShowTermsPanel] = useState(false);
  const [termsList, setTermsList] = useState<{ term: string; explanation: string }[]>([]);
  // Refs for textareas that support Markdown toolbar
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const iterInputRef = useRef<HTMLTextAreaElement>(null);
  const wizardTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    setPrds(getAllPRDs(currentProjectId));
    const draft = localStorage.getItem("prd-draft");
    if (draft) {
      localStorage.removeItem("prd-draft");
      // Try structured payload first; fall back to plain string for backward compat
      let contextText = "";
      try {
        const parsed = JSON.parse(draft);
        if (parsed.summary) {
          contextText = "请根据以下会议分析结果生成 PRD：\n\n";
          if (parsed.originalText) {
            contextText += `## 原始会议记录\n${parsed.originalText}\n\n`;
          }
          contextText += `## AI 分析结果\n${parsed.summary}`;
        } else {
          contextText = draft;
        }
      } catch {
        contextText = `请根据以下会议分析结果生成 PRD：\n\n${draft}`;
      }
      setChatInput(contextText);
      setView("chat");
      setChatHistory([]);
    }
  }, [currentProjectId]);

  const toggleTermsPanel = () => {
    if (!showTermsPanel) {
      try {
        setTermsList(JSON.parse(localStorage.getItem("saved-terms") || "[]"));
      } catch { setTermsList([]); }
    }
    setShowTermsPanel(!showTermsPanel);
  };

  const refreshList = () => setPrds(getAllPRDs(currentProjectId));

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setError("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const context =
        chatHistory.length > 0
          ? `之前的对话：\n${chatHistory.map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content}`).join("\n")}\n\n用户继续说：${userMsg}`
          : userMsg;
      const stream = callAIStream(
        context,
        `${PRD_SYSTEM_PROMPT}\n\n你正在和一位新手 PM 对话，帮他梳理需求并逐步形成 PRD。当用户说"生成 PRD"时，把积累的信息整理成完整 PRD 文档。`
      );
      const reader = stream.getReader();
      setChatHistory((prev) => [...prev, { role: "ai", content: "" }]);
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        const current = acc;
        setChatHistory((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "ai", content: current };
          return updated;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromChat = async () => {
    if (chatHistory.length === 0) return;
    setLoading(true);
    setError("");
    setPrdOutput("");
    try {
      const prompt = `根据以下对话内容，生成一份完整的 PRD 文档：\n\n${chatHistory.map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content}`).join("\n")}`;
      const stream = callAIStream(prompt, PRD_SYSTEM_PROMPT);
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        setPrdOutput(acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleWizardGenerate = async () => {
    const steps = [
      { key: "background", label: "项目背景" },
      { key: "users", label: "目标用户" },
      { key: "features", label: "功能需求" },
      { key: "nonFunc", label: "非功能需求" },
      { key: "schedule", label: "排期" },
    ];
    const filled = steps.filter((s) => wizardData[s.key]?.trim());
    if (filled.length === 0) return;
    setLoading(true);
    setError("");
    setPrdOutput("");
    try {
      const prompt = `请根据以下信息生成 PRD：\n\n${filled.map((s) => `## ${s.label}\n${wizardData[s.key]}`).join("\n\n")}`;
      const stream = callAIStream(prompt, PRD_SYSTEM_PROMPT);
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        setPrdOutput(acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleIterate = async () => {
    if (!selectedPRD || !iterInput.trim()) return;
    setIterating(true);
    setError("");
    setIterOutput("");
    try {
      const stream = callAIStream(
        `## 现有 PRD（v${selectedPRD.version}）：\n\n${selectedPRD.content}\n\n---\n\n## 反馈/修改意见：\n\n${iterInput}`,
        `你是一位产品经理助手。根据反馈意见更新现有 PRD 文档。在顶部添加「迭代记录」说明改了什么。输出完整的更新后 PRD。`
      );
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        setIterOutput(acc);
      }
      const updated = iteratePRD(selectedPRD.id, acc, `手动迭代 v${selectedPRD.version} → v${selectedPRD.version + 1}`);
      if (updated) {
        setSelectedPRD(updated);
        refreshList();
      }
      setIterInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "迭代失败");
    } finally {
      setIterating(false);
    }
  };

  const handleSave = () => {
    if (!prdOutput) return;
    const title = prdOutput.split("\n").find((l) => l.trim() && !l.startsWith("```"))?.replace(/^#+\s*/, "") || "未命名 PRD";
    const prd = createPRD(title, prdOutput, view === "chat" ? "chat" : "wizard", undefined, currentProjectId || undefined);
    refreshList();
    setSelectedPRD(prd);
    setView("detail");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!prdOutput && !selectedPRD) return;
    const content = prdOutput || selectedPRD!.content;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRD-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    const docs = getAllPRDs().filter((p) => p.id !== id);
    localStorage.setItem("prd-docs", JSON.stringify(docs));
    refreshList();
    if (selectedPRD?.id === id) {
      setSelectedPRD(null);
      setView("list");
    }
  };

  // PRD Detail View
  if (view === "detail") {
    if (!selectedPRD) {
      setView("list");
      return null;
    }
    return (
      <div>
        <button
          onClick={() => { setView("list"); setSelectedPRD(null); }}
          className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> 返回列表
        </button>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{selectedPRD.title}</h1>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              v{selectedPRD.version} · {selectedPRD.source === "iteration" ? "迭代" : selectedPRD.source === "recording" ? "录音生成" : selectedPRD.source}
              · {new Date(selectedPRD.updatedAt).toLocaleDateString()}
              {selectedPRD.sourceNote && ` · ${selectedPRD.sourceNote}`}
            </p>
          </div>
          <div className="flex gap-1 items-center">
            <button onClick={() => handleCopy(selectedPRD.content)} className="p-2 rounded hover:bg-gray-100 text-gray-400" title="复制">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { setShowHistory(true); setViewingVersion(null); }}
              className="p-2 rounded hover:bg-gray-100 text-gray-400"
              title="版本历史"
            >
              <History className="w-4 h-4" />
            </button>
            <PRDExportDropdown title={selectedPRD.title} content={selectedPRD.content} />
            <button onClick={() => handleDelete(selectedPRD.id)} className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="删除">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-5 max-h-[500px] overflow-y-auto prose prose-sm max-w-none mb-4">
          <MD>{selectedPRD.content}</MD>
        </div>
        {/* Iteration */}
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> 迭代此 PRD
          </h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mb-2">
            输入反馈或修改意见（比如工程师的建议），AI 自动更新 PRD
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <MarkdownToolbar textareaRef={iterInputRef} onInsert={setIterInput} />
              <textarea
                ref={iterInputRef}
                value={iterInput}
                onChange={(e) => setIterInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleIterate()}
                placeholder="比如：工程师说登录模块需要加验证码..."
                rows={2}
                className="w-full px-3 py-2 rounded-b-lg border border-[var(--color-border)] border-t-0 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
              />
            </div>
            <button
              onClick={handleIterate}
              disabled={iterating || !iterInput.trim()}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-40 flex items-center gap-1"
            >
              {iterating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              迭代
            </button>
          </div>
          {(iterating || iterOutput) && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50/50">
              <div className="px-3 py-2 border-b border-green-200 text-xs font-medium text-green-700">
                迭代结果 {iterating && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
              </div>
              <div className="p-3 max-h-[300px] overflow-y-auto prose prose-sm max-w-none text-sm">
                {iterOutput && <MD>{iterOutput}</MD>}
                {iterating && !iterOutput && <span className="text-xs text-gray-400">正在生成迭代内容...</span>}
                {iterating && iterOutput && <span className="inline-block w-2 h-4 bg-green-600 animate-pulse ml-0.5 align-text-bottom" />}
              </div>
            </div>
          )}
        </div>
        {/* Version History Slide-out Panel */}
        {showHistory && selectedPRD && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => { setShowHistory(false); setViewingVersion(null); }}
            />
            <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full overflow-hidden">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <History className="w-4 h-4" /> 版本历史
                </h3>
                <button
                  onClick={() => { setShowHistory(false); setViewingVersion(null); }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Version Banner */}
              <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-blue-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-primary)]">当前版本</span>
                    <span className="ml-1.5 text-xs text-gray-600">v{selectedPRD.version}</span>
                  </div>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {new Date(selectedPRD.updatedAt).toLocaleString()}
                  </span>
                </div>
                {selectedPRD.sourceNote && (
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 truncate">
                    {selectedPRD.sourceNote}
                  </p>
                )}
              </div>

              {/* History List or Version Viewer */}
              {viewingVersion ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)]">
                    <button
                      onClick={() => setViewingVersion(null)}
                      className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
                    >
                      <ChevronLeft className="w-3 h-3" /> 返回列表
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs font-medium">v{viewingVersion.version} 内容</span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {new Date(viewingVersion.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none text-sm">
                    <MD>{viewingVersion.content}</MD>
                  </div>
                  <div className="px-4 py-3 border-t border-[var(--color-border)]">
                    <button
                      onClick={async () => {
                        setRestoringVersion(true);
                        const restored = restorePRDVersion(selectedPRD.id, viewingVersion.version);
                        if (restored) {
                          setSelectedPRD(restored);
                          refreshList();
                        }
                        setRestoringVersion(false);
                        setViewingVersion(null);
                        setShowHistory(false);
                      }}
                      disabled={restoringVersion}
                      className="w-full py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {restoringVersion ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      恢复到此版本
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {getPRDHistory(selectedPRD.id).length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <History className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        暂无历史版本
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        迭代 PRD 后，旧版本会自动保存在这里
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {getPRDHistory(selectedPRD.id).map((entry) => (
                        <div key={entry.version} className="px-4 py-3 hover:bg-gray-50/80 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700">v{entry.version}</span>
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              {new Date(entry.updatedAt).toLocaleString()}
                            </span>
                          </div>
                          {entry.summary && (
                            <p className="text-xs text-[var(--color-muted-foreground)] mb-2 truncate">
                              {entry.summary}
                            </p>
                          )}
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setViewingVersion(entry)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-[var(--color-border)] hover:bg-gray-100 text-gray-600"
                            >
                              <Eye className="w-3 h-3" /> 查看
                            </button>
                            <button
                              onClick={async () => {
                                setRestoringVersion(true);
                                const restored = restorePRDVersion(selectedPRD.id, entry.version);
                                if (restored) {
                                  setSelectedPRD(restored);
                                  refreshList();
                                }
                                setRestoringVersion(false);
                                setShowHistory(false);
                              }}
                              disabled={restoringVersion}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40"
                            >
                              {restoringVersion ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              恢复
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // PRD List View
  if (view === "list") {
    const filtered = prds.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">PRD 文档</h1>
            <p className="text-[var(--color-muted-foreground)] mt-1">
              管理和查看所有 PRD 文档
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索 PRD..."
                className="pl-8 pr-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)] w-48"
              />
            </div>
            <button
              onClick={() => { setView("chat"); setChatHistory([]); setPrdOutput(""); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> 新建 PRD
            </button>
          </div>
        </div>

        {prds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-[var(--color-muted-foreground)] mb-3">还没有 PRD 文档</p>
            <p className="text-xs text-[var(--color-muted-foreground)] mb-4">
              可以通过以下方式创建：
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setView("chat"); setChatHistory([]); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4" /> 对话式写
              </button>
              <button
                onClick={() => { setView("wizard"); setWizardData({}); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50"
              >
                <List className="w-4 h-4" /> 引导式填写
              </button>
            </div>
            <p className="text-xs text-blue-500 mt-4">
              也可以在「录音分析」中一键从会议录音生成 PRD
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-[var(--color-muted-foreground)]">没有匹配「{searchQuery}」的 PRD</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((prd) => {
              const preview = prd.content
                .replace(/^#+\s.*/gm, "")
                .replace(/[*`[\]#]/g, "")
                .split("\n")
                .filter((l: string) => l.trim())
                .slice(0, 2)
                .join(" ")
                .substring(0, 120);
              return (
              <div
                key={prd.id}
                className="group flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] cursor-pointer transition-colors"
                onClick={() => { setSelectedPRD(prd); setView("detail"); }}
              >
                <FileText className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{prd.title}</div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    v{prd.version} · {prd.source === "recording" ? "录音生成" : prd.source === "iteration" ? "迭代更新" : prd.source === "chat" ? "对话生成" : prd.source}
                    · {new Date(prd.updatedAt).toLocaleDateString()}
                  </div>
                  {preview && (
                    <div className="text-xs text-[var(--color-muted-foreground)] mt-1 line-clamp-2 opacity-70">
                      {preview}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(prd.id); }}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 mt-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );})}
          </div>
        )}
      </div>
    );
  }

  // Chat / Wizard View
  const mode = view === "chat" ? "chat" : "wizard";

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setView("list")} className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
          <ChevronLeft className="w-4 h-4 inline" /> 返回
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setView("chat")}
            className={`px-3 py-1 rounded text-xs ${mode === "chat" ? "bg-[var(--color-accent)] text-[var(--color-primary)]" : "text-gray-500"}`}
          >
            对话式
          </button>
          <button
            onClick={() => setView("wizard")}
            className={`px-3 py-1 rounded text-xs ${mode === "wizard" ? "bg-[var(--color-accent)] text-[var(--color-primary)]" : "text-gray-500"}`}
          >
            引导式
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          {mode === "chat" ? (
            <div className="rounded-xl border border-[var(--color-border)] h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-blue-300" />
                    <p className="text-sm text-[var(--color-muted-foreground)]">描述你的产品想法</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${msg.role === "user" ? "bg-[var(--color-primary)] text-white whitespace-pre-wrap" : "bg-gray-100"}`}>
                      {msg.role === "ai" ? <MD>{msg.content}</MD> : msg.content}
                    </div>
                  </div>
                ))}
                {loading && chatHistory[chatHistory.length - 1]?.role === "ai" && !chatHistory[chatHistory.length - 1]?.content && (
                  <div className="flex justify-start"><div className="bg-gray-100 rounded-xl px-3.5 py-2.5"><span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" /></div></div>
                )}
              </div>
              <div className="p-3 border-t border-[var(--color-border)]">
                <MarkdownToolbar textareaRef={chatInputRef} onInsert={setChatInput} />
                <div className="flex gap-2 mt-0">
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatSend()}
                    placeholder="描述你的想法..."
                    rows={2}
                    className="flex-1 px-3 py-2 rounded-b-lg border border-[var(--color-border)] border-t-0 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={handleChatSend} disabled={loading || !chatInput.trim()} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-40">发送</button>
                </div>
              </div>
              {chatHistory.length > 0 && (
                <div className="px-3 pb-3">
                  <button onClick={handleGenerateFromChat} disabled={loading} className="w-full py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" /> 生成 PRD 文档
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-4">
              {[
                { key: "background", label: "项目背景", ph: "描述项目背景..." },
                { key: "users", label: "目标用户", ph: "谁会用这个产品？" },
                { key: "features", label: "功能需求", ph: "主要功能有哪些？" },
                { key: "nonFunc", label: "非功能需求", ph: "性能、安全、合规等（可留空）" },
                { key: "schedule", label: "排期", ph: "期望什么时候上线？（可留空）" },
              ].map((s) => (
                <div key={s.key}>
                  <label className="text-sm font-medium mb-1 block">{s.label}</label>
                  <MarkdownToolbar
                    textareaRef={{ current: wizardTextareaRefs.current[s.key] ?? null }}
                    onInsert={(val) => setWizardData((p) => ({ ...p, [s.key]: val }))}
                  />
                  <textarea
                    ref={(el) => { wizardTextareaRefs.current[s.key] = el; }}
                    value={wizardData[s.key] || ""}
                    onChange={(e) => setWizardData((p) => ({ ...p, [s.key]: e.target.value }))}
                    placeholder={s.ph}
                    rows={3}
                    className="w-full px-3 py-2 rounded-b-lg border border-[var(--color-border)] border-t-0 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
                  />
                </div>
              ))}
              <button onClick={handleWizardGenerate} disabled={loading} className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 生成 PRD
              </button>
            </div>
          )}
        </div>

        <div>
          {prdOutput ? (
            <div className="rounded-xl border border-[var(--color-border)] h-[500px] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                <span className="text-sm font-medium">PRD 文档</span>
                <div className="flex gap-1 items-center">
                  <button onClick={() => handleCopy(prdOutput)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <PRDExportDropdown title={prdOutput.split("\n").find((l) => l.trim() && !l.startsWith("```"))?.replace(/^#+\s*/, "") || "PRD"} content={prdOutput} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none">
                    <MD>{prdOutput}</MD>
                    {loading && <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-0.5 align-text-bottom" />}
                  </div>
              <div className="px-4 py-2.5 border-t border-[var(--color-border)]">
                <button onClick={handleSave} className="w-full py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" /> 保存到 PRD 列表
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] h-[500px] flex items-center justify-center text-sm text-[var(--color-muted-foreground)]">
              PRD 文档将在这里生成
            </div>
          )}
        </div>
      </div>

      {error && <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {/* Floating Terms Reference Button */}
      <button
        onClick={toggleTermsPanel}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg bg-white border border-[var(--color-border)] text-sm hover:shadow-xl transition-shadow"
        title="查看已收藏的术语"
      >
        <BookOpen className="w-4 h-4 text-[var(--color-primary)]" />
        <span>术语参考</span>
        {termsList.length > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-[var(--color-primary)] text-xs font-medium">
            {termsList.length}
          </span>
        )}
      </button>

      {/* Terms Reference Side Panel */}
      {showTermsPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowTermsPanel(false)}
          />
          <div className="relative w-full max-w-sm bg-white shadow-xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> 已收藏术语
              </h3>
              <button
                onClick={() => setShowTermsPanel(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {termsList.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    还没有收藏的术语
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                    在「术语助手」中查询后点击收藏
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {termsList.map((item, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-gray-50/80 transition-colors">
                      <div className="text-sm font-medium">{item.term}</div>
                      <div className="text-xs text-[var(--color-muted-foreground)] mt-1 line-clamp-3">
                        {item.explanation}
                      </div>
                      <button
                        onClick={() => {
                          setChatInput((prev) => (prev ? prev + "\n" : "") + `参考术语：${item.term} - ${item.explanation}`);
                        }}
                        className="mt-1.5 text-xs text-[var(--color-primary)] hover:underline"
                      >
                        插入到对话
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Markdown formatting helpers ---------- */

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  prefix: string;
  suffix: string;
  placeholder: string;
}

function insertMarkdown(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  placeholder: string,
  onValueChange: (value: string) => void,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  const insertion = selected || placeholder;
  const newText = before + prefix + insertion + suffix + after;
  onValueChange(newText);
  // Defer refocus so React has time to reconcile the value
  requestAnimationFrame(() => {
    textarea.focus();
    const cursorPos = start + prefix.length + insertion.length + suffix.length;
    textarea.setSelectionRange(
      selected ? cursorPos : start + prefix.length,
      selected ? cursorPos : start + prefix.length + insertion.length,
    );
  });
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { icon: <Bold className="w-4 h-4" />, title: "加粗", prefix: "**", suffix: "**", placeholder: "粗体文本" },
  { icon: <Italic className="w-4 h-4" />, title: "斜体", prefix: "*", suffix: "*", placeholder: "斜体文本" },
  { icon: <Heading2 className="w-4 h-4" />, title: "标题 2", prefix: "## ", suffix: "", placeholder: "标题" },
  { icon: <Heading3 className="w-4 h-4" />, title: "标题 3", prefix: "### ", suffix: "", placeholder: "标题" },
  { icon: <List className="w-4 h-4" />, title: "无序列表", prefix: "- ", suffix: "", placeholder: "列表项" },
  { icon: <ListOrdered className="w-4 h-4" />, title: "有序列表", prefix: "1. ", suffix: "", placeholder: "列表项" },
  { icon: <CheckSquare className="w-4 h-4" />, title: "待办", prefix: "- [ ] ", suffix: "", placeholder: "待办项" },
  { icon: <Code className="w-4 h-4" />, title: "代码块", prefix: "```\n", suffix: "\n```", placeholder: "代码" },
  { icon: <Link className="w-4 h-4" />, title: "链接", prefix: "[", suffix: "](url)", placeholder: "链接文本" },
  { icon: <Minus className="w-4 h-4" />, title: "分隔线", prefix: "\n---\n", suffix: "", placeholder: "" },
  { icon: <Quote className="w-4 h-4" />, title: "引用", prefix: "> ", suffix: "", placeholder: "引用内容" },
];

function MarkdownToolbar({
  textareaRef,
  onInsert,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-1.5 py-1 bg-gray-50 rounded-t-lg border border-b-0 border-[var(--color-border)]">
      {TOOLBAR_BUTTONS.map((btn, i) => (
        <span key={i} className="contents">
          {i > 0 && (i === 2 || i === 4 || i === 7 || i === 9) && (
            <span className="w-px h-4 bg-gray-300 mx-0.5 select-none" />
          )}
          <button
            type="button"
            title={btn.title}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent textarea blur
              const ta = textareaRef.current;
              if (!ta) return;
              insertMarkdown(ta, btn.prefix, btn.suffix, btn.placeholder, onInsert);
            }}
          >
            {btn.icon}
          </button>
        </span>
      ))}
    </div>
  );
}

function PRDExportDropdown({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formats: { key: ExportFormat; label: string; desc: string }[] = [
    { key: "md", label: "Markdown (.md)", desc: "通用格式，适合开发团队" },
    { key: "docx", label: "Word (.doc)", desc: "正式文档，适合发给甲方" },
    { key: "pdf", label: "PDF", desc: "打印/存档，适合正式场合" },
    { key: "html", label: "HTML 网页", desc: "浏览器直接打开查看" },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 flex items-center gap-0.5" title="导出">
        <Download className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {formats.map((f) => (
            <button
              key={f.key}
              onClick={() => { exportPRD(content, title, f.key); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
            >
              <div className="font-medium text-gray-700">{f.label}</div>
              <div className="text-xs text-gray-400">{f.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
