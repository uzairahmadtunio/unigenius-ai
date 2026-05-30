import { Shield } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Card } from "@/components/ui/card";

const PrivacyPage = () => (
  <PageShell title="Privacy Policy" subtitle="How we handle your data" icon={<Shield className="w-5 h-5 text-primary" />}>
    <Card className="glass p-6 md:p-8 max-w-3xl mx-auto border-primary/10 space-y-4 text-sm text-muted-foreground leading-relaxed">
      <p>
        UniGenius AI respects your privacy. We collect only the information needed to operate the platform — such as
        your account details, academic progress, and content you choose to upload — and we never sell your personal data.
      </p>
      <h3 className="font-display text-base font-bold text-foreground">What we collect</h3>
      <p>Account email, display name, university and semester, study activity, quiz results, attendance entries, and any files you upload.</p>
      <h3 className="font-display text-base font-bold text-foreground">How we use it</h3>
      <p>To deliver personalized study tools, track your progress, secure your account, and improve the platform.</p>
      <h3 className="font-display text-base font-bold text-foreground">Your control</h3>
      <p>You can update your profile, delete chats, and request account removal anytime by contacting us via the Contact page.</p>
    </Card>
  </PageShell>
);

export default PrivacyPage;
