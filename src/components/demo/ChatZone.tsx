import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Lightbulb, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  onSendMessage?: (text: string) => void;
  disabled?: boolean;
  isTyping?: boolean;
}

const ChatZone = ({ timeLeft, messages, clueDrops, onSendMessage, disabled, isTyping }: ChatZoneProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  const visibleMessages = messages.filter((m) => timeLeft <= m.time);
  const visibleClues = clueDrops.filter((c) => timeLeft <= c.time);

  const allItems: Array<{ type: "msg" | "clue"; time: number; data: any }> = [
    ...visibleMessages.map((m) => ({ type: "msg" as const, time: m.time, data: m })),
    ...visibleClues.map((c) => ({ type: "clue" as const, time: c.time, data: c })),
  ].sort((a, b) => a.time - b.time);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [allItems.length, scrollToBottom]);

  // Detect mobile keyboard via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const kbHeight = Math.max(0, window.innerHeight - vv.height);
      setKeyboardPadding(kbHeight);
      // Scroll to bottom when keyboard opens
      setTimeout(scrollToBottom, 50);
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, [scrollToBottom]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !onSendMessage) return;
    onSendMessage(trimmed);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
                key={`msg-${msg.time}-${msg.sender}-${i}`}
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

        {allItems.length === 0 && !isTyping && (
          <p className="font-mono text-[10px] text-muted-foreground italic text-center py-8">
            CHANNEL OPEN...
          </p>
        )}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/50 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Chat input */}
      {onSendMessage && (
        <div
          className="border-t border-border/50 p-3 shrink-0 transition-[padding] duration-150"
          style={{ paddingBottom: keyboardPadding > 0 ? `${keyboardPadding + 12}px` : undefined }}
        >
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={scrollToBottom}
              placeholder="Type a message..."
              disabled={disabled}
              autoComplete="off"
              autoCorrect="off"
              className="h-10 flex-1 border-border/30 bg-background/50 font-mono text-base placeholder:text-muted-foreground/50"
            />
            <button
              onClick={handleSend}
              disabled={disabled || !inputValue.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-30 hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatZone;
