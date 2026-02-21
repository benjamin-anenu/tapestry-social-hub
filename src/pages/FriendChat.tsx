import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft, Info, Send, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";

// Animated typing dots component
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 6 }}
    className="flex justify-start"
  >
    <div className="flex items-center gap-1 rounded-2xl bg-card px-4 py-3 border border-border/50">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  </motion.div>
);

interface Message {
  id: string;
  text: string;
  isMe: boolean;
  createdAt: string;
  isVibeHistory?: boolean;
}

interface FriendInfo {
  id: string;
  username: string | null;
  displayName: string | null;
  realName: string | null;
  city: string | null;
  country: string | null;
  xHandle: string | null;
  instagramHandle: string | null;
  bioText: string | null;
  isOnline: boolean;
}

const FriendChat = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [friend, setFriend] = useState<FriendInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const INPUT_BAR_H = 60;
  const [inputTop, setInputTop] = useState(window.innerHeight - INPUT_BAR_H);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  // === KEYBOARD-AWARE LAYOUT via visualViewport (WhatsApp-style) ===
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const top = vv.height + vv.offsetTop - INPUT_BAR_H;
      setInputTop(Math.max(0, top));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Load friend profile + conversation + vibe history
  useEffect(() => {
    if (!walletAddress || !friendId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // My profile
        const { data: me } = await supabase
          .from("profiles")
          .select("id, wallet_address")
          .eq("wallet_address", walletAddress)
          .single();
        if (!me || cancelled) return;
        setMyProfileId(me.id);

        // Friend profile
        const { data: fp } = await supabase
          .from("profiles")
          .select("id, username, display_name, real_name, city, country, x_handle, instagram_handle, bio_text, is_online")
          .eq("id", friendId)
          .single();
        if (!fp || cancelled) return;
        setFriend({
          id: fp.id,
          username: fp.username,
          displayName: fp.display_name,
          realName: fp.real_name,
          city: fp.city,
          country: fp.country,
          xHandle: fp.x_handle,
          instagramHandle: fp.instagram_handle,
          bioText: fp.bio_text,
          isOnline: fp.is_online,
        });

        // Get conversation to find vibe_session_id
        const { data: convo } = await supabase
          .from("conversations")
          .select("id, vibe_session_id")
          .or(
            `and(participant_a.eq.${me.id},participant_b.eq.${friendId}),and(participant_a.eq.${friendId},participant_b.eq.${me.id})`
          )
          .maybeSingle();

        const allMessages: Message[] = [];

        // Load vibe history if available
        if (convo?.vibe_session_id) {
          const { data: vibeSession } = await supabase
            .from("vibe_sessions")
            .select("chat_log, user_a_id")
            .eq("id", convo.vibe_session_id)
            .single();

          if (vibeSession?.chat_log && Array.isArray(vibeSession.chat_log)) {
            const vibeMessages = (vibeSession.chat_log as Array<{ sender: string; text: string; time?: number }>).map(
              (m, i) => ({
                id: `vibe-${i}`,
                text: m.text,
                isMe: m.sender === walletAddress || m.sender === me.id,
                createdAt: "",
                isVibeHistory: true,
              })
            );
            allMessages.push(...vibeMessages);
          }
        }

        // Load direct messages
        if (convo) {
          const { data: dms } = await supabase
            .from("direct_messages")
            .select("id, sender_id, text, created_at")
            .or(
              `and(sender_id.eq.${me.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${me.id})`
            )
            .order("created_at", { ascending: true })
            .limit(50);

          if (dms) {
            allMessages.push(
              ...dms.map(dm => ({
                id: dm.id,
                text: dm.text,
                isMe: dm.sender_id === me.id,
                createdAt: dm.created_at,
              }))
            );
          }
        }

        if (!cancelled) {
          setMessages(allMessages);
          scrollToBottom();
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [walletAddress, friendId, scrollToBottom]);

  // Realtime subscription for new DMs
  useEffect(() => {
    if (!myProfileId || !friendId) return;

    const channel = supabase
      .channel(`dm-${myProfileId}-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const dm = payload.new as { id: string; sender_id: string; receiver_id: string; text: string; created_at: string };
          // Only process messages in this conversation
          const isRelevant =
            (dm.sender_id === myProfileId && dm.receiver_id === friendId) ||
            (dm.sender_id === friendId && dm.receiver_id === myProfileId);
          if (!isRelevant) return;
          // Hide friend typing indicator when their message arrives
          if (dm.sender_id === friendId) setFriendIsTyping(false);
          // Avoid duplicates
          setMessages(prev => {
            if (prev.some(m => m.id === dm.id)) return prev;
            return [...prev, {
              id: dm.id,
              text: dm.text,
              isMe: dm.sender_id === myProfileId,
              createdAt: dm.created_at,
            }];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myProfileId, friendId, scrollToBottom]);

  // Show "user is typing" dot while composing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsTyping(e.target.value.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (e.target.value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || !myProfileId || !friendId || sending) return;
    setSending(true);
    setInputValue("");
    setIsTyping(false);

    // Show typing indicator on friend's side after sending (for bot replies)
    setFriendIsTyping(true);
    // Auto-hide typing indicator after 8s as safety fallback
    const typingFallback = setTimeout(() => setFriendIsTyping(false), 8000);

    try {
      const resp = await supabase.functions.invoke("direct-chat", {
        body: { senderProfileId: myProfileId, receiverProfileId: friendId, text },
      });
      if (resp.error) throw resp.error;
    } catch {
      // Re-add text on failure
      setInputValue(text);
      setFriendIsTyping(false);
    } finally {
      setSending(false);
      clearTimeout(typingFallback);
    }
  };

  const friendName = friend?.displayName ?? friend?.username ?? "Chat";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* LAYER 1: Fixed header — never moves */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 border-b border-border/50 bg-card/80 px-4 py-3 backdrop-blur-sm h-14">
        <Button variant="ghost" size="icon" onClick={() => navigate("/play/friends")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
          {friendName[0]?.toUpperCase() ?? "?"}
          {friend?.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-secondary" />
          )}
        </div>
        <div className="flex flex-1 flex-col">
          <span className="font-display text-sm font-bold text-foreground">{friendName}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {friend?.isOnline ? "online" : "offline"}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)}>
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* LAYER 2: Chat body — bottom adjusts to input bar position */}
      <div
        className="fixed top-14 left-0 right-0 flex flex-col bg-background"
        style={{ bottom: `${window.innerHeight - inputTop}px` }}
      >
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.length > 0 && messages[0]?.isVibeHistory && (
            <div className="flex items-center gap-2 py-2">
              <div className="h-px flex-1 bg-border/50" />
              <span className="font-mono text-[9px] tracking-widest text-muted-foreground/60">VIBE MATCH HISTORY</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => {
              // Show separator between vibe history and DMs
              const showDmSeparator =
                msg.isVibeHistory !== true &&
                i > 0 &&
                messages[i - 1]?.isVibeHistory === true;

              return (
                <div key={msg.id}>
                  {showDmSeparator && (
                    <div className="flex items-center gap-2 py-3">
                      <div className="h-px flex-1 bg-primary/20" />
                      <span className="font-mono text-[9px] tracking-widest text-primary/50">DIRECT MESSAGES</span>
                      <div className="h-px flex-1 bg-primary/20" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 font-mono text-xs leading-relaxed ${
                        msg.isVibeHistory
                          ? msg.isMe
                            ? "bg-primary/10 text-primary/70 border border-primary/10"
                            : "bg-muted/30 text-muted-foreground/70 border border-border/30"
                          : msg.isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-foreground border border-border/50"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicators */}
          <AnimatePresence>
            {friendIsTyping && <TypingIndicator key="friend-typing" />}
          </AnimatePresence>

          {messages.length === 0 && !friendIsTyping && (
            <p className="py-12 text-center font-mono text-[11px] italic text-muted-foreground/50">
              Say something to keep the vibe going...
            </p>
          )}
        </div>
      </div>

      {/* LAYER 3: Input bar — tracks keyboard via translateY */}
      <div
        className="fixed top-0 left-0 right-0 z-50 border-t border-border/50 bg-card/50 px-3 pt-3 backdrop-blur-sm"
        style={{ transform: `translateY(${inputTop}px)`, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            maxLength={500}
            className="h-10 flex-1 rounded-full border-border/30 bg-background/50 px-4 font-mono text-base"
          />
          <button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Profile Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-display text-2xl font-bold text-primary">
              {friendName[0]?.toUpperCase() ?? "?"}
            </div>
            <DrawerTitle className="font-display text-lg">{friendName}</DrawerTitle>
            <DrawerDescription>
              {friend?.isOnline ? "🟢 Online" : "⚫ Offline"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-3 px-6 pb-8">
            {friend?.realName && (
              <div>
                <span className="font-mono text-[9px] tracking-widest text-muted-foreground">REAL NAME</span>
                <p className="text-sm text-foreground">{friend.realName}</p>
              </div>
            )}
            {(friend?.city || friend?.country) && (
              <div>
                <span className="font-mono text-[9px] tracking-widest text-muted-foreground">LOCATION</span>
                <p className="text-sm text-foreground">
                  {[friend.city, friend.country].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
            {(friend?.xHandle || friend?.instagramHandle) && (
              <div>
                <span className="font-mono text-[9px] tracking-widest text-muted-foreground">SOCIALS</span>
                <div className="flex gap-3 pt-1">
                  {friend.xHandle && (
                    <a href={`https://x.com/${friend.xHandle}`} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline">
                      @{friend.xHandle}
                    </a>
                  )}
                  {friend.instagramHandle && (
                    <a href={`https://instagram.com/${friend.instagramHandle}`} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline">
                      IG: {friend.instagramHandle}
                    </a>
                  )}
                </div>
              </div>
            )}
            {friend?.bioText && (
              <div>
                <span className="font-mono text-[9px] tracking-widest text-muted-foreground">BIO</span>
                <p className="text-sm leading-relaxed text-foreground">{friend.bioText}</p>
              </div>
            )}
            <Button disabled className="mt-4 gap-2 opacity-50">
              <Lock className="h-3.5 w-3.5" /> Challenge — Coming Soon
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default FriendChat;
