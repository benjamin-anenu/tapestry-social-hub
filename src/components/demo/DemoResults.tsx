import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, ThumbsUp, Meh, UserPlus, ArrowLeft, RotateCcw, TrendingUp, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MOCK_USER, MOCK_OPPONENT, MOCK_MATCH_RESULT, MOCK_REPUTATION } from "@/lib/mock-data";

interface DemoResultsProps {
  onRestart: () => void;
  onHome: () => void;
}

const DemoResults = ({ onRestart, onHome }: DemoResultsProps) => {
  const [vibeScore, setVibeScore] = useState(MOCK_USER.vibeScore);
  const [rating, setRating] = useState<string | null>(null);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVibeScore(MOCK_MATCH_RESULT.newVibeScore), 800);
    return () => clearTimeout(t);
  }, []);

  const ratings = [
    { id: "fire", icon: Flame, label: "FIRE" },
    { id: "good", icon: ThumbsUp, label: "GOOD" },
    { id: "meh", icon: Meh, label: "MEH" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex w-full max-w-md flex-col items-center gap-4"
    >
      {/* Outcome */}
      <Card className="w-full overflow-hidden border-secondary/20 bg-card/80 backdrop-blur-sm">
        <div className="h-1 w-full" style={{ background: "var(--gradient-success)" }} />
        <CardContent className="p-5 text-center">
          <Crosshair className="mx-auto mb-2 h-8 w-8 text-secondary" />
          <h2 className="font-display text-3xl font-bold text-secondary text-glow-green">VICTORY</h2>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            FOUND IN{" "}
            <span className="font-bold text-secondary">{MOCK_MATCH_RESULT.foundInSeconds}s</span>
          </p>
          <div className="mt-4 flex justify-center gap-8">
            <Stat label="SOL" value={`+${MOCK_MATCH_RESULT.solEarned}`} color="text-secondary" />
            <Stat label="XP" value={`+${MOCK_MATCH_RESULT.xpGained}`} color="text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Vibe Score */}
      <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                VIBE SCORE
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <motion.span
                key={vibeScore}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="font-mono text-3xl font-bold text-foreground"
              >
                {vibeScore}
              </motion.span>
              <span className="font-mono text-xs font-bold text-secondary">
                +{MOCK_MATCH_RESULT.newVibeScore - MOCK_USER.vibeScore}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cross-app reputation */}
      <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="space-y-2.5 p-4">
          <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
            REPUTATION UPDATE
          </p>
          {MOCK_REPUTATION.map((rep, i) => (
            <motion.div
              key={rep.app}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center justify-between"
            >
              <span className="font-mono text-xs text-foreground">{rep.app}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  {rep.app === "Find60" ? MOCK_MATCH_RESULT.newVibeScore : rep.score}
                </span>
                {rep.app === "Find60" && (
                  <span className="rounded border border-secondary/30 bg-secondary/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-secondary">
                    +3
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Opponent */}
      <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-10 w-10 rounded-lg border border-border">
            <AvatarImage src={MOCK_OPPONENT.avatar} />
            <AvatarFallback className="rounded-lg bg-muted font-mono text-[10px]">AH</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-foreground">{MOCK_OPPONENT.displayName}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{MOCK_OPPONENT.username}</p>
          </div>
          <Button
            size="sm"
            variant={followed ? "secondary" : "default"}
            onClick={() => setFollowed(true)}
            className="rounded-lg font-mono text-[10px] font-bold"
          >
            <UserPlus className="mr-1 h-3 w-3" />
            {followed ? "FOLLOWING" : "FOLLOW"}
          </Button>
        </CardContent>
      </Card>

      {/* Rate */}
      <div className="w-full space-y-2">
        <p className="text-center font-mono text-[10px] tracking-widest text-muted-foreground">
          RATE MATCH
        </p>
        <div className="flex justify-center gap-2">
          {ratings.map((r) => {
            const Icon = r.icon;
            const isActive = rating === r.id;
            return (
              <Button
                key={r.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setRating(r.id)}
                className={`rounded-lg font-mono text-[10px] font-bold ${
                  isActive ? "glow-blue" : ""
                }`}
              >
                <Icon className="mr-1 h-3.5 w-3.5" />
                {r.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex w-full gap-2">
        <Button
          variant="outline"
          onClick={onHome}
          className="flex-1 rounded-xl border-border/50 font-mono text-xs"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          EXIT
        </Button>
        <Button
          onClick={onRestart}
          className="flex-1 rounded-xl bg-primary font-mono text-xs font-bold text-primary-foreground glow-blue"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          AGAIN
        </Button>
      </div>
    </motion.div>
  );
};

const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="text-center">
    <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
    <p className="font-mono text-[8px] tracking-widest text-muted-foreground">{label}</p>
  </div>
);

export default DemoResults;
