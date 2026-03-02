import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProviderWrapper } from "@/providers/WalletProvider";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import Index from "./pages/Index";
import Play from "./pages/Play";
import VibeMatch from "./pages/VibeMatch";
import Friends from "./pages/Friends";
import FriendChat from "./pages/FriendChat";
import Arena from "./pages/Arena";
import Demo from "./pages/Demo";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import Install from "./pages/Install";
import Chicken from "./pages/Chicken";
import NotFound from "./pages/NotFound";
import { InstallPrompt } from "./components/pwa/InstallPrompt";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isOnboardingComplete, completeOnboarding } = useOnboarding();

  if (!isOnboardingComplete) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return (
    <>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/play" element={<Play />} />
          <Route path="/play/vibe" element={<VibeMatch />} />
          <Route path="/play/friends" element={<Friends />} />
          <Route path="/play/friends/:friendId" element={<FriendChat />} />
          <Route path="/play/arena" element={<Arena />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/play/chicken" element={<Chicken />} />
          <Route path="/install" element={<Install />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProviderWrapper>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </WalletProviderWrapper>
  </QueryClientProvider>
);

export default App;
