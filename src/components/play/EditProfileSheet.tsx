import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/lib/locations";
import { toast } from "@/hooks/use-toast";

interface EditProfileSheetProps {
  walletAddress: string;
  currentData?: {
    realName?: string;
    country?: string;
    xHandle?: string;
    instagramHandle?: string;
    bio?: string;
  };
  onSaved?: () => void;
}

const EditProfileSheet = ({ walletAddress, currentData, onSaved }: EditProfileSheetProps) => {
  const [open, setOpen] = useState(false);
  const [realName, setRealName] = useState(currentData?.realName ?? "");
  const [country, setCountry] = useState(currentData?.country ?? "");
  const [xHandle, setXHandle] = useState(currentData?.xHandle ?? "");
  const [instagramHandle, setInstagramHandle] = useState(currentData?.instagramHandle ?? "");
  const [bio, setBio] = useState(currentData?.bio ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("tapestry-identity", {
        body: {
          walletAddress,
          updateProfile: true,
          realName: realName.trim(),
          country: country || "",
          xHandle: xHandle.trim(),
          instagramHandle: instagramHandle.trim(),
          bioText: bio.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setOpen(false);
      onSaved?.();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Profile
        </Button>
      </SheetTrigger>
      <SheetContent className="border-border/50 bg-card/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-lg text-foreground">Edit Profile</SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
              Real Name <span className="text-muted-foreground/50">(private)</span>
            </label>
            <Input
              placeholder="Your real name"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              maxLength={50}
              className="rounded-xl border-border/50 bg-muted/50 font-mono text-sm"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
              Country
            </label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="rounded-xl border-border/50 bg-muted/50 font-mono text-xs">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
              X Handle <span className="text-muted-foreground/50">(private)</span>
            </label>
            <Input
              placeholder="@yourhandle"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              maxLength={30}
              className="rounded-xl border-border/50 bg-muted/50 font-mono text-sm"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
              Instagram <span className="text-muted-foreground/50">(private)</span>
            </label>
            <Input
              placeholder="@yourhandle"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              maxLength={30}
              className="rounded-xl border-border/50 bg-muted/50 font-mono text-sm"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
              Bio <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <Input
              placeholder="A short bio about you"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              className="rounded-xl border-border/50 bg-muted/50 font-mono text-sm"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 h-12 rounded-xl font-display font-bold"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>

          <p className="text-center font-mono text-[9px] text-muted-foreground">
            Socials are only revealed after a mutual vibe ✨
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditProfileSheet;
