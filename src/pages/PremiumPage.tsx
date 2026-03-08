import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Upload, CheckCircle2, Clock, XCircle, Smartphone, Copy, Check, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";

const PremiumPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPro, setIsPro] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"jazzcash" | "easypaisa">("jazzcash");
  const [copiedJazz, setCopiedJazz] = useState(false);
  const [copiedEasy, setCopiedEasy] = useState(false);

  // Promo code state
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

      if (error || !data) {
        toast.error("Invalid or expired promo code");
        setAppliedPromo(null);
        return;
      }

      const promo = data as any;
      const remaining = promo.usage_limit - promo.used_count;
      if (remaining <= 0) {
        toast.error("Sorry! Ye promo code ki limit khatam ho chuki hai.");
        setAppliedPromo(null);
        return;
      }

      setAppliedPromo({ code: promo.code, discount_percent: promo.discount_percent, remaining });
      toast.success("🎉 Mubarak! Uzair bhai ne aapko " + promo.discount_percent + "% discount de diya hai.", {
        duration: 5000,
      });
    } catch {
      toast.error("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
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

    const { data: urlData } = supabase.storage.from("payment-screenshots").getPublicUrl(path);

    // Promo increment now handled server-side on admin approve

    const { error: insertErr } = await (supabase.from("payment_requests" as any) as any).insert({
      user_id: user.id,
      screenshot_url: urlData.publicUrl,
      payment_method: paymentMethod,
      amount: finalPrice,
      promo_code: appliedPromo?.code || null,
      discount_percent: appliedPromo?.discount_percent || 0,
    });

    if (insertErr) {
      toast.error("Failed to submit: " + insertErr.message);
    } else {
      toast.success("🎉 Payment screenshot submitted!");
      setPendingRequest({ status: "pending", payment_method: paymentMethod, created_at: new Date().toISOString() });
    }
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-6">
        {/* Price Card */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-2">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="font-display text-xl">UniGenius Pro</CardTitle>
            <div className="mt-2">
              {appliedPromo ? (
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-foreground">
                    <span className="line-through text-muted-foreground text-lg mr-2">300</span>
                    {finalPrice} <span className="text-sm font-normal text-muted-foreground">PKR / Month</span>
                  </p>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
                    {appliedPromo.discount_percent}% OFF with {appliedPromo.code}
                  </Badge>
                </div>
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  300 <span className="text-sm font-normal text-muted-foreground">PKR / Month</span>
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              {[
                "Professional PDF Pro — Advanced lab manuals & reports",
                "Advanced Skill Sync — AI career analysis",
                "Priority Support — Direct admin access",
                "Ad-Free Experience",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Promo Code */}
        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-primary" />
              <span className="text-sm font-display font-semibold text-foreground">Promo Code</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code (e.g., UOL50)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="rounded-xl flex-1"
                disabled={!!appliedPromo}
              />
              {appliedPromo ? (
                <Button
                  variant="outline"
                  className="rounded-xl text-xs text-destructive border-destructive/30"
                  onClick={() => { setAppliedPromo(null); setPromoCode(""); }}
                >
                  Remove
                </Button>
              ) : (
                <Button
                  onClick={applyPromoCode}
                  disabled={promoLoading || !promoCode.trim()}
                  className="rounded-xl gap-1.5"
                >
                  {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Apply
                </Button>
              )}
            </div>
            {appliedPromo && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-emerald-500 mt-2 font-medium"
              >
                ✅ Mubarak! Uzair bhai ne aapko {appliedPromo.discount_percent}% discount de diya hai.
              </motion.p>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              Payment Methods
            </CardTitle>
            {appliedPromo && (
              <p className="text-xs text-muted-foreground">Send <strong className="text-foreground">{finalPrice} PKR</strong> to the selected account</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {/* JazzCash */}
            <div
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === "jazzcash" ? "border-red-500 bg-red-500/5" : "border-border/30 hover:border-border"
              }`}
              onClick={() => setPaymentMethod("jazzcash")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">JazzCash</p>
                  <p className="text-xs text-muted-foreground">03064379361</p>
                  <p className="text-[10px] text-muted-foreground">Account: Uzair Ahmad</p>
                </div>
                <Button variant="ghost" size="sm" className="rounded-lg text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); copyNumber("03064379361", "jazz"); }}>
                  {copiedJazz ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedJazz ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            {/* EasyPaisa */}
            <div
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === "easypaisa" ? "border-emerald-500 bg-emerald-500/5" : "border-border/30 hover:border-border"
              }`}
              onClick={() => setPaymentMethod("easypaisa")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">EasyPaisa</p>
                  <p className="text-xs text-muted-foreground">03470326062</p>
                  <p className="text-[10px] text-muted-foreground">Account: Uzair Ahmad</p>
                </div>
                <Button variant="ghost" size="sm" className="rounded-lg text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); copyNumber("03470326062", "easy"); }}>
                  {copiedEasy ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedEasy ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Screenshot or Show Status */}
        {pendingRequest?.status === "pending" ? (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6 text-center space-y-3">
              <Clock className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="font-display font-semibold text-foreground">Payment Under Review</h3>
              <p className="text-sm text-muted-foreground">
                Shukriya! Uzair bhai aapki payment verify kar rahe hain. 2-4 ghanton mein Pro features active ho jayenge. 🙏
              </p>
              <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                <Clock className="w-3 h-3 mr-1" /> Pending Verification
              </Badge>
            </CardContent>
          </Card>
        ) : pendingRequest?.status === "rejected" ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center space-y-3">
              <XCircle className="w-10 h-10 text-destructive mx-auto" />
              <h3 className="font-display font-semibold text-foreground">Payment Rejected</h3>
              <p className="text-sm text-muted-foreground">
                {pendingRequest.admin_note || "Your payment could not be verified. Please try again with a valid screenshot."}
              </p>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                <Button asChild variant="outline" className="rounded-xl gap-2" disabled={uploading}>
                  <span><Upload className="w-4 h-4" />{uploading ? "Uploading..." : "Upload New Screenshot"}</span>
                </Button>
              </label>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/30">
            <CardContent className="p-6 text-center space-y-4">
              <Upload className="w-10 h-10 text-primary mx-auto" />
              <div>
                <h3 className="font-display font-semibold text-foreground">Upload Payment Screenshot</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Send {finalPrice} PKR to the selected account and upload a screenshot of the transaction
                </p>
              </div>
              <label className="cursor-pointer inline-block">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                <Button asChild className="rounded-xl gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                  <span><Upload className="w-4 h-4" />{uploading ? "Uploading..." : "Upload Screenshot"}</span>
                </Button>
              </label>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </PageShell>
  );
};

export default PremiumPage;
