import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import GameTimer from "@/components/demo/GameTimer";
import ChatZone from "@/components/demo/ChatZone";
import VibeVerdict from "@/components/play/VibeVerdict";

type Phase = "searching" | "chatting" | "verdict" | "result";

interface ChatMessage {
  time: number;
  sender: string;
  text: string;
}

const VibeMatch = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const [phase, setPhase] = useState<Phase>("searching");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("Stranger");
  const [myRole, setMyRole] = useState<"a" | "b">("a");
  const [isBot, setIsBot] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [verdictResult, setVerdictResult] = useState<{
    mutual: boolean;
    botVerdict?: string;
    botReason?: string;
  } | null>(null);
  const lastUserMessageTime = useRef<number>(Date.now());
  const nudgeSentCount = useRef<number>(0);

  // Proactive nudge: if user is silent 15+ seconds during bot chat
  useEffect(() => {
    if (!isBot || phase !== "chatting" || !sessionId || !walletAddress) return;

    const interval = setInterval(async () => {
      const silenceDuration = Date.now() - lastUserMessageTime.current;
      if (silenceDuration >= 15000 && nudgeSentCount.current < 3) {
        nudgeSentCount.current += 1;
        lastUserMessageTime.current = Date.now();
        setIsTyping(true);
        await supabase.functions.invoke("vibe-bot-chat", {
          body: { sessionId, walletAddress, isNudge: true },
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isBot, phase, sessionId, walletAddress]);

  // Find a match on mount
  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;

    const findMatch = async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("vibe-match", {
          body: { walletAddress },
        });
        if (cancelled) return;
        if (fnErr) throw fnErr;
        if (data?.error) {
          setError(data.error);
          return;
        }
        if (data?.sessionId) {
          setSessionId(data.sessionId);
          setMyRole(data.role);
          setPartnerName(data.partnerName ?? "Stranger");
          setIsBot(data.isBot ?? false);
          setPhase("chatting");

          // If bot, load initial greeting from chat_log
          if (data.isBot) {
            const { data: sess } = await supabase
              .from("vibe_sessions")
              .select("chat_log")
              .eq("id", data.sessionId)
              .single();
            if (sess?.chat_log && Array.isArray(sess.chat_log)) {
              setMessages(
                (sess.chat_log as Array<{ sender: string; text: string; time: number }>).map((m) => ({
                  time: m.time,
                  sender: m.sender === walletAddress ? "you" : "them",
                  text: m.text,
                }))
              );
            }
          }
        } else {
          setError("No one online right now — try again in a bit!");
        }
      } catch {
        if (!cancelled) setError("Matchmaking failed. Please try again.");
      }
    };

    findMatch();
    return () => { cancelled = true; };
  }, [walletAddress]);

  // Subscribe to chat updates via Realtime
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`vibe-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "vibe_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (Array.isArray(row.chat_log)) {
            setMessages(
              (row.chat_log as Array<{ sender: string; text: string; time: number }>).map((m) => ({
                time: m.time,
                sender: m.sender === walletAddress ? "you" : "them",
                text: m.text,
              }))
            );
            setIsTyping(false);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, walletAddress]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!sessionId || !walletAddress) return;
    lastUserMessageTime.current = Date.now();

    if (isBot) {
      setIsTyping(true);
      await supabase.functions.invoke("vibe-bot-chat", {
        body: { sessionId, walletAddress, text },
      });
    } else {
      await supabase.functions.invoke("vibe-chat", {
        body: { sessionId, walletAddress, text },
      });
    }
  }, [sessionId, walletAddress, isBot]);

  const handleTimerComplete = useCallback(() => {
    setPhase("verdict");
  }, []);

  const handleVerdict = useCallback(async (verdict: "vibe" | "nah") => {
    if (!sessionId || !walletAddress) return;
    try {
      if (isBot) {
        const { data } = await supabase.functions.invoke("vibe-bot-verdict", {
          body: { sessionId, walletAddress, userVerdict: verdict },
        });
        setVerdictResult(data);
      } else {
        const { data } = await supabase.functions.invoke("vibe-verdict", {
          body: { sessionId, walletAddress, verdict },
        });
        setVerdictResult(data);
      }
      setPhase("result");
    } catch {
      setError("Failed to submit verdict.");
    }
  }, [sessionId, walletAddress, isBot]);

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background grid-bg overflow-hidden scanlines">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
        <AnimatePresence mode="wait">
          {/* SEARCHING */}
          {phase === "searching" && !error && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Finding a <span className="text-primary text-glow-blue">Vibe</span></h2>
              <p className="font-mono text-xs text-muted-foreground">Scanning for online users near you...</p>
            </motion.div>
          )}

          {/* ERROR */}
          {error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
              <Zap className="h-10 w-10 text-muted-foreground" />
              <p className="font-mono text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => navigate("/play")} variant="ghost" className="font-mono text-sm">
                Back to Hub
              </Button>
            </motion.div>
          )}

          {/* CHATTING */}
          {phase === "chatting" && (
            <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">
                  Vibing with <span className="text-primary font-bold">{partnerName}</span>
                </p>
              </div>
              <GameTimer duration={60} speed={1000} onTick={setTimeLeft} onComplete={handleTimerComplete} />
              <div className="h-[350px]">
                <ChatZone
                  timeLeft={0}
                  messages={messages}
                  clueDrops={[]}
                  onSendMessage={handleSendMessage}
                />
              </div>
              {isTyping && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-xs text-muted-foreground italic"
                >
                  {partnerName} is typing...
                </motion.p>
              )}
            </motion.div>
          )}

          {/* VERDICT */}
          {phase === "verdict" && (
            <motion.div key="verdict" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <VibeVerdict onVerdict={handleVerdict} partnerName={partnerName} />
            </motion.div>
          )}

          {/* RESULT */}
          {phase === "result" && verdictResult && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 text-center">
              {verdictResult.mutual ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="flex h-20 w-20 items-center justify-center rounded-full glow-green"
                    style={{ backgroundImage: "var(--gradient-success)" }}
                  >
                    <Heart className="h-10 w-10 text-primary-foreground" />
                  </motion.div>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    It's a <span className="text-secondary text-glow-green">Vibe!</span>
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    You're now connected! Check My Circle to see their profile.
                  </p>
                  {isBot && verdictResult.botReason && (
                    <p className="font-mono text-xs text-primary italic max-w-xs">
                      "{verdictResult.botReason}"
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <Zap className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Maybe next time</h2>
                  <p className="font-mono text-xs text-muted-foreground">No worries — there's always more people to meet.</p>
                  {isBot && verdictResult.botReason && (
                    <p className="font-mono text-xs text-muted-foreground italic max-w-xs mt-2">
                      Amara says: "{verdictResult.botReason}"
                    </p>
                  )}
                </>
              )}
              <Button onClick={() => navigate("/play")} className="font-display font-bold" style={{ backgroundImage: "var(--gradient-primary)" }}>
                Back to Hub
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "chatting" && (
          <Button variant="ghost" onClick={() => navigate("/play")} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Leave
          </Button>
        )}
      </div>
    </div>
  );
};

export default VibeMatch;
