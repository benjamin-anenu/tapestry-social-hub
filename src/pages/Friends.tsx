import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft, Users, Loader2, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ConversationPreview {
  conversationId: string;
  friendProfileId: string;
  username: string | null;
  displayName: string | null;
  isOnline: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

const ConversationRow = ({ convo, onClick }: { convo: ConversationPreview; onClick: () => void }) => {
  const name = convo.displayName ?? convo.username ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const timeAgo = convo.lastMessageAt
    ? formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: false })
    : "";

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-card/80 active:bg-card"
    >
      {/* Avatar */}
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-bold text-primary">
        {initial}
        {convo.isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-secondary" />
        )}
      </div>

      {/* Name + preview */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate font-display text-sm font-bold text-foreground">{name}</span>
        {convo.lastMessage ? (
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {convo.lastMessage}
          </span>
        ) : (
          <span className="font-mono text-[11px] italic text-muted-foreground/50">
            Start chatting...
          </span>
        )}
      </div>

      {/* Timestamp */}
      {timeAgo && (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{timeAgo}</span>
      )}
    </motion.button>
  );
};

const Friends = () => {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;

    const fetch_ = async () => {
      setLoading(true);
      try {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("wallet_address", walletAddress)
          .single();
        if (!myProfile || cancelled) { setLoading(false); return; }

        // Get conversations where I'm a participant
        const { data: convos } = await supabase
          .from("conversations")
          .select("id, participant_a, participant_b, last_message_text, last_message_at")
          .or(`participant_a.eq.${myProfile.id},participant_b.eq.${myProfile.id}`)
          .order("last_message_at", { ascending: false, nullsFirst: false });

        if (!convos?.length || cancelled) { setLoading(false); return; }

        // Get friend profile IDs
        const friendIds = convos.map(c =>
          c.participant_a === myProfile.id ? c.participant_b : c.participant_a
        );

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, is_online")
          .in("id", friendIds);

        if (cancelled) return;

        const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

        const result: ConversationPreview[] = convos.map(c => {
          const friendId = c.participant_a === myProfile.id ? c.participant_b : c.participant_a;
          const p = profileMap.get(friendId);
          return {
            conversationId: c.id,
            friendProfileId: friendId,
            username: p?.username ?? null,
            displayName: p?.display_name ?? null,
            isOnline: p?.is_online ?? false,
            lastMessage: c.last_message_text,
            lastMessageAt: c.last_message_at,
          };
        });

        setConversations(result);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch_();
    return () => { cancelled = true; };
  }, [walletAddress]);

  const filtered = search
    ? conversations.filter(c =>
        (c.displayName ?? c.username ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  if (!connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <p className="font-mono text-sm text-muted-foreground">
            Connect your wallet first to access this page.
          </p>
          <Button onClick={() => navigate("/play")}>Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background grid-bg overflow-hidden scanlines">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 text-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10">
            <Users className="h-6 w-6 text-secondary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            My <span className="text-secondary text-glow-green">Circle</span>
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground">
            {conversations.length} chat{conversations.length !== 1 ? "s" : ""}
          </p>
        </motion.div>

        {/* Search */}
        {conversations.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-9 pl-9 font-mono text-xs border-border/30 bg-card/50"
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="font-mono text-xs text-muted-foreground">Loading chats...</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-12 text-center">
            <Heart className="h-10 w-10 text-muted-foreground/30" />
            <p className="max-w-xs font-mono text-xs leading-relaxed text-muted-foreground">
              {search ? "No matches found." : "No connections yet. Go make some friends in the Vibe Match!"}
            </p>
            {!search && (
              <Button
                onClick={() => navigate("/play/vibe")}
                className="gap-2 font-display font-bold"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                Start Vibing
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map(c => (
              <ConversationRow
                key={c.conversationId}
                convo={c}
                onClick={() => navigate(`/play/friends/${c.friendProfileId}`)}
              />
            ))}
          </div>
        )}

        {/* Back */}
        <Button variant="ghost" onClick={() => navigate("/play")} className="mx-auto mt-6 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
        </Button>
      </div>
    </div>
  );
};

export default Friends;
