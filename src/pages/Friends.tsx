import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Friends = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background grid-bg overflow-hidden scanlines">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-secondary/5 blur-[150px]" />
      </div>
      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10">
            <Users className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            My <span className="text-secondary text-glow-green">Circle</span>
          </h1>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/80 px-4 py-3 backdrop-blur-sm">
            <Construction className="h-4 w-4 text-muted-foreground" />
            <p className="font-mono text-xs text-muted-foreground">Coming soon — make some friends first!</p>
          </div>
        </motion.div>
        <Button variant="ghost" onClick={() => navigate("/play")} className="text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
        </Button>
      </div>
    </div>
  );
};

export default Friends;
