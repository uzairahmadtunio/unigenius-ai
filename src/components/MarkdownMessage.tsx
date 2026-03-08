import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Copy, Check } from "lucide-react";
import "katex/dist/katex.min.css";

interface MarkdownMessageProps {
  content: string;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors text-gray-400 hover:text-gray-200 hover:bg-white/10"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
};

// Basic syntax coloring for common keywords
const highlightSyntax = (code: string, lang?: string) => {
  if (!lang) return code;

  const keywords: Record<string, string[]> = {
    cpp: ["#include", "using", "namespace", "int", "float", "double", "char", "bool", "void", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "class", "struct", "public", "private", "protected", "virtual", "override", "const", "static", "new", "delete", "true", "false", "nullptr", "auto", "template", "typename"],
    python: ["import", "from", "def", "class", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "in", "not", "and", "or", "True", "False", "None", "self", "lambda", "yield", "async", "await", "print"],
    javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "default", "async", "await", "try", "catch", "finally", "new", "this", "true", "false", "null", "undefined", "console", "typeof", "instanceof"],
  };

  const langKeys = keywords[lang] || keywords.javascript || [];
  if (!langKeys.length) return code;

  // Build regex-safe patterns
  const parts: { text: string; type: "keyword" | "string" | "comment" | "number" | "preprocessor" | "plain" }[] = [];
  
  // Simple tokenizer
  let remaining = code;
  while (remaining.length > 0) {
    // Check for single-line comment
    const commentMatch = remaining.match(/^(\/\/.*|#(?!include).*)/);
    if (commentMatch) {
      parts.push({ text: commentMatch[0], type: "comment" });
      remaining = remaining.slice(commentMatch[0].length);
      continue;
    }
    // Check for preprocessor
    const preMatch = remaining.match(/^(#include\s*[<"][^>"]*[>"]?)/);
    if (preMatch) {
      parts.push({ text: preMatch[0], type: "preprocessor" });
      remaining = remaining.slice(preMatch[0].length);
      continue;
    }
    // Check for string
    const strMatch = remaining.match(/^("[^"]*"|'[^']*'|`[^`]*`)/);
    if (strMatch) {
      parts.push({ text: strMatch[0], type: "string" });
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }
    // Check for number
    const numMatch = remaining.match(/^(\b\d+\.?\d*\b)/);
    if (numMatch) {
      parts.push({ text: numMatch[0], type: "number" });
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }
    // Check for keyword
    const kwPattern = new RegExp(`^\\b(${langKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`);
    const kwMatch = remaining.match(kwPattern);
    if (kwMatch) {
      parts.push({ text: kwMatch[0], type: "keyword" });
      remaining = remaining.slice(kwMatch[0].length);
      continue;
    }
    // Plain character
    parts.push({ text: remaining[0], type: "plain" });
    remaining = remaining.slice(1);
  }

  return parts;
};

const CodeBlock = ({ language, code }: { language?: string; code: string }) => {
  const lang = language?.replace(/^language-/, "") || "";
  const lines = code.split("\n");

  return (
    <div className="rounded-xl overflow-hidden my-2.5 border border-white/5">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border-b border-white/5">
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{lang || "code"}</span>
        <CopyButton text={code} />
      </div>
      {/* Code area with line numbers */}
      <div className="bg-[#1a1a2e] overflow-x-auto scrollbar-none">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => {
              const highlighted = highlightSyntax(line, lang);
              return (
                <tr key={i} className="leading-relaxed">
                  <td className="px-3 py-0 text-right select-none text-[10px] font-mono text-gray-600 w-8 align-top" style={{ minWidth: "2rem" }}>{i + 1}</td>
                  <td className="px-2 py-0 text-xs font-mono whitespace-pre">
                    {typeof highlighted === "string" ? (
                      <span className="text-[#d4d4d4]">{highlighted}</span>
                    ) : (
                      highlighted.map((part, j) => (
                        <span key={j} className={colorMap[part.type]}>{part.text}</span>
                      ))
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const colorMap: Record<string, string> = {
  keyword: "text-[#569cd6]",
  string: "text-[#ce9178]",
  comment: "text-[#6a9955]",
  number: "text-[#b5cea8]",
  preprocessor: "text-[#c586c0]",
  plain: "text-[#d4d4d4]",
};

const MarkdownMessage = ({ content }: MarkdownMessageProps) => {
  if (!content) return <span>…</span>;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ inline, className, children, ...props }: any) {
          const code = String(children).replace(/\n$/, "");
          if (inline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-accent-foreground" {...props}>
                {children}
              </code>
            );
          }
          return <CodeBlock language={className} code={code} />;
        },
        pre({ children }) { return <>{children}</>; },
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
