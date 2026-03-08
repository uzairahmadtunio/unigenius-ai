import { useMemo } from "react";
import { Copy, Check, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeDiffViewProps {
  originalCode: string;
  fixedCode: string;
  errorMsg: string;
  language: string;
  copied: boolean;
  onCopy: () => void;
}

const CodeDiffView = ({ originalCode, fixedCode, errorMsg, language, copied, onCopy }: CodeDiffViewProps) => {
  const diffLines = useMemo(() => {
    const origLines = originalCode.split("\n");
    const fixedLines = fixedCode.split("\n");
    const maxLen = Math.max(origLines.length, fixedLines.length);
    
    const result: { original: string; fixed: string; changed: boolean }[] = [];
    for (let i = 0; i < maxLen; i++) {
      const orig = origLines[i] ?? "";
      const fix = fixedLines[i] ?? "";
      result.push({ original: orig, fixed: fix, changed: orig.trim() !== fix.trim() });
    }
    return result;
  }, [originalCode, fixedCode]);

  return (
    <div className="space-y-3">
      {/* Error explanation */}
      {errorMsg && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bot className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <p className="text-sm text-foreground leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Split diff view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-xl overflow-hidden border border-border/30">
        {/* Left: Original */}
        <div className="bg-[#1e1e1e] border-r border-border/20">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/20 bg-[#252526]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400">❌ Your Code</span>
          </div>
          <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={`px-1 -mx-1 ${line.changed ? "bg-red-500/15 border-l-2 border-red-500" : ""}`}
              >
                <span className="inline-block w-6 text-right mr-2 text-muted-foreground/40 select-none text-[10px]">{i + 1}</span>
                <span className={line.changed ? "text-red-400" : "text-muted-foreground/70"}>{line.original || " "}</span>
              </div>
            ))}
          </pre>
        </div>

        {/* Right: Fixed */}
        <div className="bg-[#1e1e1e]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/20 bg-[#252526]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400">✅ Corrected Code</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-green-400 hover:text-green-300 hover:bg-green-500/10" onClick={onCopy}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={`px-1 -mx-1 ${line.changed ? "bg-green-500/15 border-l-2 border-green-500" : ""}`}
              >
                <span className="inline-block w-6 text-right mr-2 text-muted-foreground/40 select-none text-[10px]">{i + 1}</span>
                <span className={line.changed ? "text-green-400 font-medium" : "text-muted-foreground/70"}>{line.fixed || " "}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CodeDiffView;
