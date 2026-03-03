import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PendingChallenge {
  gameId: string;
  challengerName: string;
  stakeAmount: number;
}

interface ChickenChallengeAlertProps {
  myProfileId: string;
  walletAddress: string;
}

const ChickenChallengeAlert = ({ myProfileId, walletAddress }: ChickenChallengeAlertProps) => {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<PendingChallenge | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!myProfileId) return;

    // Check for existing pending challenges on mount
    const checkExisting = async () => {
      const { data } = await supabase
        .from("chicken_games")
        .select("id, stake_amount, player_a_id")
        .eq("challenge_target_id", myProfileId)
        .eq("status", "challenge_pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const { data: challenger } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", data.player_a_id)
          .single();

        setChallenge({
          gameId: data.id,
          challengerName: challenger?.display_name || challenger?.username || "Someone",
          stakeAmount: data.stake_amount,
        });
      }
    };
    checkExisting();

    // Subscribe for new challenges
    const channel = supabase
      .channel(`challenge-alert-${myProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chicken_games",
          filter: `challenge_target_id=eq.${myProfileId}`,
        },
        async (payload) => {
          const game = payload.new as Record<string, unknown>;
          if (game.status !== "challenge_pending") return;

          const { data: challenger } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", game.player_a_id as string)
            .single();

          setChallenge({
            gameId: game.id as string,
            challengerName: challenger?.display_name || challenger?.username || "Someone",
            stakeAmount: game.stake_amount as number,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chicken_games",
          filter: `challenge_target_id=eq.${myProfileId}`,
        },
        (payload) => {
          const game = payload.new as Record<string, unknown>;
          // Clear if challenge was cancelled/declined
          if (game.status !== "challenge_pending" && challenge?.gameId === game.id) {
            setChallenge(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myProfileId]);

  const handleRespond = async (accept: boolean) => {
    if (!challenge) return;
    setResponding(true);

    try {
      const { data, error } = await supabase.functions.invoke("chicken-respond", {
        body: { gameId: challenge.gameId, walletAddress, accept },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (accept) {
        navigate(`/play/chicken?gameId=${challenge.gameId}`);
      }
      setChallenge(null);
    } catch (err) {
      console.error("Failed to respond to challenge:", err);
    } finally {
      setResponding(false);
    }
  };

  return (
    <AnimatePresence>
      {challenge && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-destructive/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <Flame className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-foreground">
                🔥 Chicken Challenge!
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{challenge.challengerName}</span>{" "}
                wants to play for {challenge.stakeAmount} SOL
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRespond(true)}
                  disabled={responding}
                  className="gap-1 text-xs"
                  style={{ backgroundImage: "var(--gradient-danger)" }}
                >
                  <Check className="h-3 w-3" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRespond(false)}
                  disabled={responding}
                  className="gap-1 text-xs text-muted-foreground"
                >
                  <X className="h-3 w-3" /> Decline
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChickenChallengeAlert;
