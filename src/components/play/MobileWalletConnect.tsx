import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, HelpCircle, Smartphone, Monitor, Download } from "lucide-react";

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
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm">
      <WalletMultiButton />

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
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4 mt-2 space-y-5 font-mono text-xs text-muted-foreground leading-relaxed text-left">
            <div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1">What is a crypto wallet?</h4>
              <p className="leading-5">
                A wallet is like your digital identity and bank account in one.
                It lets you sign in to apps, hold tokens, and play games on-chain — no email or password needed.
              </p>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1">Which wallet should I use?</h4>
              <p className="leading-5">
                We recommend <strong className="text-foreground">Phantom</strong> (most popular) or{" "}
                <strong className="text-foreground">Solflare</strong>. Both are free and work on mobile + desktop.
              </p>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Setup on Mobile
              </h4>
              <ol className="list-decimal list-outside ml-5 space-y-1">
                <li>Download Phantom or Solflare from the App Store / Google Play</li>
                <li>Create a new wallet (save your recovery phrase!)</li>
                <li>Come back here and tap "Select Wallet" above</li>
              </ol>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" /> Setup on Desktop
              </h4>
              <ol className="list-decimal list-outside ml-5 space-y-1">
                <li>Install the Phantom or Solflare browser extension</li>
                <li>Create a new wallet</li>
                <li>Refresh this page and click "Connect Wallet"</li>
              </ol>
            </div>

            <div className="pt-4 border-t border-border/30">
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default MobileWalletConnect;
