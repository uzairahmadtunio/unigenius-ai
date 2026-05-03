import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, RotateCcw, GraduationCap, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from "@/components/PageShell";
import MarkdownMessage from "@/components/MarkdownMessage";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { authHeader } from "@/lib/auth-header";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const VIVA_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/viva-session`;

const VivaPage = () => {
  const { user } = useAuth();
  const { department } = useDepartment();
  const [semester, setSemester] = useState(1);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("current_semester").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.current_semester) setSemester(data.current_semester); });
  }, [user]);

  const subjects = getSubjects(department, semester);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamResponse = useCallback(async (allMessages: Message[]) => {
    setIsLoading(true);
    let assistantContent = "";

    try {
      const resp = await fetch(VIVA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${await authHeader()}`,
        },
        body: JSON.stringify({ messages: allMessages, subject: selectedSubject, difficulty }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) { toast.error("Rate limited. Try again shortly."); return; }
        if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
        throw new Error("Stream failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial json */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject, difficulty]);

  const startViva = async () => {
    if (!selectedSubject) { toast.error("Please select a subject"); return; }
    setStarted(true);
    const initialMessages: Message[] = [
      { role: "user", content: `Start the viva examination for ${selectedSubject}. Begin with the first question.` }
    ];
    setMessages(initialMessages);
    await streamResponse(initialMessages);
  };

  const sendAnswer = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    await streamResponse(updated);
  };

  const resetViva = () => {
    setMessages([]);
    setStarted(false);
    setInput("");
  };

  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(prev => {
        if (event.results[event.results.length - 1].isFinal) {
          return prev + transcript + " ";
        }
        return prev;
      });
    };

    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => { setIsListening(false); };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_`]/g, ""));
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  if (!started) {
    return (
      <PageShell
        title="Viva Simulation"
        subtitle="AI-Powered Oral Examination"
        icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-primary-foreground" /></div>}
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-6">
          <div className="glass rounded-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-5xl">🎤</div>
              <h2 className="font-display font-bold text-xl text-foreground">Mock Viva Examination</h2>
              <p className="text-sm text-muted-foreground">Select your subject and difficulty. The AI examiner will test your knowledge with progressive questions.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.icon} {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Easy — Basic concepts</SelectItem>
                    <SelectItem value="medium">🟡 Medium — Application level</SelectItem>
                    <SelectItem value="hard">🔴 Hard — Deep understanding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={startViva} className="w-full rounded-xl h-12 font-semibold" disabled={!selectedSubject || !user}>
              {!user ? "Sign in to start" : "Start Viva 🎯"}
            </Button>
          </div>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Viva Simulation"
      subtitle={selectedSubject}
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-220px)]">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "glass border border-border/30"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="space-y-2">
                      <MarkdownMessage content={msg.content} />
                      <button onClick={() => speakText(msg.content)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1">
                        <Volume2 className="w-3 h-3" /> Listen
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="glass rounded-2xl px-4 py-3 border border-border/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="glass rounded-2xl border border-border/30 p-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-xl flex-shrink-0 ${isListening ? "bg-destructive/20 text-destructive animate-pulse" : ""}`}
            onClick={toggleListening}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAnswer()}
            placeholder={isListening ? "Listening... speak your answer" : "Type your answer..."}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            disabled={isLoading}
          />
          <Button variant="ghost" size="icon" className="rounded-xl flex-shrink-0" onClick={sendAnswer} disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl flex-shrink-0 text-muted-foreground" onClick={resetViva}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </PageShell>
  );
};

export default VivaPage;
