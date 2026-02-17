import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TapestryProfile {
  username?: string;
  bio?: string;
  image?: string;
  walletAddress?: string;
  social?: { followers: number; following: number };
  profile?: Record<string, unknown>;
  created?: boolean;
  crossAppProfiles?: Array<{
    namespace: string;
    username?: string;
    followers: number;
    following: number;
  }>;
}

export const useTapestryIdentity = (walletAddress: string | null) => {
  const [profile, setProfile] = useState<TapestryProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "tapestry-identity",
          { body: { walletAddress } }
        );

        if (fnError) throw fnError;
        if (cancelled) return;

        setProfile(data as TapestryProfile);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to resolve identity");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [walletAddress]);

  return { profile, isLoading, error };
};
