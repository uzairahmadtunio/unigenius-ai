import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, ArrowLeft, Send, Crown, Copy, Hash, Paperclip,
  FileText, Trash2, Upload, User, Search, UserPlus, X,
  Settings, Camera, LogOut, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FileIcon from "@/components/FileIcon";
import { getFileCategory, FILE_CATEGORY_STYLES } from "@/lib/file-types";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
  avatar_url: string | null;
}

interface Member {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  roll_number: string | null;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  file_urls: string[];
  file_names: string[];
  created_at: string;
  display_name?: string;
}

interface GroupFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

// ── Group Avatar Component ──
const GroupAvatar = ({ url, name, size = "md" }: { url?: string | null; name?: string; size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-xl" };
  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center`}>
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className={`font-bold text-primary-foreground ${textSizes[size]}`}>
          {(name || "G")[0].toUpperCase()}
        </span>
      )}
    </div>
  );
};

const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rollSearch, setRollSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isOwner = user && group?.owner_id === user.id;

  useEffect(() => {
    if (user && groupId) {
      fetchGroup();
      fetchMembers();
      fetchMessages();
      fetchFiles();
    }
  }, [user, groupId]);

  // Realtime messages
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-${groupId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const msg = payload.new as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", msg.user_id)
          .single();
        setMessages(prev => [...prev, {
          ...msg,
          display_name: (profile as any)?.display_name || "Unknown",
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroup = async () => {
    const { data } = await supabase.from("groups").select("*").eq("id", groupId!).single();
    if (data) {
      setGroup(data as any);
      setEditName((data as any).name);
      setEditDesc((data as any).description || "");
    }
  };

  const fetchMembers = async () => {
    const { data: memberData } = await supabase
      .from("group_members")
      .select("user_id, role")
      .eq("group_id", groupId!);
    if (!memberData) return;

    const memberList: Member[] = [];
    for (const m of memberData as any[]) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, roll_number")
        .eq("user_id", m.user_id)
        .single();
      memberList.push({
        user_id: m.user_id,
        role: m.role,
        display_name: (profile as any)?.display_name || "Unknown",
        avatar_url: (profile as any)?.avatar_url,
        roll_number: (profile as any)?.roll_number,
      });
    }
    setMembers(memberList);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId!)
      .order("created_at", { ascending: true })
      .limit(200);
    if (!data) return;

    const enriched: Message[] = [];
    const nameCache = new Map<string, string>();
    for (const msg of data as any[]) {
      if (!nameCache.has(msg.user_id)) {
        const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", msg.user_id).single();
        nameCache.set(msg.user_id, (p as any)?.display_name || "Unknown");
      }
      enriched.push({ ...msg, display_name: nameCache.get(msg.user_id) });
    }
    setMessages(enriched);
  };

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("group_files")
      .select("*")
      .eq("group_id", groupId!)
      .order("created_at", { ascending: false });
    if (!data) return;

    const enriched: GroupFile[] = [];
    const nameCache = new Map<string, string>();
    for (const f of data as any[]) {
      if (!nameCache.has(f.uploaded_by)) {
        const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", f.uploaded_by).single();
        nameCache.set(f.uploaded_by, (p as any)?.display_name || "Unknown");
      }
      enriched.push({ ...f, uploader_name: nameCache.get(f.uploaded_by) });
    }
    setFiles(enriched);
  };

  const sendMessage = async () => {
    if (!user || !input.trim() || !groupId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        user_id: user.id,
        content: input.trim(),
      });
      if (error) throw error;
      setInput("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles || !user || !groupId) return;

    for (const file of Array.from(uploadFiles)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        continue;
      }
      const path = `${groupId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("group-files")
        .upload(path, file);
      if (uploadErr) {
        toast.error(`Upload failed: ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("group-files").getPublicUrl(path);

      await supabase.from("group_files").insert({
        group_id: groupId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: getFileCategory(file.type || file.name),
        file_size: file.size,
      });

      toast.success(`Uploaded: ${file.name}`);
    }
    fetchFiles();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteFile = async (fileId: string) => {
    await supabase.from("group_files").delete().eq("id", fileId);
    fetchFiles();
    toast.success("File deleted");
  };

  const searchByRoll = async () => {
    if (!rollSearch.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, roll_number, avatar_url")
      .ilike("roll_number", `%${rollSearch.trim()}%`)
      .limit(5);
    setSearchResults((data || []).filter((p: any) => p.user_id !== user?.id));
    setSearching(false);
  };

  const inviteMember = async (userId: string) => {
    if (!groupId) return;
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
      role: "member",
    });
    if (error) {
      if (error.message.includes("duplicate")) toast.info("Already a member!");
      else toast.error(error.message);
    } else {
      toast.success("Member added!");
      fetchMembers();
    }
  };

  const removeMember = async (userId: string) => {
    if (!groupId) return;
    await supabase.from("group_members").delete()
      .eq("group_id", groupId).eq("user_id", userId);
    fetchMembers();
    toast.success("Member removed");
  };

  const copyCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.invite_code);
      toast.success("Invite code copied!");
    }
  };

  // ── Avatar Upload (Owner only) ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId || !isOwner) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB for avatar"); return; }

    setUploadingAvatar(true);
    const path = `${groupId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("group-avatars").upload(path, file);
    if (uploadErr) { toast.error("Upload failed"); setUploadingAvatar(false); return; }

    const { data: urlData } = supabase.storage.from("group-avatars").getPublicUrl(path);
    await supabase.from("groups").update({ avatar_url: urlData.publicUrl } as any).eq("id", groupId);
    setGroup(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
    toast.success("Group picture updated!");
    setUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  // ── Edit Group Details (Owner only) ──
  const saveGroupDetails = async () => {
    if (!groupId || !isOwner) return;
    const { error } = await supabase.from("groups").update({
      name: editName.trim(),
      description: editDesc.trim() || null,
    }).eq("id", groupId);
    if (error) { toast.error(error.message); return; }
    setGroup(prev => prev ? { ...prev, name: editName.trim(), description: editDesc.trim() || null } : prev);
    setEditOpen(false);
    toast.success("Group details updated!");
  };

  // ── Transfer Ownership ──
  const transferOwnership = async (newOwnerId: string, memberName: string) => {
    if (!groupId || !isOwner) return;
    // Update group owner
    await supabase.from("groups").update({ owner_id: newOwnerId }).eq("id", groupId);
    // Update roles
    await supabase.from("group_members").update({ role: "owner" } as any).eq("group_id", groupId).eq("user_id", newOwnerId);
    await supabase.from("group_members").update({ role: "member" } as any).eq("group_id", groupId).eq("user_id", user!.id);
    setGroup(prev => prev ? { ...prev, owner_id: newOwnerId } : prev);
    fetchMembers();
    toast.success(`Ownership transferred to ${memberName}!`);
  };

  // ── Delete Group (Owner only) ──
  const deleteGroup = async () => {
    if (!groupId || !isOwner) return;
    // Cascade handles messages, files, members via FK
    await supabase.from("group_messages").delete().eq("group_id", groupId);
    await supabase.from("group_files").delete().eq("group_id", groupId);
    await supabase.from("group_members").delete().eq("group_id", groupId);
    await supabase.from("groups").delete().eq("id", groupId);
    toast.success("Group deleted");
    navigate("/groups");
  };

  // ── Leave Group (non-owner) ──
  const leaveGroup = async () => {
    if (!groupId || !user || isOwner) return;
    await supabase.from("group_members").delete()
      .eq("group_id", groupId).eq("user_id", user.id);
    toast.success("You left the group");
    navigate("/groups");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/groups")} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Group Avatar */}
          <div className="relative group/avatar">
            <GroupAvatar url={group?.avatar_url} name={group?.name} size="md" />
            {isOwner && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          <div className="flex-1">
            <h1 className="font-display font-bold text-foreground text-lg">{group?.name || "Loading..."}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{members.length} members</span>
              <button onClick={copyCode} className="flex items-center gap-1 hover:text-primary transition-colors">
                <Hash className="w-3 h-3" />{group?.invite_code}
                <Copy className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Edit Group (Owner) */}
            {isOwner && (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-border/50">
                  <DialogHeader>
                    <DialogTitle className="font-display">Edit Group</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">Update group details, picture, or manage the group.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Avatar upload in modal */}
                    <div className="flex items-center gap-4">
                      <div className="relative group/avlg">
                        <GroupAvatar url={group?.avatar_url} name={group?.name} size="lg" />
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/avlg:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Camera className="w-5 h-5 text-white" />
                        </button>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Group Picture</p>
                        <p className="text-[10px] text-muted-foreground">Click to upload (max 5MB)</p>
                      </div>
                    </div>

                    <Input placeholder="Group name" value={editName} onChange={e => setEditName(e.target.value)} className="rounded-xl" />
                    <Textarea placeholder="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="rounded-xl" rows={2} />

                    <Button onClick={saveGroupDetails} className="w-full rounded-xl gradient-primary text-primary-foreground">
                      Save Changes
                    </Button>

                    <div className="border-t border-border/30 pt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full rounded-xl gap-2">
                            <Trash2 className="w-4 h-4" /> Delete Group
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-destructive" /> Delete Group
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{group?.name}", all messages, files, and member data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteGroup} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete Forever
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Leave Group (non-owner) */}
            {!isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl text-destructive">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Group</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to leave "{group?.name}"? You'll need an invite code to rejoin.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={leaveGroup} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Leave
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Invite Button */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/50">
                <DialogHeader>
                  <DialogTitle className="font-display">Invite Members</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="glass rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Share this code</p>
                      <p className="font-mono font-bold text-foreground text-lg">{group?.invite_code}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={copyCode} className="rounded-xl gap-1">
                      <Copy className="w-3 h-3" /> Copy
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Search by Roll Number</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., 22SW001"
                        value={rollSearch}
                        onChange={e => setRollSearch(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && searchByRoll()}
                        className="rounded-xl"
                      />
                      <Button onClick={searchByRoll} disabled={searching} size="sm" className="rounded-xl">
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                    {searchResults.map((p: any) => (
                      <div key={p.user_id} className="flex items-center justify-between glass rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.display_name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.roll_number}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => inviteMember(p.user_id)} className="rounded-lg text-xs h-7">
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="glass rounded-xl">
            <TabsTrigger value="chat" className="rounded-lg text-xs gap-1.5 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              💬 Chat
            </TabsTrigger>
            <TabsTrigger value="files" className="rounded-lg text-xs gap-1.5 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              📁 Files
            </TabsTrigger>
            <TabsTrigger value="members" className="rounded-lg text-xs gap-1.5 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              👥 Members ({members.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Chat Tab ── */}
          <TabsContent value="chat" className="space-y-0">
            <div className="glass rounded-2xl flex flex-col" style={{ height: "500px" }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No messages yet. Start the conversation!
                  </div>
                )}
                <AnimatePresence>
                  {messages.map(msg => {
                    const isMe = msg.user_id === user.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${isMe ? "justify-end" : ""}`}
                      >
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                          {!isMe && (
                            <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">{msg.display_name}</p>
                          )}
                          <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? "gradient-primary text-primary-foreground" : "glass text-foreground"}`}>
                            {msg.content}
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {new Date(msg.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border/30 p-3 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="rounded-xl flex-1"
                />
                <Button onClick={sendMessage} disabled={sending || !input.trim()} size="icon" className="rounded-xl gradient-primary text-primary-foreground">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Files Tab ── */}
          <TabsContent value="files" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{files.length} files shared</p>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Upload File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {files.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No files yet. Upload PDFs, PPTs, or documents.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {files.map(f => {
                  const cat = getFileCategory(f.file_name);
                  const style = FILE_CATEGORY_STYLES[cat];
                  return (
                    <div key={f.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${style.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <FileIcon fileName={f.file_name} size="md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          by {f.uploader_name} • {(f.file_size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <a href={f.file_url} target="_blank" rel="noreferrer">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg">
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                        {(isOwner || f.uploaded_by === user.id) && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive" onClick={() => deleteFile(f.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Members Tab ── */}
          <TabsContent value="members" className="space-y-3">
            {members.map(m => (
              <div key={m.user_id} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{m.display_name}</p>
                    {m.role === "owner" && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/15 rounded-full px-1.5 py-0.5">
                        <Crown className="w-2 h-2" /> Owner
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{m.roll_number || "No roll number"}</p>
                </div>
                {isOwner && m.user_id !== user.id && (
                  <div className="flex gap-1">
                    {/* Transfer Ownership */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-xs h-7 rounded-lg gap-1" title="Transfer ownership">
                          <ShieldCheck className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                          <AlertDialogDescription>
                            Make <strong>{m.display_name}</strong> the owner of this group? You will become a regular member.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => transferOwnership(m.user_id, m.display_name || "member")} className="rounded-xl">
                            Transfer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Remove Member */}
                    <Button size="sm" variant="ghost" className="text-destructive text-xs h-7 rounded-lg" onClick={() => removeMember(m.user_id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default GroupDetailPage;
