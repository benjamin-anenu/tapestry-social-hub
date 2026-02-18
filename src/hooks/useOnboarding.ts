import { useState, useCallback } from "react";

const STORAGE_KEY = "vibe60-onboarding-complete";

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage unavailable
    }
    setIsComplete(true);
  }, []);

  return { isOnboardingComplete: isComplete, completeOnboarding };
}
