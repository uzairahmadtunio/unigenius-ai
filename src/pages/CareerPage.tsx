import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Code, FileText, Mic, MicOff, Send, Bot, User,
  Play, CheckCircle, XCircle, Upload, FileUp, Award, Target,
  Lightbulb, ArrowRight, RefreshCw, Copy, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import MarkdownMessage from "@/components/MarkdownMessage";
import { fireCelebration, recordCareerActivity, checkAndAwardBadges } from "@/lib/career-points";

type ActiveTab = "interview" | "dsa" | "cv";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// ─── Interview Prep ───────────────────────────────────────────────
const InterviewPrep = () => {
  const { user } = useAuth();
  const [semester, setSemester] = useState("1");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [input, setInput] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const semesterTopics: Record<string, string> = {
    "1": "Programming Fundamentals, ICT, Calculus, Discrete Structures",
    "2": "OOP, Data Structures, Linear Algebra, Digital Logic",
    "3": "Algorithms, Database Systems, Computer Architecture, Software Requirements",
    "4": "Operating Systems, Computer Networks, Software Design & Architecture, Probability & Statistics",
    "5": "Software Construction, Web Engineering, Software Quality Engineering, Information Security",
    "6": "Software Project Management, Cloud Computing, Machine Learning, DevOps",
    "7": "Deep Learning, NLP, Computer Vision, FYP-I",
    "8": "Network Security, FYP-II, Electives",
  };

  const startInterview = async () => {
    const topics = semesterTopics[semester] || "general SE topics";
    const systemMsg = {
      role: "system",
      content: `You are a strict but encouraging technical interviewer for Software Engineering positions. 
The candidate is in Semester ${semester}, so focus on these topics: ${topics}.

RULES:
- Ask ONE technical question at a time
- Wait for the candidate's response before asking the next
- Start with easier questions, then increase difficulty
- After each answer, give brief feedback (correct/partially correct/incorrect) with explanation
- Mix theoretical questions with practical/coding questions
- Use a professional but friendly tone
- After 5-6 questions, give a final assessment with score out of 10 and areas to improve

Start by greeting the candidate and asking your first question.`
    };

    setMessages([]);
    setIsLoading(true);

    try {
      const apiMessages = [systemMsg];
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) throw new Error("Failed to start interview");

      let assistantText = "";
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "" || line.startsWith(":")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) assistantText += c;
          } catch {}
        }
      }

      setMessages([{ role: "assistant", content: assistantText }]);
    } catch (e: any) {
      toast.error(e.message || "Failed to start");
    } finally {
      setIsLoading(false);
    }
  };

  const sendAnswer = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg = { role: "user" as const, content: msg };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    try {
      const topics = semesterTopics[semester] || "general SE topics";
      const apiMessages = [
        {
          role: "system",
          content: `You are a technical interviewer for SE roles. Candidate is in Semester ${semester}, topics: ${topics}. Ask ONE question at a time, give feedback on answers, increase difficulty gradually.`
        },
        ...newMsgs,
      ];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) throw new Error("Failed");

      let assistantText = "";
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "" || line.startsWith(":")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) {
              assistantText += c;
              const snap = assistantText;
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snap } : m));
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        toast.success("Voice recorded! (Transcription simulated)");
        // In a production app, you'd send this to a transcription service
        setInput(prev => prev + " [Voice response recorded]");
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.info("Recording... Click again to stop");
    } catch {
      toast.error("Microphone access denied");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Semester Focus</label>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="rounded-xl w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6,7,8].map(s => (
                <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={startInterview} disabled={isLoading} className="rounded-xl gap-2 gradient-primary">
          <Play className="w-4 h-4" />
          {messages.length > 0 ? "Restart Interview" : "Start Mock Interview"}
        </Button>
      </div>

      {/* Topics Preview */}
      <div className="glass rounded-xl px-4 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Topics: </span>
        {semesterTopics[semester]}
      </div>

      {/* Chat Area */}
      {messages.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-4 max-h-[400px] overflow-y-auto">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user" ? "gradient-primary text-primary-foreground" : "glass text-foreground"
              }`}>
                {msg.role === "assistant" ? <MarkdownMessage content={msg.content} /> : msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      {messages.length > 0 && (
        <div className="glass rounded-2xl p-2 flex gap-2 items-end">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-xl flex-shrink-0 ${isRecording ? "bg-destructive/20 text-destructive" : ""}`}
            onClick={toggleRecording}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
            placeholder="Type your answer or use voice..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[40px] max-h-[120px]"
            rows={1}
          />
          <Button size="icon" className="rounded-xl gradient-primary flex-shrink-0" onClick={() => sendAnswer()} disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── DSA Practice ─────────────────────────────────────────────────
const DSAPractice = () => {
  const [problem, setProblem] = useState<string>("");
  const [code, setCode] = useState("// Write your solution here\n\n");
  const [analysis, setAnalysis] = useState("");
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");

  const fetchProblem = async () => {
    setLoadingProblem(true);
    setProblem("");
    setAnalysis("");
    setCode("// Write your solution here\n\n");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a DSA problem generator for Software Engineering students. Generate a ${difficulty} difficulty Data Structures or Algorithms problem similar to LeetCode.

FORMAT:
## Problem Title
**Difficulty:** ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
**Category:** [Array/LinkedList/Tree/Graph/DP/etc.]

### Problem Statement
[Clear problem description]

### Examples
**Input:** ...
**Output:** ...
**Explanation:** ...

### Constraints
- ...

### Hints
1. [First hint]
2. [Second hint]`
            },
            { role: "user", content: `Generate a ${difficulty} DSA problem. Make it unique and practical.` }
          ],
        }),
      });

      if (!resp.ok) throw new Error("Failed");
      let text = "";
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try { const c = JSON.parse(json).choices?.[0]?.delta?.content; if (c) text += c; } catch {}
        }
      }
      setProblem(text);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate problem");
    } finally {
      setLoadingProblem(false);
    }
  };

  const analyzeSolution = async () => {
    if (!code.trim() || code.trim() === "// Write your solution here") {
      toast.error("Write your solution first!");
      return;
    }
    setLoadingAnalysis(true);
    setAnalysis("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a DSA expert and code reviewer. Analyze the given solution for the problem. Provide:

1. **Correctness**: Is the solution correct? Any edge cases missed?
2. **Time Complexity**: Explain step-by-step how you derive the Big-O. Use LaTeX: $O(n)$, $O(n \\log n)$, etc.
3. **Space Complexity**: Same detailed analysis with LaTeX notation.
4. **Optimization**: Can it be improved? Show the optimized version if applicable.
5. **Code Quality**: Comments on style, naming, readability.

Use markdown formatting and LaTeX for all complexity expressions.`
            },
            { role: "user", content: `**Problem:**\n${problem}\n\n**My Solution:**\n\`\`\`\n${code}\n\`\`\`` }
          ],
        }),
      });

      if (!resp.ok) throw new Error("Failed");
      let text = "";
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) {
              text += c;
              const snap = text;
              setAnalysis(snap);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Difficulty</label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="rounded-xl w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">🟢 Easy</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="hard">🔴 Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchProblem} disabled={loadingProblem} className="rounded-xl gap-2 gradient-primary">
          {loadingProblem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
          {problem ? "New Problem" : "Problem of the Day"}
        </Button>
      </div>

      {/* Problem Display */}
      {problem && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
          <MarkdownMessage content={problem} />
        </motion.div>
      )}

      {/* Code Editor */}
      {problem && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground text-sm">Your Solution</h3>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied!"); }}
            >
              <Copy className="w-3 h-3" /> Copy
            </Button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full glass rounded-xl p-4 font-mono text-sm text-foreground min-h-[200px] resize-y outline-none focus:ring-2 focus:ring-primary/30"
            spellCheck={false}
          />
          <Button onClick={analyzeSolution} disabled={loadingAnalysis} className="rounded-xl gap-2 gradient-primary">
            {loadingAnalysis ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            Analyze Solution
          </Button>
        </motion.div>
      )}

      {/* Analysis */}
      {analysis && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 space-y-2">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> AI Analysis
          </h3>
          <MarkdownMessage content={analysis} />
        </motion.div>
      )}
    </div>
  );
};

// ─── CV Optimizer ─────────────────────────────────────────────────
const CVOptimizer = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>("");
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setFile(f);
    setAnalysis("");
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result as string);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const analyzeCV = async () => {
    if (!fileDataUrl) { toast.error("Upload a CV first"); return; }
    setIsAnalyzing(true);
    setAnalysis("");

    try {
      const parts: any[] = [];

      if (file?.type === "application/pdf") {
        parts.push({ type: "image_url", image_url: { url: fileDataUrl } });
      } else if (file?.type.startsWith("image/")) {
        parts.push({ type: "image_url", image_url: { url: fileDataUrl } });
      }

      parts.push({
        type: "text",
        text: `Analyze this CV/Resume for a Software Engineering student or graduate. Provide:

## CV Score: [X/100]

### ✅ Strengths
- ...

### ❌ Weaknesses  
- ...

### 🔧 Improvement Tips
1. ...
2. ...
3. ...

### 📋 SE-Specific Recommendations
- Technical skills to add
- Projects to highlight
- Keywords for ATS optimization
- Format and layout feedback

### 🎯 Overall Assessment
Brief summary of the CV quality and next steps.

Be specific, actionable, and encouraging. Use the actual content from the CV.`
      });

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are an expert CV reviewer specializing in Software Engineering careers. Analyze uploaded resumes thoroughly and provide actionable feedback with a numerical score."
            },
            { role: "user", content: parts }
          ],
        }),
      });

      if (!resp.ok) throw new Error("Analysis failed");

      let text = "";
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) { text += c; setAnalysis(text); }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 border-2 border-dashed border-border/50 hover:border-primary/40 transition-colors cursor-pointer text-center space-y-3"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
        />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto">
          {file ? <CheckCircle className="w-7 h-7 text-primary-foreground" /> : <Upload className="w-7 h-7 text-primary-foreground" />}
        </div>
        {file ? (
          <>
            <p className="font-display font-semibold text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB — Click to replace</p>
          </>
        ) : (
          <>
            <p className="font-display font-semibold text-foreground">Drop your CV here</p>
            <p className="text-xs text-muted-foreground">Supports PDF, PNG, JPG • Max 10MB</p>
          </>
        )}
      </motion.div>

      {/* Analyze Button */}
      {file && (
        <Button onClick={analyzeCV} disabled={isAnalyzing} className="rounded-xl gap-2 gradient-primary w-full">
          {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
          {isAnalyzing ? "Analyzing your CV..." : "Analyze & Score My CV"}
        </Button>
      )}

      {/* Results */}
      {analysis && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
          <MarkdownMessage content={analysis} />
        </motion.div>
      )}
    </div>
  );
};

// ─── Main Career Page ─────────────────────────────────────────────
const tabs = [
  { id: "interview" as ActiveTab, icon: Briefcase, label: "Interview Prep", desc: "AI Mock Interviews", color: "from-sky-500 to-indigo-500" },
  { id: "dsa" as ActiveTab, icon: Code, label: "DSA Practice", desc: "LeetCode-Style Problems", color: "from-emerald-500 to-teal-500" },
  { id: "cv" as ActiveTab, icon: FileText, label: "CV Optimizer", desc: "AI Resume Scorer", color: "from-violet-500 to-purple-500" },
];

const CareerPage = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("interview");

  return (
    <PageShell
      title="Career Hub"
      subtitle="Built by Uzair Ahmad"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-3">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`glass rounded-2xl p-4 text-center transition-all ${
                activeTab === tab.id
                  ? "ring-2 ring-primary shadow-elevated"
                  : "hover:shadow-md"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tab.color} flex items-center justify-center mx-auto mb-2`}>
                <tab.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="font-display font-semibold text-sm text-foreground">{tab.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{tab.desc}</p>
            </motion.button>
          ))}
        </div>

        {/* Active Module */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "interview" && <InterviewPrep />}
            {activeTab === "dsa" && <DSAPractice />}
            {activeTab === "cv" && <CVOptimizer />}
          </motion.div>
        </AnimatePresence>

        {/* Footer Credit */}
        <div className="text-center pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            Career Hub — Powered by <span className="font-bold text-foreground">UniGenius AI</span> | Built by{" "}
            <span className="font-bold gradient-text">Uzair Ahmad</span>
          </p>
        </div>
      </div>
    </PageShell>
  );
};

export default CareerPage;
