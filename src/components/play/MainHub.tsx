import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Users, Gamepad2, ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";

const CIRCLE_LAST_VISIT_KEY = "circle_last_visit";

const useUnreadDMs = (walletAddress: string | null) => {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const lastVisit = localStorage.getItem(CIRCLE_LAST_VISIT_KEY);

        const { data: myProfile } = await supabase.
        from("profiles").
        select("id").
        eq("wallet_address", walletAddress).
        single();
        if (!myProfile || cancelled) return;

        // Get all conversations I'm in
        const { data: convos } = await supabase.
        from("conversations").
        select("participant_a, participant_b").
        or(`participant_a.eq.${myProfile.id},participant_b.eq.${myProfile.id}`);

        if (!convos?.length || cancelled) return;

        const friendIds = convos.map((c) =>
        c.participant_a === myProfile.id ? c.participant_b : c.participant_a
        );

        // Count messages sent to me since last visit
        let query = supabase.
        from("direct_messages").
        select("id", { count: "exact", head: true }).
        eq("receiver_id", myProfile.id).
        in("sender_id", friendIds);

        if (lastVisit) {
          query = query.gt("created_at", lastVisit);
        }

        const { count } = await query;
        if (!cancelled) setUnread(count ?? 0);
      } catch {




        // non-critical
      }};fetchUnread();return () => {cancelled = true;};
  }, [walletAddress]);

  return unread;
};

const MainHub = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const unreadCount = useUnreadDMs(walletAddress);

  const hubCards = [
  {
    title: "Make Friends",
    desc: "60s vibe check with a random stranger",
    icon: Heart,
    path: "/play/vibe",
    gradient: "var(--gradient-primary)",
    glow: "glow-blue",
    disabled: false,
    badge: null
  },
  {
    title: "My Circle",
    desc: "Your friends & mutual connections",
    icon: Users,
    path: "/play/friends",
    gradient: "var(--gradient-success)",
    glow: "glow-green",
    disabled: false,
    badge: unreadCount > 0 ? unreadCount : null
  },
  {
    title: "Game Arena",
    desc: "Challenge friends to staked games",
    icon: Gamepad2,
    path: "/play/arena",
    gradient: "var(--gradient-danger)",
    glow: "glow-red",
    disabled: true,
    badge: null
  }];


  const handleNav = (card: typeof hubCards[0]) => {
    if (card.disabled) return;
    if (card.path === "/play/friends") {
      localStorage.setItem(CIRCLE_LAST_VISIT_KEY, new Date().toISOString());
    }
    navigate(card.path);
  };

  return (
    <div className="flex w-full max-w-md lg:max-w-lg flex-col gap-4">
      {hubCards.map((card, i) =>
      <motion.button
        key={card.path}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        onClick={() => handleNav(card)}
        disabled={card.disabled}
        className={`group relative flex items-center gap-4 rounded-2xl border border-border/50 bg-card/80 p-5 text-left backdrop-blur-sm transition-all ${
        card.disabled ?
        "cursor-not-allowed opacity-50" :
        `hover:border-primary/30 hover:${card.glow}`}`
        }>

          <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundImage: card.gradient }}>

            {card.disabled ?
          <Lock className="h-6 w-6 text-primary-foreground" /> :

          <card.icon className="h-6 w-6 text-primary-foreground" />
          }
          </div>
          <div className="flex flex-1 flex-col items-start gap-0.5">
            <span className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              {card.title}
              {card.disabled &&
            <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[9px] uppercase tracking-wider">
                  Coming Soon
                </Badge>
            }
            </span>
            <span className="font-mono text-[10px] text-muted-foreground w-full text-left">
              {card.desc}
            </span>
          </div>
          {/* Unread badge */}
          {card.badge !== null &&
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex h-6 min-w-6 items-center justify-center rounded-full bg-secondary px-1.5 font-display text-xs font-bold text-secondary-foreground">

              {card.badge > 99 ? "99+" : card.badge}
            </motion.div>
        }
          {!card.disabled && card.badge === null &&
        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        }
          {!card.disabled && card.badge !== null &&
        <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
        }
        </motion.button>
      )}
    </div>);

};

export default MainHub;