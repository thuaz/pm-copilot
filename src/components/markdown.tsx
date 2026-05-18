"use client";

import ReactMarkdown from "react-markdown";

export function MD({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 pb-2 border-b border-[var(--color-border)]">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2 text-[var(--color-foreground)]">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-medium mt-4 mb-1.5 text-[var(--color-foreground)]">{children}</h3>,
        p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-[var(--color-foreground)]">{children}</strong>,
        code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
        blockquote: ({ children }) => <blockquote className="border-l-3 border-[var(--color-primary)] pl-3 my-2 text-[var(--color-muted-foreground)]">{children}</blockquote>,
        hr: () => <hr className="my-4 border-[var(--color-border)]" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
