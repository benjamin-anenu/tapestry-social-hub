import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Play = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex max-w-md flex-col items-center gap-6 text-center"
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <Wallet className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="font-display text-4xl font-bold text-foreground">Connect Wallet</h1>
        <p className="text-muted-foreground leading-relaxed">
          Connect your Phantom or Solflare wallet to play for real.
          Your Tapestry identity will be loaded automatically.
        </p>
        <Button
          size="lg"
          className="h-14 w-full rounded-2xl font-display text-lg font-semibold shadow-lg"
          style={{ backgroundImage: "var(--gradient-primary)" }}
          disabled
        >
          Connect Wallet (Coming Soon)
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </motion.div>
    </div>
  );
};

export default Play;
