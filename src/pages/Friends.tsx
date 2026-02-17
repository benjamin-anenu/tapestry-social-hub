import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft, Users, Loader2, UserPlus, Gamepad2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface FriendProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  real_name: string | null;
  x_handle: string | null;
  instagram_handle: string | null;
  bio_text: string | null;
  vibe_score: number | null;
  mutual: boolean;
}

const FriendCard = ({ friend, onChallenge }: { friend: FriendProfile; onChallenge: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-4 rounded-2xl border border-border/50 bg-card/80 p-4 backdrop-blur-sm"
  >
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-lg font-bold text-primary">
      {(friend.username ?? "?")[0].toUpperCase()}
    </div>
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-bold text-foreground">
          {friend.username ?? friend.display_name ?? "Unknown"}
        </span>
        {friend.mutual && (
          <span className="rounded-full bg-secondary/10 px-2 py-0.5 font-mono text-[9px] font-bold text-secondary">
            MUTUAL
          </span>
        )}
      </div>
      {friend.city && (
        <span className="font-mono text-[10px] text-muted-foreground">
          {friend.city}{friend.country ? `, ${friend.country}` : ""}
        </span>
      )}
      {/* Only show private details for mutual friends */}
      {friend.mutual && friend.real_name && (
        <span className="font-mono text-[10px] text-accent-foreground">
          {friend.real_name}
        </span>
      )}
      {friend.mutual && (friend.x_handle || friend.instagram_handle) && (
        <div className="flex gap-2 pt-0.5">
          {friend.x_handle && (
            <a
              href={`https://x.com/${friend.x_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-primary hover:underline"
            >
              @{friend.x_handle}
            </a>
          )}
          {friend.instagram_handle && (
            <a
              href={`https://instagram.com/${friend.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-primary hover:underline"
            >
              IG: {friend.instagram_handle}
            </a>
          )}
        </div>
      )}
      {friend.mutual && friend.bio_text && (
        <p className="pt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">{friend.bio_text}</p>
      )}
    </div>
    {friend.mutual && (
      <Button
        size="sm"
        variant="outline"
        onClick={onChallenge}
        className="shrink-0 gap-1 border-border/50 font-mono text-[10px]"
      >
        <Gamepad2 className="h-3 w-3" /> Challenge
      </Button>
    )}
  </motion.div>
);

const Friends = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;

    const fetchFriends = async () => {
      setLoading(true);
      try {
        // Get my profile id first
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("wallet_address", walletAddress)
          .single();

        if (!myProfile || cancelled) { setLoading(false); return; }

        // Get friendships where I'm involved
        const { data: friendships } = await supabase
          .from("friendships")
          .select("follower_id, following_id, mutual")
          .or(`follower_id.eq.${myProfile.id},following_id.eq.${myProfile.id}`);

        if (!friendships?.length || cancelled) { setLoading(false); return; }

        // Collect friend profile IDs
        const friendIds = new Set<string>();
        const mutualMap = new Map<string, boolean>();
        for (const f of friendships) {
          const friendId = f.follower_id === myProfile.id ? f.following_id : f.follower_id;
          friendIds.add(friendId);
          // Mark mutual if any record says mutual
          if (f.mutual) mutualMap.set(friendId, true);
          else if (!mutualMap.has(friendId)) mutualMap.set(friendId, false);
        }

        if (friendIds.size === 0 || cancelled) { setLoading(false); return; }

        // Fetch profiles - RLS will handle hiding sensitive fields for non-mutual
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, city, country, real_name, x_handle, instagram_handle, bio_text, vibe_score")
          .in("id", Array.from(friendIds));

        if (cancelled) return;

        const result: FriendProfile[] = (profiles ?? []).map((p) => ({
          ...p,
          mutual: mutualMap.get(p.id) ?? false,
        }));

        // Sort: mutual first, then alphabetical
        result.sort((a, b) => {
          if (a.mutual !== b.mutual) return a.mutual ? -1 : 1;
          return (a.username ?? "").localeCompare(b.username ?? "");
        });

        setFriends(result);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFriends();
    return () => { cancelled = true; };
  }, [walletAddress]);

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background grid-bg overflow-hidden scanlines">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10">
            <Users className="h-7 w-7 text-secondary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            My <span className="text-secondary text-glow-green">Circle</span>
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground">
            {friends.length} connection{friends.length !== 1 ? "s" : ""}
          </p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="font-mono text-xs text-muted-foreground">Loading your circle...</p>
          </div>
        ) : friends.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-12 text-center">
            <Heart className="h-10 w-10 text-muted-foreground/30" />
            <p className="max-w-xs font-mono text-xs leading-relaxed text-muted-foreground">
              No connections yet. Go make some friends in the Vibe Match!
            </p>
            <Button
              onClick={() => navigate("/play/vibe")}
              className="gap-2 font-display font-bold"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <UserPlus className="h-4 w-4" /> Start Vibing
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-3">
              {friends.map((f, i) => (
                <FriendCard
                  key={f.id}
                  friend={f}
                  onChallenge={() => navigate("/play/arena")}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Back */}
        <Button variant="ghost" onClick={() => navigate("/play")} className="mx-auto text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
        </Button>
      </div>
    </div>
  );
};

export default Friends;
