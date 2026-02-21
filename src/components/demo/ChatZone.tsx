import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Lightbulb, Send, SpellCheck } from "lucide-react";
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

const QUICK_EMOJIS = ["🔥", "😂", "😍", "👍", "💯"];

const PHRASE_DICTIONARY = [
  "what's up", "what are you into", "where are you from", "nice to meet you",
  "that's cool", "for real", "no way", "same here", "tell me more",
  "haha", "lol", "what do you do", "how's it going", "that's awesome",
  "I feel you", "what's your vibe", "let's go", "honestly", "lowkey",
  "highkey", "no cap", "I'm from", "what's good", "say less",
  "you're funny", "I like that", "good vibes", "keep going", "big facts",
  "what's your name", "how old are you", "what music do you like",
  "do you game", "that's fire", "respect", "I agree", "true true",
  "interesting", "wow", "amazing", "love that", "me too", "same",
  "definitely", "absolutely", "of course", "why not", "sure thing",
];

const COMMON_WORDS = new Set([
  "the","be","to","of","and","a","in","that","have","i","it","for","not","on","with","he","as","you","do","at",
  "this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there",
  "their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time",
  "no","just","him","know","take","people","into","year","your","good","some","could","them","see","other","than",
  "then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work",
  "first","well","way","even","new","want","because","any","these","give","day","most","us","great","hey","hi",
  "hello","yeah","yes","ok","okay","cool","nice","wow","lol","haha","omg","bruh","bro","dude","man","yo",
  "im","dont","cant","wont","isnt","arent","wasnt","werent","ive","youve","weve","theyve","ill","youll","well",
  "theyll","id","youd","wed","theyd","whats","thats","heres","theres","whos","lets","its","gonna","wanna","gotta",
  "kinda","sorta","dunno","nah","yep","nope","sup","tho","tho","rn","ngl","tbh","imo","idk","btw","smh","fr",
  "real","fire","lit","vibe","vibes","lowkey","highkey","bet","cap","slay","based","mood","sus","goat","flex",
  "w","l","gg","ez","pog","cringe","yolo","fomo","stan","ship","ghost","simp","ratio","savage","clutch",
  "am","is","are","was","were","been","being","has","had","having","does","did","doing","shall","should",
  "may","might","must","need","dare","ought","used","going","able","about","above","across","after","against",
  "along","among","around","before","behind","below","beneath","beside","between","beyond","during","except",
  "inside","near","off","outside","past","since","through","toward","under","until","upon","within","without",
  "where","here","very","really","much","many","more","most","less","few","little","own","other","each","every",
  "both","few","more","most","such","each","than","too","very","just","already","always","never","often","still",
  "again","maybe","perhaps","probably","usually","sometimes","today","tomorrow","yesterday","tonight","morning",
  "name","age","music","game","play","love","hate","miss","food","movie","show","book","song","place","home",
  "school","job","friend","family","fun","happy","sad","mad","tired","bored","hungry","sorry","thanks","please",
  "sure","right","wrong","true","false","start","stop","wait","help","try","keep","move","run","walk","talk",
  "tell","ask","answer","think","feel","believe","hope","wish","dream","remember","forget","understand","learn",
]);

function getSuggestions(input: string): string[] {
  if (input.length < 2) return [];
  const lower = input.toLowerCase();
  return PHRASE_DICTIONARY
    .filter((p) => p.startsWith(lower) && p !== lower)
    .slice(0, 3);
}

function checkWord(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z']/g, "");
  if (clean.length <= 1) return true;
  return COMMON_WORDS.has(clean);
}

function getCorrection(word: string): string | null {
  const clean = word.toLowerCase().replace(/[^a-z']/g, "");
  if (clean.length <= 2) return null;
  // Simple Levenshtein-1 check against common words
  for (const w of COMMON_WORDS) {
    if (Math.abs(w.length - clean.length) > 1) continue;
    let diff = 0;
    const maxLen = Math.max(w.length, clean.length);
    for (let i = 0; i < maxLen; i++) {
      if (w[i] !== clean[i]) diff++;
      if (diff > 1) break;
    }
    if (diff === 1) return w;
  }
  return null;
}

const ChatZone = ({ timeLeft, messages, clueDrops, onSendMessage, disabled, isTyping }: ChatZoneProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true);
  const [correctionPopup, setCorrectionPopup] = useState<{ word: string; correction: string; index: number } | null>(null);

  const visibleMessages = messages.filter((m) => timeLeft <= m.time);
  const visibleClues = clueDrops.filter((c) => timeLeft <= c.time);

  const allItems: Array<{ type: "msg" | "clue"; time: number; data: any }> = [
    ...visibleMessages.map((m) => ({ type: "msg" as const, time: m.time, data: m })),
    ...visibleClues.map((c) => ({ type: "clue" as const, time: c.time, data: c })),
  ].sort((a, b) => a.time - b.time);

  const suggestions = useMemo(() => getSuggestions(inputValue), [inputValue]);

  // Auto-correct: check last word when space is typed
  const misspelledWords = useMemo(() => {
    if (!autoCorrectEnabled) return new Map<number, string>();
    const words = inputValue.split(/\s+/);
    const map = new Map<number, string>();
    words.forEach((w, i) => {
      if (i === words.length - 1) return; // Don't check word being typed
      if (!checkWord(w)) {
        const correction = getCorrection(w);
        if (correction) map.set(i, correction);
      }
    });
    return map;
  }, [inputValue, autoCorrectEnabled]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [allItems.length, scrollToBottom]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !onSendMessage) return;
    onSendMessage(trimmed);
    setInputValue("");
    setCorrectionPopup(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSend = (emoji: string) => {
    if (!onSendMessage) return;
    onSendMessage(emoji);
  };

  const handleSuggestionTap = (phrase: string) => {
    setInputValue(phrase + " ");
  };

  const handleCorrectionTap = (wordIndex: number) => {
    const correction = misspelledWords.get(wordIndex);
    if (!correction) return;
    const words = inputValue.split(/\s+/);
    words[wordIndex] = correction;
    setInputValue(words.join(" "));
    setCorrectionPopup(null);
  };

  // Render input with highlights for misspelled words
  const renderInputOverlay = () => {
    if (!autoCorrectEnabled || misspelledWords.size === 0) return null;
    const words = inputValue.split(/\s+/);
    return (
      <div className="absolute inset-0 pointer-events-none px-3 py-2 font-mono text-base md:text-sm flex items-center overflow-hidden">
        {words.map((w, i) => (
          <span key={i}>
            {misspelledWords.has(i) ? (
              <span
                className="border-b-2 border-destructive/60 pointer-events-auto cursor-pointer"
                onClick={() => handleCorrectionTap(i)}
              >
                {w}
              </span>
            ) : (
              <span className="invisible">{w}</span>
            )}
            {i < words.length - 1 && <span className="invisible"> </span>}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[9px] tracking-widest text-primary">COMMS</span>
        </div>
        <button
          onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] transition-colors ${
            autoCorrectEnabled
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
          title={autoCorrectEnabled ? "Auto-correct ON" : "Auto-correct OFF"}
        >
          <SpellCheck className="h-3 w-3" />
          <span>ABC</span>
        </button>
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
                  <span className="font-mono text-xs font-semibold text-yellow-400">{item.data.text}</span>
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
          <p className="font-mono text-[10px] text-muted-foreground italic text-center py-8">CHANNEL OPEN...</p>
        )}

        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
            <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/50 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Chat input area */}
      {onSendMessage && (
        <div className="border-t border-border/50 p-3 shrink-0 space-y-2">
          {/* Predictive suggestions */}
          {suggestions.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionTap(s)}
                  className="shrink-0 rounded-full border border-border/50 bg-muted/50 px-3 py-1 font-mono text-[10px] text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Quick emojis */}
          <div className="flex gap-1.5 justify-center">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSend(emoji)}
                disabled={disabled}
                className="h-8 w-8 rounded-lg bg-muted/50 text-sm hover:bg-primary/10 transition-colors disabled:opacity-30 flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input + send */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={scrollToBottom}
                placeholder="Type a message..."
                disabled={disabled}
                autoComplete="off"
                autoCorrect="off"
                className="h-10 w-full border-border/30 bg-background/50 font-mono text-base placeholder:text-muted-foreground/50"
              />
            </div>
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
