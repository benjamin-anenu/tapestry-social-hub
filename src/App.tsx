import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProviderWrapper } from "@/providers/WalletProvider";
import Index from "./pages/Index";
import Play from "./pages/Play";
import VibeMatch from "./pages/VibeMatch";
import Friends from "./pages/Friends";
import Arena from "./pages/Arena";
import Demo from "./pages/Demo";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProviderWrapper>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/play" element={<Play />} />
          <Route path="/play/vibe" element={<VibeMatch />} />
          <Route path="/play/friends" element={<Friends />} />
          <Route path="/play/arena" element={<Arena />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </WalletProviderWrapper>
  </QueryClientProvider>
);

export default App;
