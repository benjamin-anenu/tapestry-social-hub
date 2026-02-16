import { motion } from "framer-motion";
import { Users, Star } from "lucide-react";
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
  const shortWallet = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm"
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
        <p className="font-mono text-xs text-muted-foreground">{shortWallet}</p>
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
    </motion.div>
  );
};

export default IdentityCard;
