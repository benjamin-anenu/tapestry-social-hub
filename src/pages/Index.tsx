import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crosshair, Users, Bot, Trophy, ArrowRight, Globe, Zap } from "lucide-react";
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
    className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
    <p className="font-mono text-xs leading-relaxed text-muted-foreground">{description}</p>
  </motion.div>
);

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col bg-background grid-bg overflow-hidden scanlines">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-primary/5 blur-[150px]" />
        <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      {/* Hero */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="flex max-w-3xl flex-col items-center gap-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground backdrop-blur-sm"
          >
            <Globe className="h-3 w-3 text-primary" />
            POWERED BY TAPESTRY ON SOLANA
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center font-display text-7xl font-bold tracking-tight text-foreground sm:text-8xl"
          >
            <span className="glitch" data-text="FIND">FIND</span>
            <span className="text-primary text-glow-blue">60</span>

          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md text-center font-mono text-sm leading-relaxed text-muted-foreground"
          >
            60 seconds to vibe. One chat. Real connections.
            <br />
            <span className="text-foreground">Find your people on-chain.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button
              size="lg"
              onClick={() => navigate("/play")}
              className="group relative h-14 overflow-hidden rounded-xl bg-primary px-8 font-display text-lg font-bold text-primary-foreground shadow-lg glow-blue"
            >
              <span className="relative z-10 flex items-center gap-2">
                START VIBING
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/demo")}
              className="h-14 rounded-xl border-border/50 px-8 font-display text-lg font-bold text-foreground backdrop-blur-sm"
            >
              EXPLORE DEMO
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-24">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-10 text-center font-mono text-[10px] font-medium tracking-[0.3em] text-muted-foreground"
        >
          HOW IT WORKS
        </motion.p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={Users}
            title="60s Vibe Check"
            description="Get matched with a stranger. Chat for 60 seconds. Decide if you vibe."
            delay={0.5}
          />
          <FeatureCard
            icon={Zap}
            title="Mutual Reveal"
            description="Both say 'Vibe'? Real names and socials unlock. No match, no data shared."
            delay={0.6}
          />
          <FeatureCard
            icon={Bot}
            title="On-Chain Social"
            description="Connections live on Tapestry's open graph — portable across every app."
            delay={0.7}
          />
          <FeatureCard
            icon={Trophy}
            title="Friend Games"
            description="Challenge your circle to staked games and climb the ranks together."
            delay={0.8}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 px-6 py-6">
        <p className="text-center font-mono text-[10px] tracking-widest text-muted-foreground">
          BUILT FOR THE TAPESTRY HACKATHON · SOLANA · 2025
        </p>
      </footer>
    </div>
  );
};

export default Index;
