import { useState } from "react";
import { Share2, Copy, Check, MessageCircle, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const APP_URL = window.location.origin;

const INVITE_MESSAGE = `Check out UniGenius AI – The ultimate assistant for Software Engineering students. 🎓\n\n✅ Fix C++ code & debug errors\n✅ Generate lab manuals instantly\n✅ Track attendance & GPA\n✅ AI-powered exam prep & viva practice\n\nJoin here: ${APP_URL} — Built by Uzair Ahmad`;

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrerName?: string;
}

const InviteModal = ({ open, onOpenChange, referrerName }: InviteModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(INVITE_MESSAGE);
    setCopied(true);
    toast.success("📋 Invite message copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(INVITE_MESSAGE);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(APP_URL);
    toast.success("🔗 Link copied!");
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(APP_URL)}&bgcolor=1a1a2e&color=ffffff&format=png`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Invite Friends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Invite Message Preview */}
          <div className="rounded-xl bg-muted/50 p-4 text-xs text-foreground whitespace-pre-line border border-border/30 max-h-36 overflow-y-auto">
            {INVITE_MESSAGE}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="rounded-xl gap-2 text-xs h-11"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Message"}
            </Button>
            <Button
              onClick={handleWhatsApp}
              className="rounded-xl gap-2 text-xs h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageCircle className="w-4 h-4" />
              Share to WhatsApp
            </Button>
          </div>

          <Button
            onClick={handleCopyLink}
            variant="ghost"
            className="w-full rounded-xl gap-2 text-xs"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Link Only
          </Button>

          {/* QR Code */}
          <div className="text-center space-y-3 pt-2">
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
              <QrCode className="w-4 h-4" />
              <span>Or scan this QR code</span>
            </div>
            <div className="inline-block p-3 rounded-2xl bg-white">
              <img
                src={qrUrl}
                alt="QR Code to join UniGenius AI"
                className="w-40 h-40 mx-auto"
                loading="lazy"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Works with any camera or QR scanner app
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Standalone button that can be dropped anywhere
export const InviteButton = ({ variant = "outline", className = "" }: { variant?: any; className?: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} className={`rounded-xl gap-2 text-xs ${className}`} onClick={() => setOpen(true)}>
        <Share2 className="w-3.5 h-3.5" />
        Invite Friends
      </Button>
      <InviteModal open={open} onOpenChange={setOpen} />
    </>
  );
};

export default InviteModal;
