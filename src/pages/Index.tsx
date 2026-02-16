import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Users, Bot, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const FeatureCard = ({ icon: Icon, title, description, delay }: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
      <Icon className="h-6 w-6 text-accent-foreground" />
    </div>
    <h3 className="font-display text-lg font-semibold text-card-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </motion.div>
);

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24">
        {/* Gradient blob background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full opacity-20 blur-3xl animate-pulse-glow"
            style={{ background: "var(--gradient-hero)" }}
          />
          <div
            className="absolute -bottom-1/4 right-0 h-[500px] w-[500px] rounded-full opacity-10 blur-3xl animate-float"
            style={{ background: "var(--gradient-primary)" }}
          />
        </div>

        <div className="relative z-10 flex max-w-3xl flex-col items-center gap-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Powered by Tapestry on Solana
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center font-display text-6xl font-bold tracking-tight text-foreground sm:text-7xl"
          >
            Find
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              60
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-lg text-center text-xl text-muted-foreground leading-relaxed"
          >
            The most interesting minute of your day.
            <br />
            <span className="text-foreground font-medium">
              A 60-second social puzzle game on the open social graph.
            </span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              onClick={() => navigate("/play")}
              className="h-14 rounded-2xl px-8 font-display text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              Play for Real
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/demo")}
              className="h-14 rounded-2xl px-8 font-display text-lg font-semibold"
            >
              Explore Demo
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-10 text-center font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Why Tapestry changes everything
        </motion.p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={Users}
            title="Portable Identity"
            description="One wallet, one reputation — across every app on Tapestry's open graph."
            delay={0.5}
          />
          <FeatureCard
            icon={Zap}
            title="Smart Matching"
            description="Matched through mutual connections, not random chance."
            delay={0.6}
          />
          <FeatureCard
            icon={Bot}
            title="Agent-Native"
            description="Play against AI agents from Tapestry's global registry."
            delay={0.7}
          />
          <FeatureCard
            icon={Trophy}
            title="Cross-App Ranks"
            description="Your vibe score follows you everywhere in the ecosystem."
            delay={0.8}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <p className="text-center text-sm text-muted-foreground">
          Built for the Tapestry Hackathon · Solana · 2025
        </p>
      </footer>
    </div>
  );
};

export default Index;
