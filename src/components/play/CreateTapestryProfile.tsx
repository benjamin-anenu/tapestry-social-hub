import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/lib/locations";

interface CreateTapestryProfileProps {
  walletAddress: string;
  onCreated: (profileData: Record<string, unknown>) => void;
}

const CreateTapestryProfile = ({ walletAddress, onCreated }: CreateTapestryProfileProps) => {
  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [country, setCountry] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [bio, setBio] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nickname availability state
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-detect country via IP on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data?.country_name) {
          const match = COUNTRIES.find(
            (c) => c.toLowerCase() === data.country_name.toLowerCase()
          );
          if (match) setCountry(match);
        }
      } catch {
        // Silently fail
      }
    };
    detectCountry();
  }, []);

  // Client-side validation
  const NICK_REGEX = /^[a-zA-Z0-9_]+$/;
  const MAX_NICK = 20;
  const MIN_NICK = 3;

  const nicknameValidationError = (() => {
    const trimmed = nickname.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length < MIN_NICK) return `At least ${MIN_NICK} characters required`;
    if (trimmed.length > MAX_NICK) return `Maximum ${MAX_NICK} characters`;
    if (!NICK_REGEX.test(trimmed)) return "Only letters, numbers, and underscores allowed";
    return null;
  })();

  const isNicknameFormatValid = nickname.trim().length >= MIN_NICK && nickname.trim().length <= MAX_NICK && NICK_REGEX.test(nickname.trim());

  // Debounced nickname availability check (only when format is valid)
  useEffect(() => {
    if (!isNicknameFormatValid) {
      setNicknameStatus("idle");
      return;
    }

    const trimmed = nickname.trim();
    setNicknameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "tapestry-identity",
          { body: { checkUsername: trimmed } }
        );
        if (fnError) throw fnError;
        setNicknameStatus(data?.available ? "available" : "taken");
      } catch {
        setNicknameStatus("idle");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nickname, isNicknameFormatValid]);

  const handleCreate = async () => {
    if (!nickname.trim()) return;
    setIsCreating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "tapestry-identity",
        { body: { walletAddress, username: nickname.trim(), bio: bio.trim() || undefined } }
      );

      if (fnError) {
        // Extract message from edge function error response
        const errBody = typeof fnError === "object" && fnError !== null
          ? (fnError as any).message || JSON.stringify(fnError)
          : String(fnError);
        throw new Error(errBody);
      }
      if (data?.error) throw new Error(data.error);

      // Pass profile data back
      onCreated(data);

      // Update local profile with extended fields
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          real_name: realName.trim() || null,
          country: country || null,
          x_handle: xHandle.trim() || null,
          instagram_handle: instagramHandle.trim() || null,
          bio_text: bio.trim() || null,
        } as Record<string, unknown>)
        .eq("wallet_address", walletAddress);

      if (updateError) console.warn("Profile extension failed:", updateError);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setIsCreating(false);
    }
  };

  const nicknameIndicator = () => {
    if (nickname.trim().length < 3) return null;
    switch (nicknameStatus) {
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "available":
        return <Check className="h-4 w-4 text-green-500" />;
      case "taken":
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-sm lg:max-w-md flex-col gap-4 rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Create Identity</h3>
          <p className="font-mono text-[10px] text-muted-foreground">Set up your vibe profile</p>
        </div>
      </div>

      <div className="relative">
        <Input
          placeholder="Nickname (public, permanent) *"
          value={nickname}
          onChange={(e) => {
            // Auto-strip invalid characters, enforce max length
            const stripped = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, MAX_NICK);
            setNickname(stripped);
          }}
          maxLength={MAX_NICK}
          className="rounded-xl border-border/50 bg-muted/50 font-mono pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {nicknameIndicator()}
        </div>
      </div>
      {nicknameValidationError && (
        <p className="font-mono text-[10px] text-muted-foreground -mt-2">
          {nicknameValidationError}
        </p>
      )}
      {!nicknameValidationError && nicknameStatus === "taken" && (
        <p className="font-mono text-[10px] text-destructive -mt-2">
          This nickname is already taken. Try another one.
        </p>
      )}
      {!nicknameValidationError && nicknameStatus === "available" && (
        <p className="font-mono text-[10px] text-green-500 -mt-2">
          Nickname is available! ✓
        </p>
      )}

      <Input
        placeholder="Real name (private, revealed on match)"
        value={realName}
        onChange={(e) => setRealName(e.target.value)}
        className="rounded-xl border-border/50 bg-muted/50 font-mono"
      />

      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger className="rounded-xl border-border/50 bg-muted/50 font-mono text-xs">
          <SelectValue placeholder="Country (auto-detected)" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="X handle (private)"
        value={xHandle}
        onChange={(e) => setXHandle(e.target.value)}
        className="rounded-xl border-border/50 bg-muted/50 font-mono"
      />
      <Input
        placeholder="Instagram handle (private)"
        value={instagramHandle}
        onChange={(e) => setInstagramHandle(e.target.value)}
        className="rounded-xl border-border/50 bg-muted/50 font-mono"
      />
      <Input
        placeholder="Short bio (optional)"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        className="rounded-xl border-border/50 bg-muted/50 font-mono"
      />

      {error && (
        <p className="font-mono text-xs text-destructive">{error}</p>
      )}

      <Button
        onClick={handleCreate}
        disabled={!isNicknameFormatValid || isCreating || nicknameStatus === "taken" || nicknameStatus === "checking"}
        className="h-12 rounded-xl font-display font-bold"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create Profile
      </Button>

      <p className="text-center font-mono text-[9px] text-muted-foreground">
        Your nickname is permanent. Only nickname & country are visible. Socials revealed after mutual vibe ✨
      </p>
    </motion.div>
  );
};

export default CreateTapestryProfile;
