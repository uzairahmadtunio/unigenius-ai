import { FileText } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Card } from "@/components/ui/card";

const TermsPage = () => (
  <PageShell title="Terms of Service" subtitle="The rules for using UniGenius AI" icon={<FileText className="w-5 h-5 text-primary" />}>
    <Card className="glass p-6 md:p-8 max-w-3xl mx-auto border-primary/10 space-y-4 text-sm text-muted-foreground leading-relaxed">
      <p>
        By using UniGenius AI you agree to use the platform for lawful academic purposes only. AI-generated answers
        are study aids — always verify before submitting work and follow your university's academic integrity rules.
      </p>
      <h3 className="font-display text-base font-bold text-foreground">Acceptable use</h3>
      <p>No spam, harassment, illegal content, or attempts to bypass platform security. Respect other students and teachers.</p>
      <h3 className="font-display text-base font-bold text-foreground">Subscriptions</h3>
      <p>Premium Pro plans renew monthly. You can cancel anytime; access continues until the end of the paid period.</p>
      <h3 className="font-display text-base font-bold text-foreground">Disclaimer</h3>
      <p>UniGenius AI is provided "as is". We work hard for accuracy but cannot guarantee uninterrupted service or error-free AI output.</p>
    </Card>
  </PageShell>
);

export default TermsPage;
