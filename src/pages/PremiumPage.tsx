import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Upload, CheckCircle2, Clock, XCircle, Smartphone, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    if (!user) return;
    // Check pro status
    supabase.from("profiles").select("is_pro").eq("user_id", user.id).single().then(({ data }) => {
      if ((data as any)?.is_pro) setIsPro(true);
    });
    // Check pending request
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("payment-screenshots").upload(path, file);
    if (uploadErr) {
      toast.error("Upload failed: " + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("payment-screenshots").getPublicUrl(path);

    const { error: insertErr } = await (supabase.from("payment_requests" as any) as any).insert({
      user_id: user.id,
      screenshot_url: urlData.publicUrl,
      payment_method: paymentMethod,
      amount: 300,
    });

    if (insertErr) {
      toast.error("Failed to submit: " + insertErr.message);
    } else {
      toast.success("🎉 Payment screenshot submitted!");
      setPendingRequest({
        status: "pending",
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
      });
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
      <PageShell title="Premium" icon={Crown}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">You're a Pro! 🎉</h2>
          <p className="text-muted-foreground text-sm">All premium features are unlocked.</p>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-sm px-4 py-1">
            PRO Member
          </Badge>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Premium" icon={Crown}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-6">
        {/* Price Card */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-2">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="font-display text-xl">UniGenius Pro</CardTitle>
            <p className="text-3xl font-bold text-foreground mt-2">
              300 <span className="text-sm font-normal text-muted-foreground">PKR / Month</span>
            </p>
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

        {/* Payment Methods */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              Payment Methods
            </CardTitle>
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
                <Button
                  variant="ghost" size="sm"
                  className="rounded-lg text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); copyNumber("03064379361", "jazz"); }}
                >
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
                <Button
                  variant="ghost" size="sm"
                  className="rounded-lg text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); copyNumber("03470326062", "easy"); }}
                >
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
                  <span>
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload New Screenshot"}
                  </span>
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
                  Send 300 PKR to the selected account and upload a screenshot of the transaction
                </p>
              </div>
              <label className="cursor-pointer inline-block">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                <Button asChild className="rounded-xl gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                  <span>
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload Screenshot"}
                  </span>
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
