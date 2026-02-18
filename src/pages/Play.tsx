import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import MobileWalletConnect from "@/components/play/MobileWalletConnect";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTapestryIdentity } from "@/hooks/useTapestryIdentity";
import IdentityCard from "@/components/play/IdentityCard";
import CreateTapestryProfile from "@/components/play/CreateTapestryProfile";
import EditProfileSheet from "@/components/play/EditProfileSheet";
import MainHub from "@/components/play/MainHub";

type Phase = "connect" | "identity" | "lobby";

const Play = () => {
  const navigate = useNavigate();
  const { publicKey, connected, disconnect } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const { profile, isLoading, error } = useTapestryIdentity(walletAddress);
  const [phase, setPhase] = useState<Phase>("connect");
  const [createdProfile, setCreatedProfile] = useState<Record<string, unknown> | null>(null);

  // Auto-advance when wallet connects
  useEffect(() => {
    if (connected && walletAddress && phase === "connect") {
      setPhase("identity");
    }
    if (!connected) {
      setPhase("connect");
      setCreatedProfile(null);
    }
  }, [connected, walletAddress, phase]);

  const activeProfile = createdProfile || profile;
  const loading = isLoading;

  const hasProfile = activeProfile?.profile != null && (!!((activeProfile as any)?.profile?.username) || !!((activeProfile as any)?.username));

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background grid-bg overflow-hidden scanlines">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg lg:max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
        <AnimatePresence mode="wait">
          {/* Phase 1: Connect Wallet */}
          {phase === "connect" && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <h1 className="font-display text-4xl font-bold text-foreground">
                Connect <span className="text-primary text-glow-blue">Wallet</span>
              </h1>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                Connect your Phantom or Solflare wallet to play for real on devnet.
              </p>
              <MobileWalletConnect />
            </motion.div>
          )}

          {/* Phase 2: Identity */}
          {phase === "identity" && walletAddress && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6"
            >
              {loading && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-mono text-sm text-muted-foreground">Scanning Tapestry graph...</p>
                </div>
              )}

              {!loading && error && (
                <p className="font-mono text-sm text-destructive">{error}</p>
              )}

              {!loading && !error && hasProfile && activeProfile && (
                <>
                  <IdentityCard profile={activeProfile} walletAddress={walletAddress} />
                  <div className="flex items-center gap-3">
                    <EditProfileSheet walletAddress={walletAddress} />
                  </div>
                  <Button
                    onClick={() => setPhase("lobby")}
                    className="h-14 w-full max-w-sm rounded-xl font-display text-lg font-bold shadow-lg glow-blue"
                    style={{ backgroundImage: "var(--gradient-primary)" }}
                  >
                    Show Me My World
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </>
              )}

              {!loading && !error && !hasProfile && (
                <CreateTapestryProfile
                  walletAddress={walletAddress}
                  onCreated={(data) => setCreatedProfile(data)}
                />
              )}

              <Button
                variant="ghost"
                onClick={() => { disconnect(); setPhase("connect"); }}
                className="font-mono text-xs text-muted-foreground hover:text-destructive"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Disconnect Wallet
              </Button>
            </motion.div>
          )}

          {/* Phase 3: Hub */}
          {phase === "lobby" && activeProfile && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6"
            >
              <h2 className="font-display text-3xl font-bold text-foreground">
                Your <span className="text-primary text-glow-blue">Hub</span>
              </h2>
              <MainHub />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => {
            if (phase === "lobby") setPhase("identity");
            else if (phase === "identity") setPhase("connect");
            else navigate("/");
          }}
          className="text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {phase === "connect" ? "Back to Home" : "Back"}
        </Button>
      </div>
    </div>
  );
};

export default Play;
