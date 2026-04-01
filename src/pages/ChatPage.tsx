import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, BookOpen, Code, ListChecks, FileQuestion, ArrowLeft, Paperclip, X, Upload, ArrowUp, ArrowDown, Volume2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import MarkdownMessage from "@/components/MarkdownMessage";
import { Progress } from "@/components/ui/progress";
import { useFileDrop } from "@/hooks/use-file-drop";
import ChatSidebar from "@/components/ChatSidebar";
import { ACCEPT_EXTENSIONS, isFileAllowed, getFileCategory, FILE_CATEGORY_STYLES, buildFileContentParts, DROP_ZONE_TEXT } from "@/lib/file-types";
import FileIcon from "@/components/FileIcon";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  fileNames?: string[];
  fileThumbnails?: string[];
}

interface AttachedFile {
  name: string;
  type: string;
  dataUrl: string;
  file: File;
  uploadProgress: number;
  thumbnailUrl?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TITLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-title`;
const MAX_FILES = 20;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Assalam-o-Alaikum! 👋 I'm your **Senior SE Professor AI**. I can help you with:\n\n• Solving assignments & lab tasks\n• Debugging C++ code\n• Math & Discrete logic\n• Viva preparation\n• Generating study notes\n• **Analyzing uploaded files** — PDFs, Images, Word, PPT, Audio, Video (up to 20 at once)\n• **OCR** — extracting text from photos & diagrams\n\nWhat would you like to learn today?",
};

const smartButtons = [
  { icon: Sparkles, label: "Explain Simply" },
  { icon: BookOpen, label: "Explain in Detail" },
  { icon: Code, label: "Give Example" },
  { icon: ListChecks, label: "Solve Step-by-Step" },
  { icon: FileQuestion, label: "Generate MCQs" },
  { icon: BookOpen, label: "Prepare for Viva" },
];

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileIndex, setUploadingFileIndex] = useState(-1);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [titleGenerated, setTitleGenerated] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDragOver, onDragOver, onDragLeave, onDrop } = useFileDrop(attachedFiles, setAttachedFiles, MAX_FILES, isStreaming);

  // Smart auto-scroll: only scroll if user hasn't manually scrolled up
  const scrollToBottom = useCallback(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [userScrolledUp]);

  // Detect if user scrolled up manually + show scroll-to-top
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolledUp(distFromBottom > 100);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollToBottomManual = useCallback(() => {
    setUserScrolledUp(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Get best available neural/natural voice
  const getBestVoice = useCallback((gender: "female" | "male"): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith("en"));
    // Priority: Google > Microsoft Natural > any English
    const priority = ["Google", "Natural", "Neural", "Premium", "Enhanced"];
    const femaleHints = ["Female", "Zira", "Jenny", "Aria", "Sara"];
    const maleHints = ["Male", "David", "Guy", "Mark", "Roger"];
    const genderHints = gender === "female" ? femaleHints : maleHints;

    // Try to find a neural voice matching gender
    for (const p of priority) {
      const match = enVoices.find(v => v.name.includes(p) && genderHints.some(h => v.name.includes(h)));
      if (match) return match;
    }
    // Try any neural voice
    for (const p of priority) {
      const match = enVoices.find(v => v.name.includes(p));
      if (match) return match;
    }
    // Fallback to first English voice
    return enVoices[0] || voices[0] || null;
  }, []);

  // TTS Read Aloud with neural voice
  const handleReadAloud = useCallback((msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/```[\s\S]*?```/g, " code block ").replace(/[*#_`~>|]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    const voice = getBestVoice(voiceGender);
    if (voice) utterance.voice = voice;
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = voiceGender === "male" ? 0.85 : 1.05;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  }, [speakingMsgId, voiceGender, getBestVoice]);

  // Preload voices & cleanup TTS on unmount
  useEffect(() => {
    window.speechSynthesis.getVoices(); // trigger async load
    const onVoicesChanged = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoicesChanged);
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener?.("voiceschanged", onVoicesChanged);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, []);

  useEffect(() => { autoResize(); }, [input, autoResize]);

  const createChatSession = async (subject?: string | null): Promise<string | null> => {
    if (!user) return null;
    const insertData: any = { user_id: user.id, title: "New Chat" };
    if (subject) insertData.subject = subject;
    const { data, error } = await supabase.from("chat_sessions").insert(insertData).select("id").single();
    if (error) { console.error("Failed to create chat session:", error); return null; }
    return data.id;
  };

  const saveMessage = async (chatId: string, role: string, content: string, fileNames?: string[], fileUrls?: string[]) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({ chat_id: chatId, user_id: user.id, role, content, file_names: fileNames || [], file_urls: fileUrls || [] });
    await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
  };

  const generateTitle = async (chatId: string, msgs: Message[]) => {
    if (!user || titleGenerated) return;
    try {
      const resp = await fetch(TITLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: msgs.filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content })) }),
      });
      const { title } = await resp.json();
      if (title && title !== "New Chat") {
        await supabase.from("chat_sessions").update({ title }).eq("id", chatId);
        setTitleGenerated(true);
        setSidebarRefresh(prev => prev + 1);
      }
    } catch (e) { console.error("Title generation error:", e); }
  };

  const loadChat = async (chatId: string) => {
    if (!user) return;
    setActiveChatId(chatId);
    setTitleGenerated(true);
    const { data, error } = await supabase.from("chat_messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true });
    if (error) { toast.error("Failed to load chat"); return; }
    const loadedMessages: Message[] = [
      WELCOME_MESSAGE,
      ...(data || []).map((m: any) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content, fileNames: m.file_names?.length > 0 ? m.file_names : undefined })),
    ];
    setMessages(loadedMessages);
    setAttachedFiles([]);
    setInput("");
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([WELCOME_MESSAGE]);
    setTitleGenerated(false);
    setAttachedFiles([]);
    setInput("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachedFiles.length + files.length > MAX_FILES) {
      toast.error("Maximum 20 files allowed per message.");
      e.target.value = "";
      return;
    }
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) { toast.error(`File too large: ${f.name} (max 20MB)`); continue; }
      if (!isFileAllowed(f)) { toast.error(`Unsupported file: ${f.name}`); continue; }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachedFiles(prev => {
          if (prev.length >= MAX_FILES) return prev;
          return [...prev, { name: f.name, type: f.type, dataUrl, file: f, uploadProgress: 0, thumbnailUrl: f.type.startsWith("image/") ? dataUrl : undefined }];
        });
      };
      reader.readAsDataURL(f);
    }
    e.target.value = "";
  };

  const removeFile = (idx: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));

  const uploadToStorage = async (files: AttachedFile[]): Promise<string[]> => {
    const urls: string[] = [];
    const userId = user?.id || "anonymous";
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setUploadingFileIndex(i);
      setAttachedFiles(prev => prev.map((af, idx) => idx === i ? { ...af, uploadProgress: 20 } : af));
      const ext = f.name.split(".").pop() || "bin";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      setAttachedFiles(prev => prev.map((af, idx) => idx === i ? { ...af, uploadProgress: 50 } : af));
      const { error } = await supabase.storage.from("chat-uploads").upload(path, f.file, { contentType: f.type, upsert: false });
      if (error) { console.error("Upload error:", error); urls.push(""); }
      else {
        setAttachedFiles(prev => prev.map((af, idx) => idx === i ? { ...af, uploadProgress: 80 } : af));
        const { data: urlData } = supabase.storage.from("chat-uploads").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      setAttachedFiles(prev => prev.map((af, idx) => idx === i ? { ...af, uploadProgress: 100 } : af));
    }
    setUploadingFileIndex(-1);
    return urls;
  };

  const streamChat = async (allMessages: { role: string; content: string | any[] }[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ messages: allMessages }),
    });
    if (!resp.ok) { const errorData = await resp.json().catch(() => ({})); throw new Error(errorData.error || `Error: ${resp.status}`); }
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
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)));
          }
        } catch { textBuffer = line + "\n" + textBuffer; break; }
      }
    }
    return assistantSoFar;
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if ((!msg && attachedFiles.length === 0) || isStreaming) return;
    setUserScrolledUp(false);

    const fileNames = attachedFiles.map(f => f.name);
    const fileThumbnails = attachedFiles.filter(f => f.type.startsWith("image/")).map(f => f.dataUrl);
    const displayContent = attachedFiles.length > 0
      ? `${msg}${msg ? "\n\n" : ""}📎 ${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""} attached`
      : msg;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: displayContent, fileNames, fileThumbnails: fileThumbnails.length > 0 ? fileThumbnails : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    let chatId = activeChatId;
    if (!chatId && user) {
      chatId = await createChatSession();
      if (chatId) { setActiveChatId(chatId); setSidebarRefresh(prev => prev + 1); }
    }

    try {
      let storageUrls: string[] = [];
      if (attachedFiles.length > 0 && user) { setIsUploading(true); storageUrls = await uploadToStorage(attachedFiles); setIsUploading(false); }

      if (chatId && user) { await saveMessage(chatId, "user", displayContent, fileNames, storageUrls); }

      let apiContent: string | any[];
      if (attachedFiles.length > 0) {
        const parts: any[] = [];
        if (msg) parts.push({ type: "text", text: msg });
        if (attachedFiles.length > 1) {
          parts.push({ type: "text", text: `The student has uploaded ${attachedFiles.length} files simultaneously. Analyze ALL of them together. Provide a structured response addressing each file.` });
        }
        for (let i = 0; i < attachedFiles.length; i++) {
          parts.push(...buildFileContentParts(attachedFiles[i], i, attachedFiles.length));
        }
        apiContent = parts;
      } else {
        apiContent = msg;
      }

      const apiMessages = newMessages.filter((m) => m.id !== "welcome").map((m, i, arr) => i === arr.length - 1 ? { role: m.role, content: apiContent } : { role: m.role, content: m.content });
      const assistantContent = await streamChat(apiMessages);

      if (chatId && user && assistantContent) { await saveMessage(chatId, "assistant", assistantContent); }

      const userMsgCount = newMessages.filter(m => m.role === "user").length;
      if (chatId && userMsgCount >= 1 && !titleGenerated) {
        const allMsgs = [...newMessages, { id: "temp", role: "assistant" as const, content: assistantContent }];
        generateTitle(chatId, allMsgs);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
    } finally {
      setIsStreaming(false);
      setAttachedFiles([]);
    }
  };

  return (
    <div className="h-dvh flex flex-col gradient-hero" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {/* Sticky Navbar */}
      <Navbar onMenuToggle={() => setMobileSidebarOpen(prev => !prev)} showMenu />

      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3 border-2 border-dashed border-primary">
            <Upload className="w-10 h-10 text-primary" />
            <p className="font-display font-semibold text-foreground">Drop files here</p>
            <p className="text-xs text-muted-foreground">{DROP_ZONE_TEXT} — up to {MAX_FILES} files</p>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <ChatSidebar
          activeChatId={activeChatId}
          onSelectChat={loadChat}
          onNewChat={handleNewChat}
          refreshTrigger={sidebarRefresh}
          subject={null}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* Chat column: sticky header + scrollable messages + fixed input */}
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {/* Sticky chat header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30 px-4 py-2.5">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-xl flex-shrink-0" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-base text-foreground truncate">AI Tutor Chat</h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">PDFs, Images, Word, PPT, Audio & Video</p>
              </div>
            </div>
          </div>

          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto min-h-0 relative" ref={scrollContainerRef} onScroll={handleScroll}>
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className={`w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 mt-1 transition-all ${speakingMsgId === msg.id ? "animate-pulse shadow-lg shadow-primary/40 ring-2 ring-primary/30" : ""}`}>
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="max-w-[80%] space-y-2">
                      {msg.role === "user" && msg.fileThumbnails && msg.fileThumbnails.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end">
                          {msg.fileThumbnails.map((thumb, i) => (
                            <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="w-20 h-20 rounded-xl overflow-hidden border border-border/30">
                              <img src={thumb} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                            </motion.div>
                          ))}
                        </div>
                      )}
                      {msg.role === "user" && msg.fileNames && msg.fileNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {msg.fileNames.map((name, i) => (
                            <span key={i} className="glass rounded-lg px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
                              <FileIcon fileName={name} size="xs" />
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "gradient-primary text-primary-foreground" : "glass text-foreground"}`}>
                        {msg.role === "assistant" ? <MarkdownMessage content={msg.content} /> : msg.content || "…"}
                      </div>
                      {msg.role === "assistant" && msg.content && msg.id !== "welcome" && (
                        <div className="flex items-center gap-2 mt-1 ml-1">
                          <button
                            onClick={() => handleReadAloud(msg.id, msg.content)}
                            className={`flex items-center gap-1 text-[10px] transition-colors ${speakingMsgId === msg.id ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                            title={speakingMsgId === msg.id ? "Stop reading" : "Read aloud"}
                          >
                            {speakingMsgId === msg.id ? (
                              <><Square className="w-3 h-3" /> Stop</>
                            ) : (
                              <><Volume2 className="w-3 h-3" /> Read Aloud</>
                            )}
                          </button>
                          <button
                            onClick={() => setVoiceGender(prev => prev === "female" ? "male" : "female")}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md border border-border/50"
                            title="Switch voice"
                          >
                            {voiceGender === "female" ? "♀ Female" : "♂ Male"}
                          </button>
                        </div>
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
                  <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
                    {isUploading ? (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Uploading {uploadingFileIndex + 1}/{attachedFiles.length}</span>
                        <Progress value={Math.round(((uploadingFileIndex) / attachedFiles.length) * 100 + (attachedFiles[uploadingFileIndex]?.uploadProgress ?? 0) / attachedFiles.length)} className="h-1.5 w-40" />
                      </div>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]" />
                      </>
                    )}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Floating scroll buttons */}
            <AnimatePresence>
              {userScrolledUp && (
                <>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToTop}
                    className="absolute top-20 right-4 z-20 w-9 h-9 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 shadow-elevated flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Scroll to top"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToBottomManual}
                    className="absolute bottom-4 right-4 z-20 w-9 h-9 rounded-full gradient-primary shadow-elevated flex items-center justify-center text-primary-foreground"
                    title="Scroll to bottom"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </motion.button>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Fixed bottom input area */}
          <div className="border-t border-border/30 bg-background/80 backdrop-blur-md px-4 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Smart Buttons */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {smartButtons.map((btn) => (
                  <Button key={btn.label} variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 flex-shrink-0" onClick={() => handleSend(btn.label)} disabled={isStreaming}>
                    <btn.icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{btn.label}</span>
                    <span className="sm:hidden">{btn.label.split(" ").slice(0, 2).join(" ")}</span>
                  </Button>
                ))}
              </div>

              {/* Attached files preview */}
              <AnimatePresence>
                {attachedFiles.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] text-muted-foreground font-medium">{attachedFiles.length}/{MAX_FILES} files attached</span>
                      {attachedFiles.length > 1 && (
                        <button onClick={() => setAttachedFiles([])} className="text-[11px] text-destructive hover:text-destructive/80 transition-colors">Clear all</button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[120px] overflow-y-auto">
                      {attachedFiles.map((f, i) => {
                        const cat = getFileCategory(f.type);
                        const style = FILE_CATEGORY_STYLES[cat];
                        return (
                          <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="glass rounded-xl overflow-hidden border border-border/50 relative group">
                            <button onClick={() => removeFile(i)} className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-destructive/20 transition-all opacity-0 group-hover:opacity-100">
                              <X className="w-3 h-3" />
                            </button>
                            {f.thumbnailUrl ? (
                              <div className="w-[88px]">
                                <div className="w-full h-16 overflow-hidden"><img src={f.thumbnailUrl} alt={f.name} className="w-full h-full object-cover" /></div>
                                <div className="px-2 py-1.5 space-y-1">
                                  <p className="text-[10px] text-foreground truncate max-w-[72px]">{f.name}</p>
                                  <p className="text-[9px] text-muted-foreground">{(f.file.size / 1024).toFixed(0)}KB</p>
                                  {f.uploadProgress > 0 && f.uploadProgress < 100 && <Progress value={f.uploadProgress} className="h-1" />}
                                </div>
                              </div>
                            ) : (
                              <div className="px-3 py-2 flex items-center gap-2 min-w-[120px]">
                                <div className={`w-9 h-9 rounded-lg ${style.bgColor} flex items-center justify-center flex-shrink-0`}>
                                  <FileIcon fileName={f.name} mimeType={f.type} size="sm" />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <p className="text-[11px] text-foreground truncate max-w-[100px] font-medium">{f.name}</p>
                                  <p className="text-[9px] text-muted-foreground">{style.label} • {(f.file.size / 1024).toFixed(0)}KB</p>
                                  {f.uploadProgress > 0 && f.uploadProgress < 100 && <Progress value={f.uploadProgress} className="h-1" />}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Text input */}
              <div className="glass rounded-2xl p-2 flex gap-2 items-end">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept={ACCEPT_EXTENSIONS} className="hidden" />
                <Button variant="ghost" size="icon" className="rounded-xl flex-shrink-0 relative" onClick={() => fileInputRef.current?.click()} disabled={isStreaming || attachedFiles.length >= MAX_FILES}>
                  <Paperclip className="w-4 h-4" />
                  {attachedFiles.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{attachedFiles.length}</span>
                  )}
                </Button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={attachedFiles.length > 0 ? `Add a message about your ${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""}...` : user ? "Ask anything, or attach files for AI analysis…" : "Sign in for file uploads, or just ask..."}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[40px] max-h-[160px]"
                  rows={1}
                />
                <Button size="icon" className="rounded-xl gradient-primary flex-shrink-0" onClick={() => handleSend()} disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
