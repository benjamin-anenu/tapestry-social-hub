import { useState } from "react";
import { motion } from "framer-motion";
import { User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface CreateTapestryProfileProps {
  walletAddress: string;
  onCreated: () => void;
}

const CreateTapestryProfile = ({ walletAddress, onCreated }: CreateTapestryProfileProps) => {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!username.trim()) return;
    setIsCreating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "tapestry-identity",
        { body: { walletAddress, username: username.trim(), bio: bio.trim() || undefined } }
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

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
      className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Create Identity</h3>
          <p className="font-mono text-[10px] text-muted-foreground">Set up your Tapestry profile</p>
        </div>
      </div>

      <Input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="rounded-xl border-border/50 bg-muted/50 font-mono"
      />
      <Input
        placeholder="Bio (optional)"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        className="rounded-xl border-border/50 bg-muted/50 font-mono"
      />

      {error && (
        <p className="font-mono text-xs text-destructive">{error}</p>
      )}

      <Button
        onClick={handleCreate}
        disabled={!username.trim() || isCreating}
        className="h-12 rounded-xl font-display font-bold"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create Profile
      </Button>
    </motion.div>
  );
};

export default CreateTapestryProfile;
