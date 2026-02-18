import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { screens } from "./onboardingData";
import { OnboardingScreen } from "./OnboardingScreen";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface Props {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const pointerRef = useRef<number | null>(null);
  const total = screens.length;

  const go = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= total) return;
      setDirection(idx > current ? 1 : -1);
      setCurrent(idx);
    },
    [current, total]
  );

  const next = useCallback(() => {
    if (current === total - 1) {
      onComplete();
    } else {
      go(current + 1);
    }
  }, [current, total, go, onComplete]);

  const prev = useCallback(() => go(current - 1), [current, go]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  // Swipe detection
  const onPointerDown = (e: React.PointerEvent) => {
    pointerRef.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerRef.current === null) return;
    const delta = pointerRef.current - e.clientX;
    pointerRef.current = null;
    if (delta > 50) next();
    else if (delta < -50) prev();
  };

  const isLast = current === total - 1;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col h-[100dvh] overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0">
        {!isLast ? (
          <button
            onClick={onComplete}
            className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        ) : (
          <span />
        )}
        <span className="text-xs font-mono text-muted-foreground">
          {current + 1} / {total}
        </span>
      </div>

      {/* Screens */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <OnboardingScreen
            key={current}
            screen={screens[current]}
            index={current}
            direction={direction}
          />
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="shrink-0 flex flex-col items-center gap-4 px-6 pb-6">
        {/* Dot indicators */}
        <div className="flex gap-2" role="tablist" aria-label="Onboarding progress">
          {screens.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              role="tab"
              aria-selected={i === current}
              aria-label={`Screen ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-8 h-2 bg-primary"
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={next}
          size="lg"
          className="w-full max-w-sm h-14 text-base font-semibold gap-2"
        >
          {isLast ? "Get Started" : "Next"}
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
