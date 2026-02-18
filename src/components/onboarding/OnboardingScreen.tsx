import { motion } from "framer-motion";
import type { OnboardingScreenData } from "./onboardingData";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  screen: OnboardingScreenData;
  index: number;
  direction: number;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export function OnboardingScreen({ screen, index, direction }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      key={index}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col items-center px-6 pt-4 pb-8 md:px-12 lg:px-20"
    >
      {/* Hero image */}
      <div className="relative w-full max-w-lg lg:max-w-2xl flex-[0_0_45%] md:flex-[0_0_50%] rounded-2xl overflow-hidden mb-6">
        {!imgLoaded && !imgError && (
          <Skeleton className="absolute inset-0 rounded-2xl" />
        )}
        {imgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-2xl flex items-center justify-center">
            <span className="text-4xl font-bold text-primary opacity-40">V60</span>
          </div>
        ) : (
          <img
            src={screen.image}
            alt={screen.alt}
            className={`w-full h-full object-cover rounded-2xl transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            loading={index === 0 ? "eager" : "lazy"}
          />
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center text-center max-w-md lg:max-w-lg space-y-3">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-heading tracking-tight text-foreground">
          {screen.title}
        </h2>
        <p className="text-sm md:text-base font-mono uppercase tracking-widest text-primary">
          {screen.subtitle}
        </p>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {screen.body}
        </p>
      </div>
    </motion.div>
  );
}
