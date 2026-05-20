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
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => <a href={href} className="text-[var(--color-primary)] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
        code: ({ className, children }) => {
          if (className) {
            return <code className={className}>{children}</code>;
          }
          return <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
        },
        pre: ({ children }) => <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto text-sm font-mono my-2">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-3 border-[var(--color-primary)] pl-3 my-2 text-[var(--color-muted-foreground)]">{children}</blockquote>,
        hr: () => <hr className="my-4 border-[var(--color-border)]" />,
        table: ({ children }) => <table className="w-full border-collapse my-2 text-sm">{children}</table>,
        thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-[var(--color-border)]">{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-medium text-[var(--color-foreground)]">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2">{children}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
