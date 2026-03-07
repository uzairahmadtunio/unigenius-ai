import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownMessageProps {
  content: string;
}

const MarkdownMessage = ({ content }: MarkdownMessageProps) => {
  if (!content) return <span>…</span>;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ inline, className, children, ...props }: any) {
          if (inline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-accent-foreground" {...props}>
                {children}
              </code>
            );
          }
          return (
            <pre className="bg-[hsl(var(--muted))] rounded-lg p-3 my-2 overflow-x-auto">
              <code className="text-xs font-mono text-foreground" {...props}>{children}</code>
            </pre>
          );
        },
        p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
        ul({ children }) { return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>; },
        h1({ children }) { return <h1 className="text-lg font-bold mb-2">{children}</h1>; },
        h2({ children }) { return <h2 className="text-base font-bold mb-2">{children}</h2>; },
        h3({ children }) { return <h3 className="text-sm font-bold mb-1">{children}</h3>; },
        strong({ children }) { return <strong className="font-semibold">{children}</strong>; },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border border-border rounded">{children}</table>
            </div>
          );
        },
        th({ children }) { return <th className="border border-border px-2 py-1 bg-muted font-semibold text-left">{children}</th>; },
        td({ children }) { return <td className="border border-border px-2 py-1">{children}</td>; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownMessage;
