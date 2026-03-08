import { useState } from "react";
import { MessageSquareHeart, Star, Bug, Lightbulb, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const feedbackTypes = [
  { id: "appreciate", icon: Star, label: "Appreciate", placeholder: "What do you love about UniGenius AI?", color: "text-amber-400" },
  { id: "bug", icon: Bug, label: "Report Bug", placeholder: "Describe what's not working...", color: "text-destructive" },
  { id: "suggestion", icon: Lightbulb, label: "Suggestion", placeholder: "Share your idea for UniGenius AI...", color: "text-primary" },
] as const;

const FeedbackWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!selectedType || !message.trim()) return;
    setSubmitting(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase.from("feedbacks" as any).insert({
      user_id: user.id,
      user_name: profile?.display_name || user.email || "Anonymous",
      user_email: user.email || "",
      feedback_type: selectedType,
      message: message.trim().slice(0, 1000),
    } as any);

    if (error) {
      toast.error("Failed to submit feedback. Please try again.");
    } else {
      toast.success("Thank you for your feedback! We are constantly improving UniGenius AI.");
    }

    setSubmitting(false);
    setMessage("");
    setSelectedType(null);
    setOpen(false);
  };

  const selected = feedbackTypes.find((t) => t.id === selectedType);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-2 text-xs border-border/50 hover:border-primary/30"
        >
          <MessageSquareHeart className="w-3.5 h-3.5" />
          Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-xl" align="end" side="top">
        <div className="p-3 border-b border-border">
          <p className="font-display font-semibold text-sm">Give Feedback</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Help us improve UniGenius AI</p>
        </div>

        {!selectedType ? (
          <div className="p-3 space-y-2">
            {feedbackTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors hover:bg-muted/50 text-foreground"
              >
                <type.icon className={`w-4 h-4 ${type.color}`} />
                <span className="font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <button
              onClick={() => setSelectedType(null)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← {selected?.label}
            </button>
            <Textarea
              placeholder={selected?.placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-xl text-xs min-h-[80px] resize-none"
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{message.length}/1000</span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
                className="rounded-xl gap-1.5 text-xs"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Submit
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default FeedbackWidget;
