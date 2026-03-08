import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, BookOpen, Code, ListChecks, FileQuestion, ArrowLeft, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import MarkdownMessage from "@/components/MarkdownMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AttachedFile {
  name: string;
  type: string;
  dataUrl: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const MAX_FILES = 5;

const smartButtons = [
  { icon: Sparkles, label: "Explain Simply" },
  { icon: BookOpen, label: "Explain in Detail" },
  { icon: Code, label: "Give Example" },
  { icon: ListChecks, label: "Solve Step-by-Step" },
  { icon: FileQuestion, label: "Generate MCQs" },
  { icon: BookOpen, label: "Prepare for Viva" },
];

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Assalam-o-Alaikum! 👋 I'm your **Senior SE Professor AI**. I can help you with:\n\n• Solving assignments & lab tasks\n• Debugging C++ code\n• Math & Discrete logic\n• Viva preparation\n• Generating study notes\n\nWhat would you like to learn today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, []);

  useEffect(() => { autoResize(); }, [input, autoResize]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachedFiles.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    for (const f of files) {
      if (!allowed.some(t => f.type.startsWith(t.split("/")[0]) || f.type === t)) {
        toast.error(`Unsupported file: ${f.name}`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFiles(prev => [...prev, { name: f.name, type: f.type, dataUrl: reader.result as string }]);
      };
      reader.readAsDataURL(f);
    }
    e.target.value = "";
  };

  const removeFile = (idx: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));

  const streamChat = async (allMessages: { role: string; content: string | any[] }[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Error: ${resp.status}`);
    }
    if (!resp.body) throw new Error("No stream body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    const assistantId = Date.now().toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            const snapshot = assistantSoFar;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
            );
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if ((!msg && attachedFiles.length === 0) || isStreaming) return;

    const displayContent = attachedFiles.length > 0
      ? `${msg}\n\n📎 ${attachedFiles.map(f => f.name).join(", ")}`
      : msg;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: displayContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    try {
      // Build API content - if files attached, include as multimodal
      let apiContent: string | any[];
      if (attachedFiles.length > 0) {
        const parts: any[] = [];
        if (msg) parts.push({ type: "text", text: msg });
        for (const f of attachedFiles) {
          if (f.type.startsWith("image/")) {
            parts.push({ type: "image_url", image_url: { url: f.dataUrl } });
          } else {
            // For PDFs/docs, extract text hint
            parts.push({ type: "text", text: `[Attached file: ${f.name}]\n(File content provided as base64 data)` });
          }
        }
        apiContent = parts;
      } else {
        apiContent = msg;
      }

      const apiMessages = newMessages
        .filter((m) => m.id !== "welcome")
        .map((m, i, arr) =>
          i === arr.length - 1
            ? { role: m.role, content: apiContent }
            : { role: m.role, content: m.content }
        );
      await streamChat(apiMessages);
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
    } finally {
      setIsStreaming(false);
      setAttachedFiles([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <Navbar />
      <div className="flex-1 container mx-auto max-w-3xl px-4 py-4 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground">AI Tutor Chat</h1>
            <p className="text-xs text-muted-foreground">Your Senior SE Professor</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground"
                      : "glass text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownMessage content={msg.content} />
                  ) : (
                    msg.content || "…"
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="glass rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Smart Buttons */}
        <div className="flex flex-wrap gap-2 pb-3">
          {smartButtons.map((btn) => (
            <Button
              key={btn.label}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              onClick={() => handleSend(btn.label)}
              disabled={isStreaming}
            >
              <btn.icon className="w-3 h-3" />
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {attachedFiles.map((f, i) => (
              <div key={i} className="glass rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-foreground">
                <FileText className="w-3 h-3 text-primary" />
                <span className="max-w-[120px] truncate">{f.name}</span>
                <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="glass rounded-2xl p-2 flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx"
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={user ? "Ask anything about your courses..." : "Sign in for personalized experience, or just ask..."}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[40px] max-h-[160px]"
            rows={1}
          />
          <Button
            size="icon"
            className="rounded-xl gradient-primary flex-shrink-0"
            onClick={() => handleSend()}
            disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ChatPage;
