import { useState, useRef, useCallback, useMemo } from "react";
import { Code, Sparkles, Loader2, Bot, ImagePlus, X, Copy, Check, RotateCcw } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { lintCppCode } from "@/lib/cpp-linter";
import CodeLintWarnings from "@/components/CodeLintWarnings";
import ThinkingAnimation from "@/components/ThinkingAnimation";
import CodeDiffView from "@/components/CodeDiffView";

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
  const [errorImage, setErrorImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [lintDismissed, setLintDismissed] = useState(false);
  const [snapshotCode, setSnapshotCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lintErrors = useMemo(() => {
    if (language !== "cpp") return [];
    return lintCppCode(code);
  }, [code, language]);

  const extractCode = useCallback((text: string) => {
    const match = text.match(/```[\w]*\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }, []);

  const extractError = useCallback((text: string) => {
    const beforeCode = text.split(/```[\w]*\n/)[0].trim();
    return beforeCode.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
  }, []);

  const analyzeCode = async (imageData?: string) => {
    if (!code.trim() && !imageData) { toast.error("Write some code or upload an error image!"); return; }

    // Non-blocking: show lint as notification only, don't block analyze
    if (language === "cpp" && lintErrors.length > 0 && !imageData) {
      setLintDismissed(false);
      toast.info(`${lintErrors.length} lint issue(s) detected — analyzing with AI anyway...`);
    }

    setSnapshotCode(code);
    setIsAnalyzing(true);
    setAnalysis("");
    setFetchError(false);

    try {
      const body: any = { code, language };
      if (imageData) body.errorImage = imageData;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
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
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setFetchError(true);
        toast.error("Network error — check your connection and retry.");
      } else {
        toast.error(err.message || "Analysis failed");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setErrorImage(reader.result as string);
      toast.success("Error image attached! Click Analyze to debug.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          setErrorImage(reader.result as string);
          toast.success("Image pasted! Click Analyze to debug.");
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const copyFixedCode = async () => {
    const fixed = extractCode(analysis);
    if (fixed) {
      await navigator.clipboard.writeText(fixed);
    } else {
      await navigator.clipboard.writeText(analysis);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied!");
  };

  const fixedCode = extractCode(analysis);
  const errorMsg = extractError(analysis);

  return (
    <PageShell
      title="Code Lab"
      subtitle={`${department ? departmentInfo[department].name : "SE"} IDE`}
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Code className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-4" onPaste={handlePaste}>
        {/* Editor + Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              {(["cpp", "python", "javascript"] as const).map((lang) => (
                <Button
                  key={lang}
                  variant={language === lang ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl text-xs ${language === lang ? "gradient-primary text-primary-foreground" : ""}`}
                  onClick={() => {
                    setLanguage(lang);
                    setCode(lang === "cpp" ? defaultCode.se.code : lang === "python" ? defaultCode.ai.code : "// JavaScript\nconsole.log('Hello UniGenius!');\n");
                  }}
                >
                  {lang === "cpp" ? "C++" : lang === "python" ? "Python" : "JavaScript"}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={() => fileInputRef.current?.click()} title="Upload error screenshot">
                <ImagePlus className="w-3.5 h-3.5" /> Screenshot
              </Button>
              <Button
                onClick={() => analyzeCode(errorImage || undefined)}
                disabled={isAnalyzing}
                size="sm"
                className="rounded-xl gradient-primary text-primary-foreground gap-1.5 text-xs px-4"
              >
                {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </div>

          {/* Non-blocking Lint Warnings */}
          {!lintDismissed && (
            <CodeLintWarnings errors={lintErrors} onDismiss={() => setLintDismissed(true)} />
          )}

          <div className="glass rounded-2xl overflow-hidden border border-border/50" style={{ height: "350px" }}>
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 16 }, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: "on" }}
            />
          </div>

          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

          {errorImage && (
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <img src={errorImage} alt="Error" className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Error image attached</p>
                <p className="text-xs text-muted-foreground">Will be analyzed with your code</p>
              </div>
              <button onClick={() => setErrorImage(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Analysis Result — Split Diff View */}
        <div className="glass rounded-2xl p-4 overflow-y-auto" style={{ maxHeight: "450px" }}>
          {fetchError && !analysis ? (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground">Connection Failed</p>
                <p className="text-sm text-muted-foreground mt-1">Network error aaya hai. Apna internet check karein.</p>
              </div>
              <Button onClick={() => analyzeCode(errorImage || undefined)} className="rounded-xl gap-2" variant="outline">
                <RotateCcw className="w-4 h-4" /> Retry
              </Button>
            </div>
          ) : fixedCode ? (
            <CodeDiffView
              originalCode={snapshotCode}
              fixedCode={fixedCode}
              errorMsg={errorMsg}
              language={language}
              copied={copied}
              onCopy={copyFixedCode}
            />
          ) : analysis ? (
            <div className="text-sm text-foreground leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Analyzing...</span>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">{analysis}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-8">
              <Code className="w-10 h-10 text-muted-foreground/30" />
              <div>
                <p className="font-display font-semibold text-foreground">AI Code Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">Write code and click "Analyze" for split-screen error detection.</p>
                <p className="text-xs text-muted-foreground mt-2">📷 Paste or upload error screenshots for instant debugging!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default CodeLabPage;
