import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, ThumbsUp, Meh, UserPlus, ArrowLeft, RotateCcw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    { id: "fire", icon: Flame, label: "Fire" },
    { id: "good", icon: ThumbsUp, label: "Good" },
    { id: "meh", icon: Meh, label: "Meh" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex w-full max-w-md flex-col items-center gap-5"
    >
      {/* Outcome */}
      <Card className="w-full overflow-hidden">
        <div className="h-1.5 w-full" style={{ backgroundImage: "var(--gradient-primary)" }} />
        <CardContent className="p-5 text-center">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-secondary" />
          <h2 className="font-display text-2xl font-bold text-foreground">Victory!</h2>
          <p className="text-muted-foreground">
            Found in <span className="font-bold text-secondary">{MOCK_MATCH_RESULT.foundInSeconds}s</span>
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <Stat label="SOL Earned" value={`+${MOCK_MATCH_RESULT.solEarned}`} />
            <Stat label="XP Gained" value={`+${MOCK_MATCH_RESULT.xpGained}`} />
          </div>
        </CardContent>
      </Card>

      {/* Vibe Score Update */}
      <Card className="w-full">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-foreground">Vibe Score</span>
            </div>
            <div className="flex items-baseline gap-1">
              <motion.span
                key={vibeScore}
                initial={{ scale: 1.4, color: "hsl(174,60%,48%)" }}
                animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                className="font-display text-3xl font-bold"
              >
                {vibeScore}
              </motion.span>
              <span className="text-xs text-secondary font-medium">
                +{MOCK_MATCH_RESULT.newVibeScore - MOCK_USER.vibeScore}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cross-app Reputation */}
      <Card className="w-full">
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reputation Update</p>
          {MOCK_REPUTATION.map((rep, i) => (
            <motion.div
              key={rep.app}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-foreground">{rep.app}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{rep.app === "Find60" ? MOCK_MATCH_RESULT.newVibeScore : rep.score}</span>
                {rep.app === "Find60" && (
                  <Badge variant="secondary" className="text-[10px]">+3</Badge>
                )}
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Opponent + Follow */}
      <Card className="w-full">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={MOCK_OPPONENT.avatar} />
            <AvatarFallback>AH</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-display font-bold text-foreground">{MOCK_OPPONENT.displayName}</p>
            <p className="text-xs text-muted-foreground">{MOCK_OPPONENT.username}</p>
          </div>
          <Button
            size="sm"
            variant={followed ? "secondary" : "default"}
            onClick={() => setFollowed(true)}
            className="rounded-full"
          >
            <UserPlus className="mr-1 h-3 w-3" />
            {followed ? "Following" : "Follow"}
          </Button>
        </CardContent>
      </Card>

      {/* Rate Match */}
      <div className="w-full space-y-2">
        <p className="text-center text-sm text-muted-foreground">Rate this match</p>
        <div className="flex justify-center gap-3">
          {ratings.map((r) => {
            const Icon = r.icon;
            const isActive = rating === r.id;
            return (
              <Button
                key={r.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setRating(r.id)}
                className="rounded-full"
              >
                <Icon className="mr-1 h-4 w-4" />
                {r.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex w-full gap-3">
        <Button variant="outline" onClick={onHome} className="flex-1 rounded-2xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Home
        </Button>
        <Button
          onClick={onRestart}
          className="flex-1 rounded-2xl font-display font-semibold"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Play Again
        </Button>
      </div>
    </motion.div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <p className="font-display text-xl font-bold text-foreground">{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
  </div>
);

export default DemoResults;
