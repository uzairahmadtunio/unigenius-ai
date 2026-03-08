import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, MessageSquare, BookOpen, Code, ListChecks,
  FileQuestion, ArrowLeft, Mic, Paperclip, X, FileText, Image as ImageIcon, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { findSubjectById } from "@/data/subjects";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import MarkdownMessage from "@/components/MarkdownMessage";
import { useFileDrop } from "@/hooks/use-file-drop";
import ChatSidebar from "@/components/ChatSidebar";

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
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const SubjectHubPage = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { department } = useDepartment();
  const { user } = useAuth();
  const result = findSubjectById(subjectId || "", department);

  const subjectName = result?.subject.name ?? "Unknown Subject";
  const semester = result?.semester ?? 0;
  const icon = result?.subject.icon ?? "📚";
  const hasLab = result?.subject.hasLab ?? false;
  const deptName = result ? departmentInfo[result.department].fullName : "BS Software Engineering";

  const [mode, setMode] = useState<"tutor" | "viva">("tutor");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileIndex, setUploadingFileIndex] = useState(-1);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [titleGenerated, setTitleGenerated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const systemPrompt = mode === "viva"
    ? `You are a strict but helpful university professor conducting a mock viva voce for "${subjectName}" in Semester ${semester} of a ${deptName} program. 

IMPORTANT RULES:
- Ask ONE question at a time, then wait for the student's answer
- Mix Roman Urdu and English naturally (like Pakistani university vivas), e.g., "Ye concept samjhao", "Iska output kya hoga?", "Acha, to agar hum ye change karein..."
- Start easy, then increase difficulty
- After the student answers, give brief feedback in the same Roman Urdu/English mix
- If the answer is wrong, guide them toward the correct answer
- Be encouraging but academically rigorous
- Cover different topics within ${subjectName}

Start by greeting the student and asking your first viva question.`
    : `You are now the specialized tutor for "${subjectName}" in Semester ${semester} of a ${deptName} program. Help the user with topics, assignments, lab tasks, viva questions, and exam preparation specifically related to ${subjectName}. Provide clear explanations, code examples (if applicable), and exam tips. Be encouraging and use markdown formatting. When the user uploads files (images, PDFs, documents), analyze them thoroughly — extract text via OCR from images, read PDF content, and discuss findings in the context of ${subjectName}.`;

  const getWelcome = () => mode === "viva"
    ? `🎤 **Mock Viva Mode — ${subjectName}**\n\nAssalam-o-Alaikum! Main aapka viva examiner hun. Aaj hum "${subjectName}" ke important concepts cover karenge.\n\nTayyar ho? Shuru karte hain...\n\n*Pehla sawal aa raha hai...*`
    : `Assalam-o-Alaikum! 👋 Welcome to the **${subjectName}** Study Hub.\n\nI'm your specialized tutor for this subject. I can help you with:\n\n• Understanding key concepts\n• Solving assignments & lab tasks\n• Preparing for midterms & finals\n• Viva preparation & Practice MCQs\n• 📎 **Upload files** — images, PDFs, DOCX (up to 20 at once)\n• 🔍 **OCR** — extract text from photos & diagrams\n\nWhat would you like to study today?`;

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: getWelcome() },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const { isDragOver, onDragOver, onDragLeave, onDrop } = useFileDrop(attachedFiles, setAttachedFiles, MAX_FILES, isStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-load last active chat for this subject
  useEffect(() => {
    if (!user || !subjectId) return;
    const loadLastSession = async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("subject", subjectId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        loadChat(data.id);
      }
    };
    loadLastSession();
  }, [user, subjectId]);

  const createChatSession = async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title: `${subjectName} Chat`, subject: subjectId })
      .select("id")
      .single();
    if (error) { console.error("Failed to create chat session:", error); return null; }
    return data.id;
  };

  const saveMessage = async (chatId: string, role: string, content: string, fileNames?: string[], fileUrls?: string[]) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({
      chat_id: chatId, user_id: user.id, role, content,
      file_names: fileNames || [], file_urls: fileUrls || [],
    });
    await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
  };

  const generateTitle = async (chatId: string, msgs: Message[]) => {
    if (!user || titleGenerated) return;
    try {
      const resp = await fetch(TITLE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: msgs.filter(m => !m.id.startsWith("welcome")).map(m => ({ role: m.role, content: m.content })),
        }),
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
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (error) { toast.error("Failed to load chat"); return; }
    const loadedMessages: Message[] = [
      { id: "welcome", role: "assistant", content: getWelcome() },
      ...(data || []).map((m: any) => ({
        id: m.id, role: m.role as "user" | "assistant", content: m.content,
        fileNames: m.file_names?.length > 0 ? m.file_names : undefined,
      })),
    ];
    setMessages(loadedMessages);
    setAttachedFiles([]);
    setInput("");
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([{ id: "welcome", role: "assistant", content: getWelcome() }]);
    setTitleGenerated(false);
    setAttachedFiles([]);
    setInput("");
  };

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, []);

  useEffect(() => { autoResize(); }, [input, autoResize]);

  const switchMode = (newMode: "tutor" | "viva") => {
    setMode(newMode);
    setAttachedFiles([]);
    setActiveChatId(null);
    setTitleGenerated(false);
    setMessages([{ id: "welcome-" + newMode, role: "assistant", content: newMode === "viva"
      ? `🎤 **Mock Viva Mode — ${subjectName}**\n\nAssalam-o-Alaikum! Main aapka viva examiner hun. Tayyar ho? Shuru karte hain...`
      : getWelcome()
    }]);
    setIsStreaming(false);
    setInput("");
    if (newMode === "viva") {
      setTimeout(() => handleSend("Start the viva"), 500);
    }
  };

  // ─── File handling ───────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachedFiles.length + files.length > MAX_FILES) {
      toast.error("Maximum 20 files allowed per message for best AI analysis.");
      e.target.value = "";
      return;
    }
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) { toast.error(`File too large: ${f.name} (max 20MB)`); continue; }
      if (!ALLOWED_TYPES.some(t => f.type === t || f.type.startsWith(t.split("/")[0] + "/"))) {
        toast.error(`Unsupported file: ${f.name}`); continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachedFiles(prev => {
          if (prev.length >= MAX_FILES) return prev;
          return [...prev, {
            name: f.name, type: f.type, dataUrl, file: f,
            uploadProgress: 0,
            thumbnailUrl: f.type.startsWith("image/") ? dataUrl : undefined,
          }];
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

      const { error } = await supabase.storage.from("chat-uploads").upload(path, f.file, {
        contentType: f.type, upsert: false,
      });

      if (error) {
        console.error("Upload error:", error);
        urls.push("");
      } else {
        const { data: urlData } = supabase.storage.from("chat-uploads").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      setAttachedFiles(prev => prev.map((af, idx) => idx === i ? { ...af, uploadProgress: 100 } : af));
    }
    setUploadingFileIndex(-1);
    return urls;
  };

  // ─── Chat streaming ─────────────────────────────────────────
  const streamChat = async (allMessages: { role: string; content: string | any[] }[]) => {
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

  // ─── Send handler ────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if ((!msg && attachedFiles.length === 0) || isStreaming) return;

    const fileNames = attachedFiles.map(f => f.name);
    const fileThumbnails = attachedFiles.filter(f => f.type.startsWith("image/")).map(f => f.dataUrl);

    const displayContent = attachedFiles.length > 0
      ? `${msg}${msg ? "\n\n" : ""}📎 ${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""} attached`
      : msg;

    const userMsg: Message = {
      id: Date.now().toString(), role: "user", content: displayContent,
      fileNames: fileNames.length > 0 ? fileNames : undefined,
      fileThumbnails: fileThumbnails.length > 0 ? fileThumbnails : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    try {
      let storageUrls: string[] = [];
      if (attachedFiles.length > 0 && user) {
        setIsUploading(true);
        storageUrls = await uploadToStorage(attachedFiles);
        setIsUploading(false);
      }

      // Ensure we have a chat session
      let chatId = activeChatId;
      if (!chatId && user) {
        chatId = await createChatSession();
        if (chatId) {
          setActiveChatId(chatId);
          setSidebarRefresh(prev => prev + 1);
        }
      }

      // Save user message to DB
      if (chatId && user) {
        await saveMessage(chatId, "user", displayContent, fileNames, storageUrls);
      }

      // Build multimodal API content
      let apiContent: string | any[];
      if (attachedFiles.length > 0) {
        const parts: any[] = [];
        if (msg) parts.push({ type: "text", text: msg });

        if (attachedFiles.length > 1) {
          parts.push({
            type: "text",
            text: `The student has uploaded ${attachedFiles.length} files for "${subjectName}". Analyze ALL files together. Provide a structured response: first an overview summary, then address each file individually (e.g., "**File 1: ${attachedFiles[0]?.name}** — ..."), and finally a combined conclusion.`,
          });
        }

        for (let i = 0; i < attachedFiles.length; i++) {
          const f = attachedFiles[i];
          if (f.type.startsWith("image/")) {
            parts.push({ type: "image_url", image_url: { url: f.dataUrl } });
            parts.push({
              type: "text",
              text: `[Image ${i + 1}/${attachedFiles.length}: ${f.name}] — Analyze this image in context of ${subjectName}. Extract text/code via OCR if present.`,
            });
          } else if (f.type === "application/pdf") {
            parts.push({ type: "file", file: { name: f.name, mime_type: f.type, data: f.dataUrl.split(",")[1] } });
            parts.push({
              type: "text",
              text: `[PDF ${i + 1}/${attachedFiles.length}: ${f.name}] — Read and analyze this PDF for ${subjectName}.`,
            });
          } else {
            parts.push({ type: "file", file: { name: f.name, mime_type: f.type, data: f.dataUrl.split(",")[1] } });
            parts.push({
              type: "text",
              text: `[Document ${i + 1}/${attachedFiles.length}: ${f.name}] — Analyze this document for ${subjectName}.`,
            });
          }
        }
        apiContent = parts;
      } else {
        apiContent = msg;
      }

      const apiMessages = newMessages
        .filter((m) => !m.id.startsWith("welcome"))
        .map((m, i, arr) =>
          i === arr.length - 1
            ? { role: m.role, content: apiContent }
            : { role: m.role, content: m.content }
        );
      const assistantContent = await streamChat(apiMessages);

      // Save assistant message to DB
      if (chatId && user && assistantContent) {
        await saveMessage(chatId, "assistant", assistantContent);
      }

      // Generate title after first exchange
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

  const smartButtons = mode === "viva"
    ? [
        { icon: Mic, label: "I'm ready, ask next question" },
        { icon: BookOpen, label: "Explain the answer" },
        { icon: ListChecks, label: "Give me a hint" },
      ]
    : [
        { icon: MessageSquare, label: `Explain a topic from ${subjectName.split("(")[0].trim()}` },
        { icon: ListChecks, label: "Solve Step-by-Step" },
        { icon: Code, label: "Give Code Example" },
        { icon: FileQuestion, label: "Generate MCQs" },
        { icon: BookOpen, label: "Prepare for Viva" },
      ];

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-3.5 h-3.5 text-primary" />;
    return <FileText className="w-3.5 h-3.5 text-primary" />;
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
    <div className="min-h-screen flex flex-col gradient-hero" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <Navbar />
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3 border-2 border-dashed border-primary">
            <Upload className="w-10 h-10 text-primary" />
            <p className="font-display font-semibold text-foreground">Drop files here</p>
            <p className="text-xs text-muted-foreground">PDF, Images, DOCX — up to {MAX_FILES} files</p>
          </div>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        {/* Subject-specific Chat Sidebar */}
        <ChatSidebar
          activeChatId={activeChatId}
          onSelectChat={loadChat}
          onNewChat={handleNewChat}
          refreshTrigger={sidebarRefresh}
          subject={subjectId || null}
        />

        <div className="flex-1 flex flex-col max-w-3xl mx-auto px-4 py-4 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
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

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "tutor" ? "default" : "outline"}
            size="sm"
            className={`rounded-xl text-xs gap-1.5 ${mode === "tutor" ? "gradient-primary text-primary-foreground" : ""}`}
            onClick={() => mode !== "tutor" && switchMode("tutor")}
          >
            <BookOpen className="w-3 h-3" /> Study Mode
          </Button>
          <Button
            variant={mode === "viva" ? "default" : "outline"}
            size="sm"
            className={`rounded-xl text-xs gap-1.5 ${mode === "viva" ? "gradient-primary text-primary-foreground" : ""}`}
            onClick={() => mode !== "viva" && switchMode("viva")}
          >
            <Mic className="w-3 h-3" /> Mock Viva
          </Button>
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
                <div className="max-w-[80%] space-y-2">
                  {/* Image thumbnails */}
                  {msg.role === "user" && msg.fileThumbnails && msg.fileThumbnails.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {msg.fileThumbnails.map((thumb, i) => (
                        <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-border/30">
                          <img src={thumb} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* File name chips */}
                  {msg.role === "user" && msg.fileNames && msg.fileNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {msg.fileNames.map((name, i) => (
                        <span key={i} className="glass rounded-lg px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
                          {name.match(/\.(png|jpg|jpeg|webp|gif)$/i)
                            ? <ImageIcon className="w-2.5 h-2.5" />
                            : <FileText className="w-2.5 h-2.5" />}
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
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
                     <span className="text-xs text-muted-foreground">
                       Uploading {uploadingFileIndex + 1}/{attachedFiles.length} — {Math.round(((uploadingFileIndex) / attachedFiles.length) * 100 + (attachedFiles[uploadingFileIndex]?.uploadProgress ?? 0) / attachedFiles.length)}%
                     </span>
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
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pb-2 space-y-2"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {attachedFiles.length}/{MAX_FILES} files attached
                </span>
                {attachedFiles.length > 1 && (
                  <button onClick={() => setAttachedFiles([])} className="text-[11px] text-destructive hover:text-destructive/80 transition-colors">
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[240px] overflow-y-auto">
                {attachedFiles.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="glass rounded-xl overflow-hidden border border-border/50 relative group"
                  >
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-destructive/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {f.thumbnailUrl ? (
                      <div className="w-[88px]">
                        <div className="w-full h-16 overflow-hidden">
                          <img src={f.thumbnailUrl} alt={f.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="px-2 py-1.5 space-y-1">
                          <p className="text-[10px] text-foreground truncate max-w-[72px]">{f.name}</p>
                          <p className="text-[9px] text-muted-foreground">{(f.file.size / 1024).toFixed(0)}KB</p>
                          {f.uploadProgress > 0 && f.uploadProgress < 100 && (
                            <Progress value={f.uploadProgress} className="h-1" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2 flex items-center gap-2 min-w-[120px]">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {getFileIcon(f.type)}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-[11px] text-foreground truncate max-w-[100px] font-medium">{f.name}</p>
                          <p className="text-[9px] text-muted-foreground">{(f.file.size / 1024).toFixed(0)}KB</p>
                          {f.uploadProgress > 0 && f.uploadProgress < 100 && (
                            <Progress value={f.uploadProgress} className="h-1" />
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            className="rounded-xl flex-shrink-0 relative"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || attachedFiles.length >= MAX_FILES}
          >
            <Paperclip className="w-4 h-4" />
            {attachedFiles.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {attachedFiles.length}
              </span>
            )}
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
            placeholder={
              attachedFiles.length > 0
                ? `Add a message about your ${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""}...`
                : mode === "viva"
                ? "Type your answer..."
                : `Ask about ${subjectName}, or attach files…`
            }
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[40px] max-h-[120px]"
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

export default SubjectHubPage;
