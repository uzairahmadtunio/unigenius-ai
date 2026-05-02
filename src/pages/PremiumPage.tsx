import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Crown, Upload, CheckCircle2, Clock, XCircle, Smartphone, Copy, Check,
  Tag, Loader2, Zap, FileText, Mic, HardDrive, Bell, BadgeCheck,
  Layers, File, Timer, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";

const FREE_FEATURES = [
  { icon: Layers, label: "2 Slides / day", limited: true },
  { icon: File, label: "PDF Only (2MB)", limited: true },
  { icon: Mic, label: "Standard Voice", limited: true },
  { icon: HardDrive, label: "50MB Storage", limited: true },
  { icon: Timer, label: "Standard Timer", limited: true },
  { icon: User, label: "Normal User Badge", limited: true },
];

const PRO_FEATURES = [
  { icon: Layers, label: "Unlimited Slides" },
  { icon: FileText, label: "All Formats (PPT, Docs, Images)" },
  { icon: Mic, label: "Pro Voices (Aoede & Algieba)" },
  { icon: HardDrive, label: "5GB Storage" },
  { icon: Bell, label: "Priority Exam Alerts" },
  { icon: BadgeCheck, label: "Golden Verified Tick 🌟" },
];

const PremiumPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPro, setIsPro] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"jazzcash" | "easypaisa">("jazzcash");
  const [copiedJazz, setCopiedJazz] = useState(false);
  const [copiedEasy, setCopiedEasy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount_percent: number; remaining?: number } | null>(null);

  const basePrice = 300;
  const finalPrice = appliedPromo ? Math.round(basePrice * (1 - appliedPromo.discount_percent / 100)) : basePrice;

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_pro").eq("user_id", user.id).single().then(({ data }) => {
      if ((data as any)?.is_pro) setIsPro(true);
    });
    supabase
      .from("payment_requests" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setPendingRequest(data[0]);
      });
  }, [user]);

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const { data, error } = await supabase
        .from("promo_codes" as any)
        .select("*")
        .eq("code", promoCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();
      if (error || !data) { toast.error("Invalid or expired promo code"); setAppliedPromo(null); return; }
      const promo = data as any;
      const remaining = promo.usage_limit - promo.used_count;
      if (remaining <= 0) { toast.error("Sorry! Ye promo code ki limit khatam ho chuki hai."); setAppliedPromo(null); return; }
      setAppliedPromo({ code: promo.code, discount_percent: promo.discount_percent, remaining });
      toast.success("🎉 Mubarak! " + promo.discount_percent + "% discount applied!", { duration: 5000 });
    } catch { toast.error("Failed to validate promo code"); } finally { setPromoLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("payment-screenshots").upload(path, file);
    if (uploadErr) { toast.error("Upload failed: " + uploadErr.message); setUploading(false); return; }
    const { error: insertErr } = await (supabase.from("payment_requests" as any) as any).insert({
      user_id: user.id, screenshot_url: path, payment_method: paymentMethod,
      amount: finalPrice, promo_code: appliedPromo?.code || null, discount_percent: appliedPromo?.discount_percent || 0,
    });
    if (insertErr) { toast.error("Failed to submit: " + insertErr.message); }
    else { toast.success("🎉 Payment screenshot submitted!"); setPendingRequest({ status: "pending", payment_method: paymentMethod, created_at: new Date().toISOString() }); setModalOpen(false); }
    setUploading(false);
  };

  const copyNumber = (num: string, type: "jazz" | "easy") => {
    navigator.clipboard.writeText(num);
    if (type === "jazz") { setCopiedJazz(true); setTimeout(() => setCopiedJazz(false), 2000); }
    else { setCopiedEasy(true); setTimeout(() => setCopiedEasy(false), 2000); }
    toast.success("Number copied!");
  };

  if (!user) {
    return (
      <PageShell title="Premium" icon={<Crown className="w-5 h-5" />}>
        <div className="text-center py-16">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Please sign in to upgrade to Premium</p>
          <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
        </div>
      </PageShell>
    );
  }

  if (isPro) {
    return (
      <PageShell title="Premium" icon={<Crown className="w-5 h-5" />}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">You're a Pro! 🎉</h2>
          <p className="text-muted-foreground text-sm">All premium features are unlocked.</p>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-sm px-4 py-1">PRO Member</Badge>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Premium" icon={<Crown className="w-5 h-5" />}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-8">
        {/* Pending/Rejected Banner */}
        {pendingRequest?.status === "pending" && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Payment Under Review</p>
                <p className="text-xs text-muted-foreground">Uzair bhai aapki payment verify kar rahe hain. 2-4 ghanton mein Pro active ho jayega. 🙏</p>
              </div>
              <Badge variant="outline" className="text-amber-500 border-amber-500/30 ml-auto shrink-0 text-xs">Pending</Badge>
            </CardContent>
          </Card>
        )}
        {pendingRequest?.status === "rejected" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Payment Rejected</p>
                <p className="text-xs text-muted-foreground">{pendingRequest.admin_note || "Please try again with a valid screenshot."}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Free Card */}
          <Card className="border-border/40 bg-card">
            <CardHeader className="text-center pb-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 text-muted-foreground" />
              </div>
              <CardTitle className="font-display text-lg">Free Plan</CardTitle>
              <p className="text-2xl font-bold text-foreground mt-1">
                0 <span className="text-sm font-normal text-muted-foreground">PKR</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5 pb-6">
              {FREE_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 text-sm">
                  <f.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{f.label}</span>
                </div>
              ))}
              <div className="pt-4">
                <Button disabled className="w-full rounded-xl" variant="outline">
                  Current Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Premium Card */}
          <Card className="border-amber-500/40 shadow-lg shadow-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-2 py-0.5">
                Most Popular
              </Badge>
            </div>
            <CardHeader className="text-center pb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-2">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="font-display text-lg">Premium Pro</CardTitle>
              <div className="mt-1">
                <p className="text-3xl font-bold text-foreground">
                  300 <span className="text-sm font-normal text-muted-foreground">PKR / mo</span>
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-sm line-through text-muted-foreground">500 PKR</span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">Save 40%</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pb-6">
              {PRO_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-foreground">{f.label}</span>
                </div>
              ))}
              {/* Golden Tick Preview */}
              <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                  <BadgeCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-500">Your Profile Badge</span>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => setModalOpen(true)}
                  className="w-full rounded-xl gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 animate-pulse hover:animate-none"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Payment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Crown className="w-5 h-5 text-amber-500" />
              Upgrade to Premium Pro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Promo Code */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Promo Code</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. UOL50"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="rounded-xl flex-1"
                  disabled={!!appliedPromo}
                />
                {appliedPromo ? (
                  <Button variant="outline" className="rounded-xl text-xs text-destructive border-destructive/30"
                    onClick={() => { setAppliedPromo(null); setPromoCode(""); }}>Remove</Button>
                ) : (
                  <Button onClick={applyPromoCode} disabled={promoLoading || !promoCode.trim()} className="rounded-xl gap-1.5">
                    {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Apply
                  </Button>
                )}
              </div>
              {appliedPromo && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-emerald-500 font-medium">
                  ✅ {appliedPromo.discount_percent}% discount applied! Pay only {finalPrice} PKR
                </motion.p>
              )}
            </div>

            {/* Amount */}
            <div className="text-center py-2 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground">Amount to send</p>
              <p className="text-2xl font-bold text-foreground">{finalPrice} PKR</p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Select Payment Method</span>
              </div>

              <div className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "jazzcash" ? "border-red-500 bg-red-500/5" : "border-border/30 hover:border-border"}`}
                onClick={() => setPaymentMethod("jazzcash")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">JazzCash</p>
                    <p className="text-xs text-muted-foreground">03064379361 — Uzair Ahmad</p>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs gap-1"
                    onClick={(e) => { e.stopPropagation(); copyNumber("03064379361", "jazz"); }}>
                    {copiedJazz ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedJazz ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "easypaisa" ? "border-emerald-500 bg-emerald-500/5" : "border-border/30 hover:border-border"}`}
                onClick={() => setPaymentMethod("easypaisa")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">EasyPaisa</p>
                    <p className="text-xs text-muted-foreground">03470326062 — Uzair Ahmad</p>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs gap-1"
                    onClick={(e) => { e.stopPropagation(); copyNumber("03470326062", "easy"); }}>
                    {copiedEasy ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedEasy ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Upload */}
            <div className="text-center space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">Send {finalPrice} PKR → Upload screenshot below</p>
              <label className="cursor-pointer inline-block">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                <Button asChild className="rounded-xl gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                  <span><Upload className="w-4 h-4" />{uploading ? "Uploading..." : "Upload Screenshot"}</span>
                </Button>
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default PremiumPage;
