import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import GameTimer from "@/components/demo/GameTimer";
import ChatZone from "@/components/demo/ChatZone";
import VibeFeedback from "@/components/play/VibeFeedback";
import MatchCountdown from "@/components/play/MatchCountdown";

type Phase = "searching" | "countdown" | "chatting" | "feedback" | "waiting-verdict" | "result";

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
    partnerName?: string;
    myFeedback?: string;
    partnerFeedback?: string;
    myVerdict?: string;
    partnerVerdict?: string;
    botVerdict?: string;
    botReason?: string;
  } | null>(null);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [chatStartsAt, setChatStartsAt] = useState<string | null>(null);
  const [myVerdict, setMyVerdict] = useState<"vibe" | "nah" | null>(null);
  const lastUserMessageTime = useRef<number>(Date.now());
  const nudgeSentCount = useRef<number>(0);
  const submittingVerdict = useRef(false);

  // === HEARTBEAT ===
  useEffect(() => {
    if (!walletAddress) return;
    supabase.functions.invoke("vibe-match-heartbeat", { body: { walletAddress } });
    const interval = setInterval(() => {
      supabase.functions.invoke("vibe-match-heartbeat", { body: { walletAddress } });
    }, 30000);
    return () => {
      clearInterval(interval);
      supabase.functions.invoke("vibe-match-heartbeat", { body: { walletAddress, offline: true } });
    };
  }, [walletAddress]);

  // Bot nudge
  useEffect(() => {
    if (!isBot || phase !== "chatting" || !sessionId || !walletAddress) return;
    const interval = setInterval(async () => {
      const silenceDuration = Date.now() - lastUserMessageTime.current;
      if (silenceDuration >= 15000 && nudgeSentCount.current < 3) {
        nudgeSentCount.current += 1;
        lastUserMessageTime.current = Date.now();
        setIsTyping(true);
        try {
          const { data } = await supabase.functions.invoke("vibe-bot-chat", {
            body: { sessionId, walletAddress, isNudge: true },
          });
          if (data?.botReply) {
            setMessages((prev) => [...prev, { time: Date.now(), sender: "them", text: data.botReply }]);
          }
        } finally {
          setIsTyping(false);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isBot, phase, sessionId, walletAddress]);

  // === Find match ===
  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    const findMatch = async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("vibe-match", { body: { walletAddress } });
        if (cancelled) return;
        if (fnErr) throw fnErr;
        if (data?.error) { setError(data.error); return; }

        if (data?.status === "matched") {
          setSessionId(data.sessionId);
          setMyRole(data.role);
          setPartnerName(data.partnerName ?? "Stranger");
          setIsBot(data.isBot ?? false);
          if (data.chatStartsAt && !data.isBot) {
            setChatStartsAt(data.chatStartsAt);
            setPhase("countdown");
          } else {
            setPhase("chatting");
          }
          if (data.isBot && Array.isArray(data.initialMessages)) {
            setMessages(data.initialMessages.map((m: any) => ({ time: m.time, sender: m.sender, text: m.text })));
          }
        } else if (data?.status === "waiting" && data?.sessionId) {
          setSessionId(data.sessionId);
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

  // === Poll for match ===
  useEffect(() => {
    if (!sessionId || !walletAddress || phase !== "searching" || error) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("vibe-match-poll", { body: { walletAddress, sessionId } });
        if (data?.status === "matched") {
          setSessionId(data.sessionId);
          setMyRole(data.role);
          setPartnerName(data.partnerName ?? "Stranger");
          setIsBot(data.isBot ?? false);
          if (data.chatStartsAt && !data.isBot) {
            setChatStartsAt(data.chatStartsAt);
            setPhase("countdown");
          } else {
            setPhase("chatting");
          }
          if (data.isBot && Array.isArray(data.initialMessages)) {
            setMessages(data.initialMessages.map((m: any) => ({ time: m.time, sender: m.sender, text: m.text })));
          }
        } else if (data?.status === "waiting") {
          setWaitingSeconds(data.waitingSeconds ?? 0);
        } else if (data?.status === "expired") {
          setError("Session expired — try again!");
        }
      } catch { /* ignore */ }
    }, 2500);
    return () => clearInterval(interval);
  }, [sessionId, walletAddress, phase, error]);

  // === Poll for human chat ===
  useEffect(() => {
    if (!sessionId || isBot || phase !== "chatting" || !walletAddress) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("vibe-chat", { body: { sessionId, walletAddress } });
        if (data?.chatLog && Array.isArray(data.chatLog)) {
          setMessages(data.chatLog.map((m: { sender: string; text: string; time: number }) => ({
            time: m.time, sender: m.sender === walletAddress ? "you" : "them", text: m.text,
          })));
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId, isBot, phase, walletAddress]);

  // === Poll for verdict result ===
  useEffect(() => {
    if (phase !== "waiting-verdict" || !sessionId || !walletAddress) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("vibe-verdict-poll", {
          body: { sessionId, walletAddress },
        });
        if (data && !data.waiting) {
          setVerdictResult(data);
          setPhase("result");
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [phase, sessionId, walletAddress]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!sessionId || !walletAddress) return;
    lastUserMessageTime.current = Date.now();
    if (isBot) {
      setMessages((prev) => [...prev, { time: Date.now(), sender: "you", text }]);
      setIsTyping(true);
      try {
        const { data } = await supabase.functions.invoke("vibe-bot-chat", { body: { sessionId, walletAddress, text } });
        if (data?.botReply) {
          setMessages((prev) => [...prev, { time: Date.now(), sender: "them", text: data.botReply }]);
        }
      } finally { setIsTyping(false); }
    } else {
      setMessages((prev) => [...prev, { time: Date.now(), sender: "you", text }]);
      await supabase.functions.invoke("vibe-chat", { body: { sessionId, walletAddress, text } });
    }
  }, [sessionId, walletAddress, isBot]);

  const handleTimerComplete = useCallback(() => {
    setPhase("feedback");
  }, []);

  const handleCountdownComplete = useCallback(() => {
    setPhase("chatting");
  }, []);

  const handleFeedbackSubmit = useCallback(async (verdict: "vibe" | "nah", feedback: string) => {
    if (!sessionId || !walletAddress || submittingVerdict.current) return;
    submittingVerdict.current = true;
    setMyVerdict(verdict);
    try {
      if (isBot) {
        const { data } = await supabase.functions.invoke("vibe-bot-verdict", {
          body: { sessionId, walletAddress, userVerdict: verdict },
        });
        setVerdictResult({ ...data, myFeedback: feedback });
        setPhase("result");
      } else {
        const { data } = await supabase.functions.invoke("vibe-verdict", {
          body: { sessionId, walletAddress, verdict, feedback },
        });
        if (data?.waiting) {
          setPhase("waiting-verdict");
        } else {
          setVerdictResult(data);
          setPhase("result");
        }
      }
    } catch {
      submittingVerdict.current = false;
      setError("Failed to submit verdict.");
    }
  }, [sessionId, walletAddress, isBot]);

  return (
    <div className="flex h-[100dvh] flex-col items-center bg-background grid-bg overflow-hidden scanlines">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg lg:max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-4 min-h-0">
        <AnimatePresence mode="wait">
          {/* SEARCHING */}
          {phase === "searching" && !error && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Finding a <span className="text-primary text-glow-blue">Vibe</span></h2>
              <p className="font-mono text-xs text-muted-foreground">
                {sessionId ? `Waiting for someone to join... ${waitingSeconds}s` : "Scanning for online users near you..."}
              </p>
            </motion.div>
          )}

          {/* ERROR */}
          {error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
              <Zap className="h-10 w-10 text-muted-foreground" />
              <p className="font-mono text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => navigate("/play")} variant="ghost" className="font-mono text-sm">Back to Hub</Button>
            </motion.div>
          )}

          {/* COUNTDOWN */}
          {phase === "countdown" && chatStartsAt && (
            <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MatchCountdown chatStartsAt={chatStartsAt} partnerName={partnerName} onComplete={handleCountdownComplete} />
            </motion.div>
          )}

          {/* CHATTING */}
          {phase === "chatting" && (
            <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-1 flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <p className="font-mono text-xs text-muted-foreground">
                  Vibing with <span className="text-primary font-bold">{partnerName}</span>
                </p>
              </div>
              <div className="shrink-0">
                <GameTimer duration={60} speed={1000} onTick={setTimeLeft} onComplete={handleTimerComplete} />
              </div>
              <div className="flex-1 min-h-0">
                <ChatZone timeLeft={0} messages={messages} clueDrops={[]} onSendMessage={handleSendMessage} isTyping={isTyping} />
              </div>
            </motion.div>
          )}

          {/* FEEDBACK */}
          {phase === "feedback" && (
            <motion.div key="feedback" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <VibeFeedback onSubmit={handleFeedbackSubmit} partnerName={partnerName} />
            </motion.div>
          )}

          {/* WAITING FOR PARTNER'S VERDICT */}
          {phase === "waiting-verdict" && (
            <motion.div key="waiting-verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </motion.div>
              <h2 className="font-display text-xl font-bold text-foreground text-center">
                Waiting for <span className="text-primary">{partnerName}</span> to decide...
              </h2>
              <p className="font-mono text-[10px] text-muted-foreground">Hang tight — they're making their choice</p>
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
                </>
              ) : (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <Zap className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Maybe next time</h2>
                  <p className="font-mono text-xs text-muted-foreground">No worries — there's always more people to meet.</p>
                </>
              )}

              {/* Show feedbacks */}
              {(verdictResult.myFeedback || verdictResult.partnerFeedback) && (
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  {verdictResult.myFeedback && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-left">
                      <p className="font-mono text-[10px] text-primary mb-1">You said:</p>
                      <p className="font-mono text-xs text-foreground">"{verdictResult.myFeedback}"</p>
                    </div>
                  )}
                  {verdictResult.partnerFeedback && (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-left">
                      <p className="font-mono text-[10px] text-muted-foreground mb-1">{verdictResult.partnerName ?? partnerName} said:</p>
                      <p className="font-mono text-xs text-foreground">"{verdictResult.partnerFeedback}"</p>
                    </div>
                  )}
                </div>
              )}

              {isBot && verdictResult.botReason && (
                <p className="font-mono text-xs text-primary italic max-w-xs">"{verdictResult.botReason}"</p>
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
