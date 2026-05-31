import { FileText, CheckCircle2, CreditCard, AlertTriangle, Scale, Ban, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const sections = [
  {
    id: "agreement",
    label: "Agreement",
    icon: FileText,
    body: (
      <p>
        By using UniGenius AI you agree to use the platform for lawful academic purposes only. AI-generated
        answers are study aids — always verify before submitting work and follow your university's academic
        integrity rules.
      </p>
    ),
  },
  {
    id: "acceptable",
    label: "Acceptable Use",
    icon: CheckCircle2,
    body: (
      <ul className="space-y-2 list-disc list-inside marker:text-primary/60">
        <li>Use the platform for personal learning and research</li>
        <li>Respect other students, teachers, and contributors</li>
        <li>Follow your institution's academic integrity policies</li>
      </ul>
    ),
  },
  {
    id: "prohibited",
    label: "Prohibited",
    icon: Ban,
    body: (
      <p>
        No spam, harassment, illegal content, scraping, reverse-engineering, or attempts to bypass platform
        security. Accounts that violate these rules may be suspended without notice.
      </p>
    ),
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    body: (
      <p>
        Premium Pro plans renew monthly. You can cancel anytime from your profile; access continues until the
        end of your paid period. Refunds are handled on a case-by-case basis.
      </p>
    ),
  },
  {
    id: "ip",
    label: "Intellectual Property",
    icon: Sparkles,
    body: (
      <p>
        UniGenius AI, its branding, and original content belong to Uzair Ahmad. Content you upload remains
        yours, but you grant us a limited license to store and process it to deliver the service.
      </p>
    ),
  },
  {
    id: "disclaimer",
    label: "Disclaimer",
    icon: AlertTriangle,
    body: (
      <p>
        UniGenius AI is provided "as is". We work hard for accuracy but cannot guarantee uninterrupted service
        or error-free AI output. Use AI responses as a study guide, not as a final source of truth.
      </p>
    ),
  },
  {
    id: "law",
    label: "Governing Law",
    icon: Scale,
    body: (
      <p>
        These terms are governed by the applicable laws of Pakistan. Any disputes will be resolved through
        good-faith communication before any formal proceedings.
      </p>
    ),
  },
];

const TermsPage = () => {
  const [active, setActive] = useState(sections[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <PageShell
      title="Terms of Service"
      subtitle="Last updated · May 2026"
      icon={<FileText className="w-5 h-5 text-primary" />}
    >
      <div className="max-w-5xl mx-auto grid md:grid-cols-[220px_1fr] gap-6 md:gap-10">
        <aside className="hidden md:block">
          <nav className="sticky top-24 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-2">
              On this page
            </p>
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <Card className="glass p-6 md:p-10 border-primary/10 space-y-10">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <section
                key={s.id}
                id={s.id}
                className={cn("scroll-mt-24 space-y-3", i > 0 && "pt-8 border-t border-border/40")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="font-display font-bold text-lg text-foreground">{s.label}</h2>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed pl-12">{s.body}</div>
              </section>
            );
          })}
        </Card>
      </div>
    </PageShell>
  );
};

export default TermsPage;
