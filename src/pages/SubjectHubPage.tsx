import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, MessageSquare, BookOpen, Code, ListChecks, FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { findSubjectById } from "@/data/subjects";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const SubjectHubPage = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const result = findSubjectById(subjectId || "");

  const subjectName = result?.subject.name ?? "Unknown Subject";
  const semester = result?.semester ?? 0;
  const icon = result?.subject.icon ?? "📚";
  const hasLab = result?.subject.hasLab ?? false;

  const systemPrompt = `You are now the specialized tutor for "${subjectName}" in Semester ${semester} of a BS Software Engineering program. Help the user with topics, assignments, lab tasks, viva questions, and exam preparation specifically related to ${subjectName}. Provide clear explanations, code examples (if applicable), and exam tips. Be encouraging and use markdown formatting.`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Assalam-o-Alaikum! 👋 Welcome to the **${subjectName}** Study Hub.\n\nI'm your specialized tutor for this subject. I can help you with:\n\n• Understanding key concepts\n• Solving assignments & lab tasks\n• Preparing for midterms & finals\n• Viva preparation\n• Practice MCQs\n\nWhat would you like to study today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const smartButtons = [
    { icon: MessageSquare, label: `Explain a topic from ${subjectName.split("(")[0].trim()}` },
    { icon: ListChecks, label: "Solve Step-by-Step" },
    { icon: Code, label: "Give Code Example" },
    { icon: FileQuestion, label: "Generate MCQs" },
    { icon: BookOpen, label: "Prepare for Viva" },
  ];

  const streamChat = async (allMessages: { role: string; content: string }[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: "system", content: systemPrompt }, ...allMessages],
      }),
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
    if (!msg || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    try {
      const apiMessages = newMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));
      await streamChat(apiMessages);
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
    } finally {
      setIsStreaming(false);
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col gradient-hero">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <p className="text-4xl">🔍</p>
            <h2 className="font-display font-bold text-xl text-foreground">Subject Not Found</h2>
            <p className="text-sm text-muted-foreground">The subject you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/")} className="rounded-xl gradient-primary text-primary-foreground">
              Back to Dashboard
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <Navbar />
      <div className="flex-1 container mx-auto max-w-3xl px-4 py-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-2xl">{icon}</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-lg text-foreground truncate">{subjectName}</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Semester {semester}</p>
              {hasLab && <Badge variant="secondary" className="text-xs rounded-lg">Lab</Badge>}
            </div>
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
                  {msg.content || "…"}
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

        {/* Input */}
        <div className="glass rounded-2xl p-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Ask about ${subjectName}...`}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <Button
            size="icon"
            className="rounded-xl gradient-primary"
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SubjectHubPage;
