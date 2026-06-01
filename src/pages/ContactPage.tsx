import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, MessageCircle } from "lucide-react";
import { z } from "zod";
import PageShell from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("contact_messages" as any).insert([parsed.data]);
      if (error) {
        console.error("[Contact] insert failed:", error);
        toast.error("Could not send message. Please try again.");
        return;
      }
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error("[Contact] unexpected error:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Contact Us" subtitle="We'd love to hear from you" icon={<MessageCircle className="w-5 h-5 text-primary" />}>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex w-14 h-14 rounded-2xl gradient-primary items-center justify-center mb-3">
            <Mail className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We would love to hear your feedback, suggestions, and ideas for improving UniGenius AI.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass p-6 md:p-8 border-primary/20">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Uzair Ahmad"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    maxLength={255}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-xs">Subject</Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="How can we help?"
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs">Message</Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Your message..."
                  rows={6}
                  maxLength={2000}
                  required
                />
                <p className="text-[10px] text-muted-foreground text-right">{form.message.length} / 2000</p>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-primary-foreground rounded-xl shadow-[0_0_18px_hsl(var(--primary)/0.4)]"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default ContactPage;
