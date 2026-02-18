import { motion } from "framer-motion";
import { Users, Star, Globe } from "lucide-react";
import type { TapestryProfile } from "@/hooks/useTapestryIdentity";

interface IdentityCardProps {
  profile: TapestryProfile;
  walletAddress: string;
}

const IdentityCard = ({ profile, walletAddress }: IdentityCardProps) => {
  const username = profile.profile?.username as string | undefined ?? profile.username ?? "Anonymous";
  const avatarUrl = (profile.profile?.image as string | undefined) ?? profile.image;
  const followers = profile.social?.followers ?? 0;
  const following = profile.social?.following ?? 0;
  const country = (profile.profile?.country as string | undefined) ?? "";
  const shortWallet = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  const crossApps = profile.crossAppProfiles?.filter(p => p.namespace !== "vibe60" && p.namespace !== "find60") ?? [];
  const maxFollowers = Math.max(1, ...crossApps.map(p => p.followers));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex w-full max-w-sm lg:max-w-md flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm"
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-primary/40 glow-blue">
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/20 font-display text-2xl font-bold text-primary">
            {username[0]?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="text-center">
        <h3 className="font-display text-xl font-bold text-foreground">{username}</h3>
        {country && <p className="font-mono text-xs text-primary/80">{country}</p>}
        <p className="font-mono text-[10px] text-muted-foreground">{shortWallet}</p>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">
            <span className="text-foreground font-semibold">{followers}</span> followers
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Star className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">
            <span className="text-foreground font-semibold">{following}</span> following
          </span>
        </div>
      </div>

      {crossApps.length > 0 && (
        <div className="w-full border-t border-border/30 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Globe className="h-3.5 w-3.5 text-primary/70" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Cross-App Reputation</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {crossApps.map((app) => (
              <div key={app.namespace} className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground/80 w-24 truncate">{app.namespace}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${Math.max(5, (app.followers / maxFollowers) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">{app.followers}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default IdentityCard;
