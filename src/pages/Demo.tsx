import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Terminal } from "lucide-react";
import DemoWelcome from "@/components/demo/DemoWelcome";
import DemoWalletConnect from "@/components/demo/DemoWalletConnect";
import DemoModeSelect from "@/components/demo/DemoModeSelect";
import DemoGameplay from "@/components/demo/DemoGameplay";
import DemoResults from "@/components/demo/DemoResults";

const STEP_LABELS = ["INIT", "LINK", "MODE", "HUNT", "DATA"];

const Demo = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => (step === 0 ? navigate("/") : setStep((s) => s - 1));
  const restart = () => setStep(0);

  return (
    <div className="relative flex min-h-screen flex-col bg-background grid-bg overflow-hidden scanlines">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[400px] w-[400px] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between border-b border-border/50 px-4 py-3">
        <button
          onClick={back}
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {step === 0 ? "EXIT" : "BACK"}
        </button>

        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-xs font-medium tracking-widest text-foreground">
            FIND60
          </span>
          <span className="font-mono text-[10px] text-primary">DEMO</span>
        </div>

        <span className="font-mono text-[10px] text-muted-foreground">
          [{step + 1}/5]
        </span>
      </div>

      {/* Progress */}
      <div className="relative z-20 flex gap-0.5 px-4 pt-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1">
            <div
              className="h-0.5 rounded-full transition-all duration-500"
              style={{
                background: i <= step
                  ? i === step
                    ? "var(--gradient-primary)"
                    : "hsl(var(--secondary))"
                  : "hsl(var(--border))",
                boxShadow: i <= step ? "0 0 8px hsla(220, 100%, 50%, 0.3)" : "none",
              }}
            />
            <span
              className={`text-center font-mono text-[8px] tracking-widest transition-colors ${
                i <= step ? "text-primary" : "text-muted-foreground/40"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 0 && <DemoWelcome key="welcome" onNext={next} />}
          {step === 1 && <DemoWalletConnect key="wallet" onNext={next} />}
          {step === 2 && <DemoModeSelect key="mode" onNext={next} />}
          {step === 3 && <DemoGameplay key="game" onNext={next} />}
          {step === 4 && (
            <DemoResults key="results" onRestart={restart} onHome={() => navigate("/")} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Demo;
