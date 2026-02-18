import onboarding1 from "@/assets/onboarding-1.png";
import onboarding2 from "@/assets/onboarding-2.png";
import onboarding3 from "@/assets/onboarding-3.png";
import onboarding4 from "@/assets/onboarding-4.png";
import onboarding5 from "@/assets/onboarding-5.png";

export interface OnboardingScreenData {
  image: string;
  title: string;
  subtitle: string;
  body: string;
  alt: string;
}

export const screens: OnboardingScreenData[] = [
  {
    image: onboarding1,
    title: "Your Vibe, On-Chain",
    subtitle: "Connect your wallet. Own your identity.",
    body: "Your social identity lives on-chain via Tapestry on Solana. Portable across every app, permanent on the blockchain, and entirely yours. No platform owns your profile — you do.",
    alt: "A luminous digital identity crystal floating in deep space, connected by glowing neural threads to a Solana blockchain constellation",
  },
  {
    image: onboarding2,
    title: "60 Seconds to Connect",
    subtitle: "One minute. Real conversations. No algorithms.",
    body: "Get matched with a stranger and chat for 60 seconds. No feeds, no followers, no likes — just a genuine conversation. Decide if you vibe before time runs out.",
    alt: "Two holographic avatars facing each other across a neon-lit arena with a 60-second timer orbiting between them",
  },
  {
    image: onboarding3,
    title: "The Vibe Check",
    subtitle: "Mutual consent unlocks real connections.",
    body: "If both of you say \"Vibe\" — real names, socials, and profiles unlock. No match? Nothing is shared. Privacy by design, connections by choice.",
    alt: "Two hands reaching toward each other through a portal of electric blue and neon green energy",
  },
  {
    image: onboarding4,
    title: "Build Your Circle",
    subtitle: "Friends on-chain. Portable everywhere.",
    body: "Your friends live on Tapestry's open social graph. Every connection is verified on-chain and portable across the entire Solana ecosystem. Your circle grows with every vibe.",
    alt: "A futuristic social graph with interconnected friend nodes orbiting a central profile with on-chain verification badges",
  },
  {
    image: onboarding5,
    title: "Game On",
    subtitle: "Play with friends. Win together.",
    body: "Challenge your circle to staked games in the Game Arena. Climb the leaderboard, earn SOL, and prove your skills. Vibes become victories.",
    alt: "An epic arena scene with friends facing off in a staked game, SOL tokens floating in the air with a leaderboard hologram",
  },
];
