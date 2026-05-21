"use client";

import { useState, useRef, useCallback } from "react";
import { MessageSquare, Plus, Trash2, Eye, EyeOff, X } from "lucide-react";

export interface Annotation {
  id: string;
  selectedText: string;
  comment: string;
  createdAt: string;
}

interface SummaryAnnotatorProps {
  summary: string;
  summaryOriginal: string;
  onChangeSummary: (value: string) => void;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
}

/**
 * Compute a simple word-level diff between two strings.
 * Returns an array of { text, changed } segments.
 */
function computeDiff(original: string, current: string): { text: string; changed: boolean }[] {
  if (original === current) return [{ text: current, changed: false }];
  if (!original) return [{ text: current, changed: true }];

  const origWords = original.split(/(\s+)/);
  const curWords = current.split(/(\s+)/);

  // Simple LCS-based diff at word level
  const m = origWords.length;
  const n = curWords.length;

  // For long texts, use a simpler line-based approach for performance
  if (m > 2000 || n > 2000) {
    if (original === current) return [{ text: current, changed: false }];
    return [{ text: current, changed: true }];
  }

  // Build DP table for LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === curWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const result: { text: string; changed: boolean }[] = [];
  let i = m;
  let j = n;

  // Collect in reverse, then reverse
  const segments: { text: string; changed: boolean }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === curWords[j - 1]) {
      segments.push({ text: curWords[j - 1], changed: false });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      segments.push({ text: curWords[j - 1], changed: true });
      j--;
    } else {
      // Word deleted from original (skip it)
      i--;
    }
  }

  segments.reverse();

  // Merge adjacent segments with same changed status
  for (const seg of segments) {
    const last = result[result.length - 1];
    if (last && last.changed === seg.changed) {
      last.text += seg.text;
    } else {
      result.push({ ...seg });
    }
  }

  // If all unchanged, return single segment
  if (result.length === 0) {
    return [{ text: current, changed: false }];
  }

  return result;
}

/**
 * Find all occurrences of selectedText in the full text and apply highlight markers.
 * Returns the text with special markers that can be parsed for rendering.
 */
function findAnnotationRanges(
  text: string,
  annotations: Annotation[]
): { start: number; end: number; annotationId: string }[] {
  const ranges: { start: number; end: number; annotationId: string }[] = [];

  for (const ann of annotations) {
    if (!ann.selectedText.trim()) continue;
    // Search for the selected text in the summary (case-sensitive for accuracy)
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const idx = text.indexOf(ann.selectedText, searchFrom);
      if (idx === -1) break;
      ranges.push({
        start: idx,
        end: idx + ann.selectedText.length,
        annotationId: ann.id,
      });
      searchFrom = idx + 1;
    }
  }

  // Sort by start position
  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

export function SummaryAnnotator({
  summary,
  summaryOriginal,
  onChangeSummary,
  annotations,
  onAnnotationsChange,
}: SummaryAnnotatorProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [showAnnotationMode, setShowAnnotationMode] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string>("");
  const [commentInput, setCommentInput] = useState("");
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = summary !== summaryOriginal;

  // Handle text selection for annotation
  const handleTextSelect = useCallback(() => {
    if (!showAnnotationMode) return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      setPendingSelection(sel.toString());
      // Focus the comment input
      setTimeout(() => commentInputRef.current?.focus(), 50);
    }
  }, [showAnnotationMode]);

  // Add annotation
  const handleAddAnnotation = useCallback(() => {
    if (!pendingSelection.trim() || !commentInput.trim()) return;

    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      selectedText: pendingSelection.trim(),
      comment: commentInput.trim(),
      createdAt: new Date().toISOString(),
    };

    onAnnotationsChange([...annotations, newAnnotation]);
    setPendingSelection("");
    setCommentInput("");

    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, [pendingSelection, commentInput, annotations, onAnnotationsChange]);

  // Remove annotation
  const handleRemoveAnnotation = useCallback(
    (id: string) => {
      onAnnotationsChange(annotations.filter((a) => a.id !== id));
      setHoveredAnnotation(null);
    },
    [annotations, onAnnotationsChange]
  );

  // Compute diff segments when showing diff mode
  const diffSegments = showDiff ? computeDiff(summaryOriginal, summary) : null;

  // Build annotation highlights for display
  const annotationRanges = annotations.length > 0 ? findAnnotationRanges(summary, annotations) : [];

  // Render diff view
  const renderDiffView = () => {
    if (!diffSegments) return null;
    return (
      <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap min-h-[200px]">
        {diffSegments.map((seg, i) =>
          seg.changed ? (
            <span
              key={i}
              className="bg-yellow-100 text-yellow-900 rounded px-0.5"
              title="用户修改的部分"
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </div>
    );
  };

  // Render annotation highlight view (read-only preview)
  const renderAnnotationPreview = () => {
    if (annotationRanges.length === 0) {
      return (
        <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-muted-foreground)]">
          {summary}
        </div>
      );
    }

    // Build highlighted text
    let result: React.ReactNode[] = [];
    let lastEnd = 0;

    for (const range of annotationRanges) {
      // Text before this annotation
      if (range.start > lastEnd) {
        result.push(
          <span key={`t-${lastEnd}`}>{summary.slice(lastEnd, range.start)}</span>
        );
      }

      // Check if this range overlaps with the previous — skip if so
      if (range.start < lastEnd) continue;

      const isHighlighted = hoveredAnnotation === range.annotationId;

      result.push(
        <span
          key={`a-${range.annotationId}-${range.start}`}
          className={`rounded px-0.5 cursor-pointer transition-colors ${
            isHighlighted
              ? "bg-blue-300 text-blue-900"
              : "bg-blue-100 text-blue-800"
          }`}
          onMouseEnter={() => setHoveredAnnotation(range.annotationId)}
          onMouseLeave={() => setHoveredAnnotation(null)}
          title={
            annotations.find((a) => a.id === range.annotationId)?.comment || ""
          }
        >
          {summary.slice(range.start, range.end)}
        </span>
      );

      lastEnd = range.end;
    }

    // Remaining text
    if (lastEnd < summary.length) {
      result.push(<span key={`t-${lastEnd}`}>{summary.slice(lastEnd)}</span>);
    }

    return (
      <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {result}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {hasChanges && (
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              showDiff
                ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                : "text-[var(--color-muted-foreground)] hover:bg-gray-100 border border-[var(--color-border)]"
            }`}
          >
            {showDiff ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showDiff ? "隐藏修改" : "显示修改"}
            {hasChanges && !showDiff && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400" />
            )}
          </button>
        )}

        <button
          onClick={() => {
            setShowAnnotationMode(!showAnnotationMode);
            if (showAnnotationMode) {
              setPendingSelection("");
              setCommentInput("");
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
            showAnnotationMode
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-100 border border-[var(--color-border)]"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {showAnnotationMode ? "退出批注" : "添加批注"}
        </button>

        {annotations.length > 0 && (
          <button
            onClick={() => setShowAnnotationPanel(!showAnnotationPanel)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              showAnnotationPanel
                ? "bg-blue-50 text-blue-600 border border-blue-200"
                : "text-[var(--color-muted-foreground)] hover:bg-gray-100 border border-[var(--color-border)]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            批注 ({annotations.length})
          </button>
        )}

        {hasChanges && (
          <span className="text-xs text-yellow-600 ml-1">
            已修改 AI 原始内容
          </span>
        )}
      </div>

      {/* Annotation mode instruction */}
      {showAnnotationMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span>
            在下方文本中<strong>选中要批注的文字</strong>，然后在输入框中填写批注内容
          </span>
        </div>
      )}

      {/* Main content area */}
      {showDiff ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50/30">
          <div className="px-4 py-2 border-b border-yellow-200 text-xs text-yellow-700 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            修改对比 — <span className="bg-yellow-100 px-1 rounded">黄色</span> = 用户修改的部分
          </div>
          {renderDiffView()}
        </div>
      ) : (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={summary}
            onChange={(e) => onChangeSummary(e.target.value)}
            onMouseUp={handleTextSelect}
            onTouchEnd={handleTextSelect}
            className={`w-full min-h-[350px] p-3 text-sm bg-white/80 focus:bg-white focus:outline-none resize-y rounded-lg border ${
              showAnnotationMode
                ? "border-blue-300 ring-1 ring-blue-200"
                : "border-transparent"
            }`}
            placeholder="AI 生成的会议总结会出现在这里，你可以自由修改..."
          />

          {/* Annotation highlight overlay — shown when not actively in annotation mode
              but annotations exist, as a read-only preview strip */}
        </div>
      )}

      {/* Pending annotation input */}
      {showAnnotationMode && pendingSelection && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 mb-1">选中文字：</p>
              <p className="text-sm text-blue-900 bg-blue-100/50 rounded px-2 py-1 line-clamp-3">
                &ldquo;{pendingSelection}&rdquo;
              </p>
            </div>
            <button
              onClick={() => {
                setPendingSelection("");
                setCommentInput("");
              }}
              className="p-1 rounded hover:bg-blue-100 text-blue-400 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              ref={commentInputRef}
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddAnnotation();
              }}
              placeholder="输入批注内容，如「优先级应为 P0」..."
              className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={handleAddAnnotation}
              disabled={!commentInput.trim()}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              添加
            </button>
          </div>
        </div>
      )}

      {/* Annotation highlight preview (below textarea, always visible when annotations exist) */}
      {annotations.length > 0 && !showDiff && (
        <div className="rounded-lg border border-[var(--color-border)]">
          <div className="px-3 py-1.5 border-b border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)] flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />
            批注预览 — <span className="bg-blue-100 text-blue-700 px-1 rounded">蓝色</span> = 有批注的文字（悬停查看）
          </div>
          {renderAnnotationPreview()}
        </div>
      )}

      {/* Annotation panel (list of all annotations) */}
      {showAnnotationPanel && annotations.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)]">
          <div className="px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="text-xs font-medium">所有批注 ({annotations.length})</span>
          </div>
          <div className="divide-y divide-[var(--color-border)] max-h-[300px] overflow-y-auto">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className={`p-3 text-sm transition-colors ${
                  hoveredAnnotation === ann.id ? "bg-blue-50" : ""
                }`}
                onMouseEnter={() => setHoveredAnnotation(ann.id)}
                onMouseLeave={() => setHoveredAnnotation(null)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-muted-foreground)] mb-1">
                      原文：
                    </p>
                    <p className="text-xs bg-blue-50 text-blue-800 rounded px-2 py-1 mb-1.5 line-clamp-2">
                      &ldquo;{ann.selectedText}&rdquo;
                    </p>
                    <p className="text-sm text-[var(--color-foreground)]">
                      {ann.comment}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                      {new Date(ann.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveAnnotation(ann.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
