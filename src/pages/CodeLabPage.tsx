import { useState, useRef } from "react";
import { Code, Sparkles, Loader2, Bot } from "lucide-react";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import PageShell from "@/components/PageShell";
import MarkdownMessage from "@/components/MarkdownMessage";
import { toast } from "sonner";

const defaultCode: Record<string, { lang: string; code: string }> = {
  se: { lang: "cpp", code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, UniGenius!" << endl;\n    return 0;\n}\n` },
  cs: { lang: "cpp", code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, UniGenius!" << endl;\n    return 0;\n}\n` },
  ai: { lang: "python", code: `# Welcome to UniGenius Code Lab\nimport numpy as np\n\ndef hello():\n    print("Hello, UniGenius!")\n\nhello()\n` },
};

const CodeLabPage = () => {
  const { department } = useDepartment();
  const dept = department || "se";
  const config = defaultCode[dept];
  const [code, setCode] = useState(config.code);
  const [language, setLanguage] = useState(config.lang);
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeCode = async () => {
    if (!code.trim()) { toast.error("Write some code first!"); return; }
    setIsAnalyzing(true);
    setAnalysis("");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ code, language }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              result += content;
              setAnalysis(result);
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <PageShell
      title="Code Lab"
      subtitle={`${department ? departmentInfo[department].name : "SE"} IDE`}
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Code className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Editor Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={language === "cpp" ? "default" : "outline"}
                size="sm"
                className={`rounded-xl text-xs ${language === "cpp" ? "gradient-primary text-primary-foreground" : ""}`}
                onClick={() => { setLanguage("cpp"); setCode(defaultCode.se.code); }}
              >
                C++
              </Button>
              <Button
                variant={language === "python" ? "default" : "outline"}
                size="sm"
                className={`rounded-xl text-xs ${language === "python" ? "gradient-primary text-primary-foreground" : ""}`}
                onClick={() => { setLanguage("python"); setCode(defaultCode.ai.code); }}
              >
                Python
              </Button>
              <Button
                variant={language === "javascript" ? "default" : "outline"}
                size="sm"
                className={`rounded-xl text-xs ${language === "javascript" ? "gradient-primary text-primary-foreground" : ""}`}
                onClick={() => { setLanguage("javascript"); setCode("// JavaScript\nconsole.log('Hello UniGenius!');\n"); }}
              >
                JavaScript
              </Button>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden border border-border/50" style={{ height: "450px" }}>
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
              }}
            />
          </div>

          <Button
            onClick={analyzeCode}
            disabled={isAnalyzing}
            className="w-full rounded-xl gradient-primary text-primary-foreground gap-2"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isAnalyzing ? "Analyzing..." : "Analyze with UniGenius"}
          </Button>
        </div>

        {/* Analysis Panel */}
        <div className="glass rounded-2xl p-6 overflow-y-auto" style={{ maxHeight: "560px" }}>
          {analysis ? (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="text-sm text-foreground leading-relaxed min-w-0">
                <MarkdownMessage content={analysis} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
              <Code className="w-12 h-12 text-muted-foreground/30" />
              <div>
                <p className="font-display font-semibold text-foreground">AI Code Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">Write your code and click "Analyze" for a detailed AI review with bug detection and optimization tips.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default CodeLabPage;
