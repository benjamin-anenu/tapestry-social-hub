import { useMemo, useCallback, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

const NETWORK = WalletAdapterNetwork.Devnet;

export const WalletProviderWrapper = ({ children }: { children: ReactNode }) => {
  const endpoint = useMemo(() => clusterApiUrl(NETWORK), []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: NETWORK }),
    ],
    []
  );

  const onError = useCallback((error: WalletError) => {
    console.error("[WalletProvider]", error.name, error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
