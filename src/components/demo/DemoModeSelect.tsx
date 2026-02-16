import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Ghost, Zap, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MOCK_OPPONENT } from "@/lib/mock-data";

interface DemoModeSelectProps {
  onNext: () => void;
}

type Phase = "select" | "matching" | "matched";

const modes = [
  { id: "finder", label: "Finder", icon: Search, desc: "Find someone in 60 seconds", recommended: true },
  { id: "hider", label: "Hider", icon: Ghost, desc: "Stay hidden for 60 seconds" },
  { id: "duel", label: "Duel", icon: Zap, desc: "Find each other — first wins" },
];

const DemoModeSelect = ({ onNext }: DemoModeSelectProps) => {
  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState("finder");

  const handlePlay = () => {
    setPhase("matching");
    setTimeout(() => setPhase("matched"), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex w-full max-w-md flex-col items-center gap-6"
    >
      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div
            key="select"
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-5"
          >
            <div className="text-center space-y-1">
              <h2 className="font-display text-3xl font-bold text-foreground">Choose Your Mode</h2>
              <p className="text-sm text-muted-foreground">How do you want to play?</p>
            </div>

            <div className="w-full space-y-3">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selected === mode.id;
                return (
                  <motion.div key={mode.id} whileTap={{ scale: 0.98 }}>
                    <Card
                      className={`cursor-pointer transition-all ${isSelected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30"}`}
                      onClick={() => setSelected(mode.id)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isSelected ? "text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          style={isSelected ? { backgroundImage: "var(--gradient-primary)" } : {}}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-lg font-bold text-foreground">{mode.label}</span>
                            {mode.recommended && <Badge className="text-[10px]">Recommended</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{mode.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <Button
              size="lg"
              onClick={handlePlay}
              className="h-12 w-full rounded-2xl font-display font-semibold"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              Find a Match
            </Button>
          </motion.div>
        )}

        {phase === "matching" && (
          <motion.div
            key="matching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-12 w-12 text-primary" />
            </motion.div>
            <div className="text-center space-y-1">
              <p className="font-display text-xl font-bold text-foreground">Smart Matching…</p>
              <p className="text-sm text-muted-foreground">Scanning Tapestry social graph</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="h-2 w-2 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "matched" && (
          <motion.div
            key="matched"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="flex w-full flex-col items-center gap-5"
          >
            <p className="font-display text-xl font-bold text-secondary">Match Found!</p>

            <Card className="w-full border-secondary/30">
              <CardContent className="flex items-center gap-4 p-5">
                <Avatar className="h-14 w-14 border-2 border-secondary/30">
                  <AvatarImage src={MOCK_OPPONENT.avatar} />
                  <AvatarFallback>AH</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-foreground">{MOCK_OPPONENT.displayName}</p>
                  <p className="text-sm text-muted-foreground">{MOCK_OPPONENT.username}</p>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="outline" className="text-[10px]">Find Rate: {MOCK_OPPONENT.findRate}%</Badge>
                    <Badge variant="outline" className="text-[10px]">Vibe: {MOCK_OPPONENT.vibeScore}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              size="lg"
              onClick={onNext}
              className="h-12 w-full rounded-2xl font-display font-semibold"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              Start Game
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DemoModeSelect;
