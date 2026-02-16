import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DemoWelcome from "@/components/demo/DemoWelcome";
import DemoWalletConnect from "@/components/demo/DemoWalletConnect";
import DemoModeSelect from "@/components/demo/DemoModeSelect";
import DemoGameplay from "@/components/demo/DemoGameplay";
import DemoResults from "@/components/demo/DemoResults";

const STEP_LABELS = ["Welcome", "Wallet", "Mode", "Game", "Results"];

const Demo = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => (step === 0 ? navigate("/") : setStep((s) => s - 1));
  const restart = () => setStep(0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="sm" onClick={back} className="text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {step === 0 ? "Home" : "Back"}
        </Button>
        <span className="font-display text-sm font-semibold text-foreground">Find60 Demo</span>
        <span className="text-xs text-muted-foreground">{step + 1}/5</span>
      </div>

      {/* Progress */}
      <div className="flex gap-1 px-4">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{
              background: i <= step ? "var(--gradient-primary)" : "hsl(var(--muted))",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          {step === 0 && <DemoWelcome key="welcome" onNext={next} />}
          {step === 1 && <DemoWalletConnect key="wallet" onNext={next} />}
          {step === 2 && <DemoModeSelect key="mode" onNext={next} />}
          {step === 3 && <DemoGameplay key="game" onNext={next} />}
          {step === 4 && <DemoResults key="results" onRestart={restart} onHome={() => navigate("/")} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Demo;
