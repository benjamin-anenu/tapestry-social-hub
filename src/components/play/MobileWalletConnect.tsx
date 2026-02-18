import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink, HelpCircle, Smartphone, Monitor, Download } from "lucide-react";

const PHANTOM_DEEP_LINK = `https://phantom.app/ul/browse/${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`;
const SOLFLARE_DEEP_LINK = `https://solflare.com/ul/v1/browse/${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`;

const APP_LINKS = {
  phantom: {
    ios: "https://apps.apple.com/app/phantom-crypto-wallet/id1598432977",
    android: "https://play.google.com/store/apps/details?id=app.phantom",
  },
  solflare: {
    ios: "https://apps.apple.com/app/solflare-solana-wallet/id1580902717",
    android: "https://play.google.com/store/apps/details?id=com.solflare.mobile",
  },
};

const MobileWalletConnect = () => {
  const isMobile = useIsMobile();
  const [helpOpen, setHelpOpen] = useState(false);

  const hasPhantom = typeof window !== "undefined" && !!(window as any).phantom?.solana;
  const hasSolflare = typeof window !== "undefined" && !!(window as any).solflare;
  const hasAnyWallet = hasPhantom || hasSolflare;

  // Desktop OR mobile with wallet detected (in-app browser) → standard button
  const showStandardButton = !isMobile || hasAnyWallet;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm">
      {showStandardButton ? (
        <WalletMultiButton />
      ) : (
        /* Mobile without wallet → deep link buttons */
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="font-mono text-xs text-muted-foreground text-center mb-1">
            Open this site inside your wallet app:
          </p>
          <a href={PHANTOM_DEEP_LINK} className="w-full">
            <Button
              variant="outline"
              className="w-full h-12 font-display text-base gap-2 border-primary/30 hover:border-primary hover:bg-primary/5"
            >
              <img
                src="https://phantom.app/img/phantom-icon-purple.svg"
                alt="Phantom"
                className="h-5 w-5"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              Open in Phantom
              <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Button>
          </a>
          <a href={SOLFLARE_DEEP_LINK} className="w-full">
            <Button
              variant="outline"
              className="w-full h-12 font-display text-base gap-2 border-primary/30 hover:border-primary hover:bg-primary/5"
            >
              <img
                src="https://solflare.com/favicon.ico"
                alt="Solflare"
                className="h-5 w-5"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              Open in Solflare
              <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Button>
          </a>

          {/* App store links */}
          <div className="mt-2 text-center">
            <p className="font-mono text-xs text-muted-foreground mb-2">Don't have a wallet app?</p>
            <div className="flex flex-wrap justify-center gap-2">
              <a href={APP_LINKS.phantom.ios} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="text-xs font-mono gap-1">
                  <Download className="h-3 w-3" /> Phantom (iOS)
                </Button>
              </a>
              <a href={APP_LINKS.phantom.android} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="text-xs font-mono gap-1">
                  <Download className="h-3 w-3" /> Phantom (Android)
                </Button>
              </a>
              <a href={APP_LINKS.solflare.ios} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="text-xs font-mono gap-1">
                  <Download className="h-3 w-3" /> Solflare (iOS)
                </Button>
              </a>
              <a href={APP_LINKS.solflare.android} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="text-xs font-mono gap-1">
                  <Download className="h-3 w-3" /> Solflare (Android)
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* What is a wallet? — collapsible help */}
      <Collapsible open={helpOpen} onOpenChange={setHelpOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full font-mono text-xs text-muted-foreground gap-1.5 hover:text-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
            What is a wallet?
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${helpOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4 mt-2 space-y-4 font-mono text-xs text-muted-foreground leading-relaxed">
            <div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1">What is a crypto wallet?</h4>
              <p>
                A wallet is like your digital identity and bank account in one.
                It lets you sign in to apps, hold tokens, and play games on-chain — no email or password needed.
              </p>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1">Which wallet should I use?</h4>
              <p>
                We recommend <strong className="text-foreground">Phantom</strong> (most popular) or{" "}
                <strong className="text-foreground">Solflare</strong>. Both are free and work on mobile + desktop.
              </p>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Setup on Mobile
              </h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download Phantom or Solflare from the App Store / Google Play</li>
                <li>Create a new wallet (save your recovery phrase!)</li>
                <li>Come back here and tap "Open in Phantom" or "Open in Solflare"</li>
              </ol>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" /> Setup on Desktop
              </h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Install the Phantom or Solflare browser extension</li>
                <li>Create a new wallet</li>
                <li>Refresh this page and click "Connect Wallet"</li>
              </ol>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default MobileWalletConnect;
