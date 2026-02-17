import { motion } from "framer-motion";
import { Heart, Users, Gamepad2, ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const hubCards = [
  {
    title: "Make Friends",
    desc: "60s vibe check with a random stranger",
    icon: Heart,
    path: "/play/vibe",
    gradient: "var(--gradient-primary)",
    glow: "glow-blue",
    disabled: false,
  },
  {
    title: "My Circle",
    desc: "Your friends & mutual connections",
    icon: Users,
    path: "/play/friends",
    gradient: "var(--gradient-success)",
    glow: "glow-green",
    disabled: false,
  },
  {
    title: "Game Arena",
    desc: "Challenge friends to staked games",
    icon: Gamepad2,
    path: "/play/arena",
    gradient: "var(--gradient-danger)",
    glow: "glow-red",
    disabled: true,
  },
];

const MainHub = () => {
  const navigate = useNavigate();

  return (
    <div className="flex w-full max-w-md lg:max-w-lg flex-col gap-4">
      {hubCards.map((card, i) => (
        <motion.button
          key={card.path}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          onClick={() => !card.disabled && navigate(card.path)}
          disabled={card.disabled}
          className={`group relative flex items-center gap-4 rounded-2xl border border-border/50 bg-card/80 p-5 backdrop-blur-sm transition-all ${
            card.disabled
              ? "cursor-not-allowed opacity-50"
              : `hover:border-primary/30 hover:${card.glow}`
          }`}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundImage: card.gradient }}
          >
            {card.disabled ? (
              <Lock className="h-6 w-6 text-primary-foreground" />
            ) : (
              <card.icon className="h-6 w-6 text-primary-foreground" />
            )}
          </div>
          <div className="flex flex-1 flex-col items-start gap-0.5">
            <span className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              {card.title}
              {card.disabled && (
                <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[9px] uppercase tracking-wider">
                  Coming Soon
                </Badge>
              )}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {card.desc}
            </span>
          </div>
          {!card.disabled && (
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default MainHub;
