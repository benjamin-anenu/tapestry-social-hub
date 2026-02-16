import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Lightbulb } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  time: number;
  sender: string;
  text: string;
}

interface ClueDropMessage {
  time: number;
  fieldId: string;
  text: string;
}

interface ChatZoneProps {
  timeLeft: number;
  messages: ChatMessage[];
  clueDrops: ClueDropMessage[];
}

const ChatZone = ({ timeLeft, messages, clueDrops }: ChatZoneProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.filter((m) => timeLeft <= m.time);
  const visibleClues = clueDrops.filter((c) => timeLeft <= c.time);

  // Merge and sort by time descending (most recent = lowest time remaining = bottom)
  const allItems: Array<{ type: "msg" | "clue"; time: number; data: any }> = [
    ...visibleMessages.map((m) => ({ type: "msg" as const, time: m.time, data: m })),
    ...visibleClues.map((c) => ({ type: "clue" as const, time: c.time, data: c })),
  ].sort((a, b) => b.time - a.time); // higher time = appeared first

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allItems.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <MessageCircle className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[9px] tracking-widest text-primary">COMMS</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {allItems.map((item, i) => {
            if (item.type === "clue") {
              return (
                <motion.div
                  key={`clue-${item.data.fieldId}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2"
                >
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                  <span className="font-mono text-xs font-semibold text-yellow-400">
                    {item.data.text}
                  </span>
                </motion.div>
              );
            }

            const msg = item.data as ChatMessage;
            const isYou = msg.sender === "you";
            return (
              <motion.div
                key={`msg-${msg.time}-${msg.sender}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isYou ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-1.5 font-mono text-xs ${
                    isYou
                      ? "bg-primary/20 text-primary border border-primary/20"
                      : "bg-muted/50 text-foreground border border-border/50"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {allItems.length === 0 && (
          <p className="font-mono text-[10px] text-muted-foreground italic text-center py-8">
            CHANNEL OPEN...
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatZone;
