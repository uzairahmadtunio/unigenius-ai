import { useState, useRef, useCallback, useMemo } from "react";
import { Code, Sparkles, Loader2, Bot, ImagePlus, X, Copy, Check, RotateCcw, Terminal, Play } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { lintCppCode } from "@/lib/cpp-linter";
import CodeLintWarnings from "@/components/CodeLintWarnings";
import ThinkingAnimation from "@/components/ThinkingAnimation";
import CodeDiffView from "@/components/CodeDiffView";
import { notifyAiTier } from "@/lib/ai-tier-notifier";
import { useAdmin } from "@/hooks/use-admin";
const defaultCode: Record<string, { lang: string; code: string }> = {
  se: { lang: "cpp", code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, UniGenius!" << endl;\n    return 0;\n}\n` },
  cs: { lang: "cpp", code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, UniGenius!" << endl;\n    return 0;\n}\n` },
  ai: { lang: "python", code: `# Welcome to UniGenius Code Lab\nimport numpy as np\n\ndef hello():\n    print("Hello, UniGenius!")\n\nhello()\n` },
};

const CodeLabPage = () => {
  const { department } = useDepartment();
  const { isAdmin } = useAdmin();
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
  const [consoleOutput, setConsoleOutput] = useState<{ type: "success" | "error" | "info"; text: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"console" | "diff">("console");
  const [stdinInput, setStdinInput] = useState("");
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

  const simulateExecution = useCallback((sourceCode: string, lang: string, stdin: string): { stdout: string[]; stderr: string[] } => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const inputQueue = stdin.split("\n").filter(l => l.trim() !== "");
    let inputIndex = 0;

    try {
      if (lang === "javascript") {
        const logs: string[] = [];
        const errors: string[] = [];
        const mockConsole = {
          log: (...args: any[]) => logs.push(args.map(String).join(" ")),
          error: (...args: any[]) => errors.push(args.map(String).join(" ")),
          warn: (...args: any[]) => logs.push("[warn] " + args.map(String).join(" ")),
          info: (...args: any[]) => logs.push(args.map(String).join(" ")),
        };
        try {
          const fn = new Function("console", sourceCode);
          fn(mockConsole);
          stdout.push(...logs);
          stderr.push(...errors);
        } catch (e: any) {
          stderr.push(e.message || "Runtime error");
        }
      } else if (lang === "python") {
        // Build variable map from input() calls
        const variables: Record<string, string> = {};
        const lines = sourceCode.split("\n");
        for (const line of lines) {
          const inputMatch = line.match(/(\w+)\s*=\s*(?:int|float|str)?\s*\(?\s*input\s*\(\s*(?:["'`](.*?)["'`])?\s*\)\s*\)?/);
          if (inputMatch) {
            const varName = inputMatch[1];
            const prompt = inputMatch[2] || "";
            if (prompt) stdout.push(prompt);
            const val = inputQueue[inputIndex++] || "0";
            variables[varName] = val;
            continue;
          }
          const printMatch = line.match(/print\s*\(\s*(?:f?["'`](.*?)["'`]|([^)]+))\s*\)/);
          if (printMatch) {
            let output = printMatch[1] || printMatch[2] || "";
            // Simple variable substitution
            for (const [k, v] of Object.entries(variables)) {
              output = output.replace(new RegExp(`\\{${k}\\}`, "g"), v);
              output = output.replace(new RegExp(`\\b${k}\\b`, "g"), v);
            }
            stdout.push(output);
          }
        }
        if (stdout.length === 0 && !sourceCode.includes("print")) {
          stdout.push("(No print output detected)");
        }
      } else if (lang === "cpp") {
        // Build variable map from cin
        const variables: Record<string, string> = {};
        const lines = sourceCode.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip comments
          const noComment = trimmed.replace(/\/\/.*$/, "");

          // Handle cin >> var1 >> var2 ...
          if (noComment.includes("cin")) {
            const cinMatch = noComment.match(/cin\s*>>\s*(.*)/);
            if (cinMatch) {
              let rest = cinMatch[1].replace(/;\s*$/, "");
              const vars = rest.split(/\s*>>\s*/);
              for (const v of vars) {
                const varName = v.trim();
                if (varName) {
                  variables[varName] = inputQueue[inputIndex++] || "0";
                }
              }
            }
            continue;
          }

          // Handle cout
          if (noComment.includes("cout")) {
            const coutMatch = noComment.match(/cout\s*<<\s*(.*)/);
            if (!coutMatch) continue;
            let rest = coutMatch[1].replace(/;\s*$/, "");
            const parts = rest.split(/\s*<<\s*/);
            let lineOutput = "";
            for (const part of parts) {
              const trimPart = part.trim();
              if (trimPart === "endl" || trimPart === "\"\\n\"" || trimPart === "'\\n'") {
                lineOutput += "\n";
              } else if (/^"(.*)"$/.test(trimPart)) {
                lineOutput += trimPart.slice(1, -1);
              } else if (/^'(.)'$/.test(trimPart)) {
                lineOutput += trimPart.slice(1, -1);
              } else if (variables[trimPart] !== undefined) {
                lineOutput += variables[trimPart];
              } else if (trimPart) {
                lineOutput += `[${trimPart}]`;
              }
            }
            if (lineOutput) {
              const outputLines = lineOutput.split("\n").filter((l, i, arr) => i < arr.length - 1 || l !== "");
              stdout.push(...outputLines);
            }
          }
        }
        if (stdout.length === 0 && sourceCode.includes("cout")) {
          stdout.push("(cout detected but could not parse output)");
        }
        if (sourceCode.includes("return 0")) {
          stdout.push("Process exited with code 0");
        }
      }
    } catch (e: any) {
      stderr.push(e.message || "Runtime error");
    }

    return { stdout, stderr };
  }, []);

  const analyzeCode = async (imageData?: string) => {
    if (!code.trim() && !imageData) { toast.error("Write some code or upload an error image!"); return; }

    if (language === "cpp" && lintErrors.length > 0 && !imageData) {
      setLintDismissed(false);
      toast.info(`${lintErrors.length} lint issue(s) detected — analyzing with AI anyway...`);
    }

    setSnapshotCode(code);
    setIsAnalyzing(true);
    setAnalysis("");
    setFetchError(false);
    setActiveTab("console");
    setConsoleOutput([{ type: "info", text: `> Running ${language === "cpp" ? "C++" : language === "python" ? "Python" : "JavaScript"} code...` }]);

    // Step 1: Simulate execution
    await new Promise(r => setTimeout(r, 300));
    const { stdout, stderr } = simulateExecution(code, language, stdinInput);

    setConsoleOutput(prev => {
      const next = [...prev];
      if (stderr.length > 0) {
        stderr.forEach(line => next.push({ type: "error", text: `stderr: ${line}` }));
      }
      if (stdout.length > 0) {
        stdout.forEach(line => next.push({ type: "success", text: line }));
      }
      if (stdout.length === 0 && stderr.length === 0) {
        next.push({ type: "info", text: "(No output)" });
      }
      next.push({ type: "info", text: `> Sending to AI for analysis...` });
      return next;
    });

    // Step 2: AI analysis
    try {
      const body: any = { code, language };
      if (imageData) body.errorImage = imageData;

      let resp: Response | null = null;
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
        });

        if (resp.status === 429 && attempt < maxRetries - 1) {
          setConsoleOutput(prev => [...prev, { type: "info", text: `> Rate limited, retrying in 2s... (${attempt + 1}/${maxRetries})` }]);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        break;
      }

      if (!resp || !resp.ok) {
        const err = await resp?.json().catch(() => ({})) || {};
        throw new Error(err.error || "Analysis failed");
      }
      if (!resp.body) throw new Error("No response body");
      notifyAiTier(resp, isAdmin);

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

      setConsoleOutput(prev => [...prev, { type: "success", text: "✓ Analysis complete" }]);
    } catch (err: any) {
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setFetchError(true);
        setConsoleOutput(prev => [...prev, { type: "error", text: "✗ Network error — check your connection" }]);
        toast.error("Network error — check your connection and retry.");
      } else {
        setConsoleOutput(prev => [...prev, { type: "error", text: `✗ ${err.message}` }]);
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

  const clearConsole = () => setConsoleOutput([]);

  const fixedCode = extractCode(analysis);
  const errorMsg = extractError(analysis);

  return (
    <PageShell
      title="Code Lab"
      subtitle={`${department ? departmentInfo[department].name : "SE"} IDE`}
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Code className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-0" onPaste={handlePaste}>
        {/* Top toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
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
              {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {isAnalyzing ? "Analyzing..." : "Run & Analyze"}
            </Button>
          </div>
        </div>

        {!lintDismissed && (
          <CodeLintWarnings errors={lintErrors} onDismiss={() => setLintDismissed(true)} />
        )}

        {/* Split-screen: Editor (left/top) + Console/Output (right/bottom) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-border/50 rounded-2xl overflow-hidden">
          {/* Code Editor Panel */}
          <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-border/50">
            <div className="flex items-center gap-2 px-3 py-2 bg-background/80 border-b border-border/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">
                main.{language === "cpp" ? "cpp" : language === "python" ? "py" : "js"}
              </span>
            </div>
            <div style={{ height: "340px" }}>
              <Editor
                height="100%"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v || "")}
                options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 12 }, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: "on", lineNumbers: "on", renderLineHighlight: "all", cursorBlinking: "smooth" }}
              />
            </div>
            {/* Stdin Input */}
            <div className="border-t border-border/30 bg-background/80 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">stdin input</span>
              </div>
              <textarea
                value={stdinInput}
                onChange={(e) => setStdinInput(e.target.value)}
                placeholder="Enter input values (one per line)..."
                className="w-full bg-[hsl(220,15%,8%)] text-emerald-400 font-mono text-xs rounded-md border border-border/30 px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                rows={2}
              />
            </div>
          </div>

          {/* Console / Output Panel */}
          <div className="flex flex-col">
            {/* Tabs */}
            <div className="flex items-center gap-0 bg-background/80 border-b border-border/30">
              <button
                onClick={() => setActiveTab("console")}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === "console" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Terminal className="w-3 h-3 inline mr-1.5" />Console
              </button>
              <button
                onClick={() => setActiveTab("diff")}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === "diff" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Code className="w-3 h-3 inline mr-1.5" />AI Analysis
              </button>
              {activeTab === "console" && consoleOutput.length > 0 && (
                <button onClick={clearConsole} className="ml-auto mr-3 text-xs text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              )}
              {activeTab === "diff" && analysis && (
                <button onClick={copyFixedCode} className="ml-auto mr-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            {/* Panel Content */}
            <div className="bg-[hsl(220,15%,8%)] overflow-y-auto" style={{ height: "370px" }}>
              {activeTab === "console" ? (
                <div className="p-3 font-mono text-xs space-y-1">
                  {consoleOutput.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-2 py-16">
                      <Terminal className="w-8 h-8" />
                      <p className="text-xs">Console output will appear here</p>
                      <p className="text-[10px]">Click "Run & Analyze" to start</p>
                    </div>
                  ) : (
                    consoleOutput.map((line, i) => (
                      <div key={i} className={`leading-relaxed ${
                        line.type === "success" ? "text-emerald-400" :
                        line.type === "error" ? "text-red-400" :
                        "text-blue-400"
                      }`}>
                        {line.text}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-4 overflow-y-auto">
                  {fetchError && !analysis ? (
                    <div className="flex flex-col items-center justify-center text-center gap-4 py-8">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <X className="w-6 h-6 text-destructive" />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-foreground text-sm">Connection Failed</p>
                        <p className="text-xs text-muted-foreground mt-1">Network error. Check your internet.</p>
                      </div>
                      <Button onClick={() => analyzeCode(errorImage || undefined)} className="rounded-xl gap-2" variant="outline" size="sm">
                        <RotateCcw className="w-3 h-3" /> Retry
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
                        <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">Analyzing...</span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs font-mono">{analysis}</p>
                    </div>
                  ) : isAnalyzing ? (
                    <ThinkingAnimation message="Analyzing code..." />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center gap-3 py-12">
                      <Code className="w-8 h-8 text-muted-foreground/30" />
                      <div>
                        <p className="font-display font-semibold text-foreground text-sm">AI Code Analysis</p>
                        <p className="text-xs text-muted-foreground mt-1">Write code and click "Run & Analyze"</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

        {errorImage && (
          <div className="glass rounded-xl p-3 flex items-center gap-3 mt-3">
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
    </PageShell>
  );
};

export default CodeLabPage;
