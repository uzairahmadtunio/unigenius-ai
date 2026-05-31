import { Shield, Database, Settings2, Lock, Mail, FileCheck } from "lucide-react";
import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const sections = [
  {
    id: "overview",
    label: "Overview",
    icon: Shield,
    body: (
      <p>
        UniGenius AI respects your privacy. We collect only the information needed to operate the platform — such
        as your account details, academic progress, and content you choose to upload — and we never sell your
        personal data.
      </p>
    ),
  },
  {
    id: "collect",
    label: "What we collect",
    icon: Database,
    body: (
      <ul className="space-y-2 list-disc list-inside marker:text-primary/60">
        <li>Account email and display name</li>
        <li>University, department, and semester</li>
        <li>Study activity, quiz results, and attendance entries</li>
        <li>Files and notes you choose to upload</li>
      </ul>
    ),
  },
  {
    id: "use",
    label: "How we use it",
    icon: Settings2,
    body: (
      <p>
        To deliver personalized study tools, track your progress, keep your account secure, and continuously
        improve the platform experience.
      </p>
    ),
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    body: (
      <p>
        Your data is stored on encrypted, role-protected infrastructure. AI prompts are processed via secure
        gateways and never used to train third-party public models.
      </p>
    ),
  },
  {
    id: "control",
    label: "Your control",
    icon: FileCheck,
    body: (
      <p>
        You can update your profile, delete chats, and request full account removal anytime by reaching out
        through the Contact page.
      </p>
    ),
  },
  {
    id: "contact",
    label: "Contact",
    icon: Mail,
    body: (
      <p>
        Questions about your data? Email us via the Contact page and we'll respond within 48 hours.
      </p>
    ),
  },
];

const PrivacyPage = () => {
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
      title="Privacy Policy"
      subtitle="Last updated · May 2026"
      icon={<Shield className="w-5 h-5 text-primary" />}
    >
      <div className="max-w-5xl mx-auto grid md:grid-cols-[220px_1fr] gap-6 md:gap-10">
        {/* Sidebar */}
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

        {/* Content */}
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

export default PrivacyPage;
