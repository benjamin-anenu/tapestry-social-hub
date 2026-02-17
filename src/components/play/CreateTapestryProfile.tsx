import { useState } from "react";
import { motion } from "framer-motion";
import { User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, CITIES } from "@/lib/locations";

interface CreateTapestryProfileProps {
  walletAddress: string;
  onCreated: () => void;
}

const CreateTapestryProfile = ({ walletAddress, onCreated }: CreateTapestryProfileProps) => {
  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [bio, setBio] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cities = country ? CITIES[country] ?? [] : [];

  const handleCreate = async () => {
    if (!nickname.trim()) return;
    setIsCreating(true);
    setError(null);

    try {
      // 1. Create Tapestry profile with nickname
      const { data, error: fnError } = await supabase.functions.invoke(
        "tapestry-identity",
        { body: { walletAddress, username: nickname.trim(), bio: bio.trim() || undefined } }
      );
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // 2. Update local profile with extended fields
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          real_name: realName.trim() || null,
          city: city || null,
          country: country || null,
          x_handle: xHandle.trim() || null,
          instagram_handle: instagramHandle.trim() || null,
          bio_text: bio.trim() || null,
        } as Record<string, unknown>)
        .eq("wallet_address", walletAddress);

      if (updateError) console.warn("Profile extension failed:", updateError);

      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm"
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

      <Input
        placeholder="Nickname (public) *"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        className="rounded-xl border-border/50 bg-muted/50 font-mono"
      />
      <Input
        placeholder="Real name (private, revealed on match)"
        value={realName}
        onChange={(e) => setRealName(e.target.value)}
        className="rounded-xl border-border/50 bg-muted/50 font-mono"
      />

      <div className="grid grid-cols-2 gap-3">
        <Select value={country} onValueChange={(v) => { setCountry(v); setCity(""); }}>
          <SelectTrigger className="rounded-xl border-border/50 bg-muted/50 font-mono text-xs">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={city} onValueChange={setCity} disabled={!country}>
          <SelectTrigger className="rounded-xl border-border/50 bg-muted/50 font-mono text-xs">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
        disabled={!nickname.trim() || isCreating}
        className="h-12 rounded-xl font-display font-bold"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create Profile
      </Button>

      <p className="text-center font-mono text-[9px] text-muted-foreground">
        Only your nickname & city are visible. Socials revealed after mutual vibe ✨
      </p>
    </motion.div>
  );
};

export default CreateTapestryProfile;
