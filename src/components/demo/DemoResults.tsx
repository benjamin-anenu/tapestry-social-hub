import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Flame, ThumbsUp, Meh, UserPlus, ArrowLeft, RotateCcw,
  TrendingUp, Crosshair, Coins, Share2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  MOCK_USER, MOCK_OPPONENT, MOCK_MATCH_RESULT,
  MOCK_REPUTATION, MOCK_BOUNTY, MOCK_PROGRESSION,
} from "@/lib/mock-data";

interface DemoResultsProps {
  onRestart: () => void;
  onHome: () => void;
  onNext?: () => void;
}

const DemoResults = ({ onRestart, onHome, onNext }: DemoResultsProps) => {
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

  const prog = MOCK_PROGRESSION.hunter;
  const progressPct = ((prog.points - 100) / (prog.nextThreshold - 100)) * 100;

  // Bounty breakdown
  const timeMultiplier = 1.5; // 43 seconds = 40-55 range
  const baseBounty = MOCK_BOUNTY.base;
  const fieldBonus = 2 * MOCK_BOUNTY.perOptionalField;
  const diffBonus = MOCK_BOUNTY.difficultyBonuses.complexPuzzle;
  const totalBounty = (baseBounty + fieldBonus + diffBonus) * timeMultiplier;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex w-full max-w-md flex-col items-center gap-4"
    >
      {/* Victory */}
      <Card className="w-full overflow-hidden border-secondary/20 bg-card/80 backdrop-blur-sm">
        <div className="h-1 w-full" style={{ background: "var(--gradient-success)" }} />
        <CardContent className="p-5 text-center">
          <Crosshair className="mx-auto mb-2 h-8 w-8 text-secondary" />
          <h2 className="font-display text-3xl font-bold text-secondary text-glow-green">
            HUNTED SUCCESSFULLY!
          </h2>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            Found in{" "}
            <span className="font-bold text-secondary">{MOCK_MATCH_RESULT.foundInSeconds}s</span>
          </p>
        </CardContent>
      </Card>

      {/* Bounty Breakdown */}
      <Card className="w-full border-secondary/20 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-3.5 w-3.5 text-secondary" />
            <span className="font-mono text-[9px] tracking-widest text-secondary">BOUNTY BREAKDOWN</span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Base bounty</span>
              <span>{baseBounty.toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Optional fields (×2)</span>
              <span>+{fieldBonus.toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Complex puzzle bonus</span>
              <span>+{diffBonus.toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Time multiplier</span>
              <span>×{timeMultiplier}</span>
            </div>
            <div className="border-t border-border/50 pt-1 flex justify-between font-bold text-secondary">
              <span>TOTAL</span>
              <span>{totalBounty.toFixed(3)} SOL</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vibe Score + XP */}
      <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground">VIBE SCORE</span>
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

      {/* Progression */}
      <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground">HUNTER RANK</span>
            <span className="font-display text-xs font-bold text-primary">{prog.current}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
            <span>{prog.points} pts</span>
            <span>{prog.nextTier} at {prog.nextThreshold}</span>
          </div>
        </CardContent>
      </Card>

      {/* Opponent Profile Unlocked */}
      <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <p className="font-mono text-[9px] tracking-widest text-secondary mb-3">PROFILE UNLOCKED</p>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 rounded-lg border border-border">
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
              {followed ? "SENT" : "CONNECT"}
            </Button>
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
                className={`rounded-lg font-mono text-[10px] font-bold ${isActive ? "glow-blue" : ""}`}
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
        {onNext ? (
          <Button
            onClick={onNext}
            className="flex-1 rounded-xl bg-primary font-mono text-xs font-bold text-primary-foreground glow-blue"
          >
            AGENT DEMO
            <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={onRestart}
            className="flex-1 rounded-xl bg-primary font-mono text-xs font-bold text-primary-foreground glow-blue"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            AGAIN
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default DemoResults;
