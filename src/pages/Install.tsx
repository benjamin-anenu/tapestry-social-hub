import { useState, useEffect } from "react";
import { Download, Share, MoreVertical, ChevronLeft, Smartphone, Monitor, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    if (standalone) setInstalled(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="text-center mb-8">
          <img src="/pwa-192x192.png" alt="Vibe60" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg" />
          <h1 className="text-2xl font-bold mb-2">Install Vibe60</h1>
          <p className="text-muted-foreground text-sm">
            Get the full app experience — fast, fullscreen, and always one tap away.
          </p>
        </div>

        {/* Install button (Android/Desktop) */}
        {installed ? (
          <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-center mb-8">
            <p className="text-secondary font-semibold">✓ Vibe60 is installed!</p>
            <p className="text-xs text-muted-foreground mt-1">Open it from your home screen</p>
          </div>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstall}
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-secondary text-secondary-foreground mb-8"
          >
            <Download className="h-5 w-5 mr-2" />
            Install Vibe60
          </Button>
        ) : null}

        {/* iOS Instructions */}
        {isIOS && !installed && (
          <div className="rounded-xl border border-border/30 bg-card p-5 mb-8">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Install on iPhone / iPad
            </h2>
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <span>Tap the <Share className="inline h-4 w-4 -mt-0.5 text-primary" /> <strong>Share</strong> button in Safari's toolbar</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner</span>
              </li>
            </ol>
          </div>
        )}

        {/* Android Instructions */}
        {!isIOS && !installed && !deferredPrompt && (
          <div className="rounded-xl border border-border/30 bg-card p-5 mb-8">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Install on Android
            </h2>
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <span>Tap the <MoreVertical className="inline h-4 w-4 -mt-0.5 text-primary" /> <strong>menu</strong> button in Chrome</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                <span>Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                <span>Tap <strong>Install</strong> to confirm</span>
              </li>
            </ol>
          </div>
        )}

        {/* Desktop Instructions */}
        <div className="rounded-xl border border-border/30 bg-card p-5 mb-8">
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            Install on Desktop
          </h2>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
              <span>Look for the <Download className="inline h-4 w-4 -mt-0.5 text-primary" /> <strong>install icon</strong> in your browser's address bar</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
              <span>Click <strong>Install</strong> to add Vibe60 to your apps</span>
            </li>
          </ol>
        </div>

        {/* What is a PWA */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>Vibe60 is a Progressive Web App (PWA) — a website that works like a native app.</p>
          <a
            href="https://docs.pwabuilder.com/#/home/pwa-intro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Learn more about PWAs <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Install;
