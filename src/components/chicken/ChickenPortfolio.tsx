import { TrendingUp, TrendingDown } from "lucide-react";

interface ChickenPortfolioProps {
  myCash: number;
  myTokens: number;
  myValue: number;
  pnl: number;
  oppValue: number;
  currentPrice: number;
}

const ChickenPortfolio = ({ myCash, myTokens, myValue, pnl, oppValue }: ChickenPortfolioProps) => {
  const pnlPercent = ((myValue - 1000) / 1000 * 100).toFixed(1);
  const isAhead = myValue >= oppValue;

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* My portfolio */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">YOUR PORTFOLIO</p>
        <p className="font-mono text-xl font-bold text-foreground">${myValue.toFixed(2)}</p>
        <div className={`flex items-center gap-1 text-xs font-mono ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
          {pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({pnlPercent}%)
        </div>
        <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Cash</span>
            <span className="font-mono">${myCash.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>$CHKN</span>
            <span className="font-mono">{myTokens.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Opponent portfolio */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">OPPONENT</p>
        <p className="font-mono text-xl font-bold text-foreground">${oppValue.toFixed(2)}</p>
        <div className={`text-xs font-mono font-bold ${isAhead ? "text-green-500" : "text-red-500"}`}>
          {isAhead ? "YOU'RE AHEAD 🔥" : "THEY'RE AHEAD 😰"}
        </div>
      </div>
    </div>
  );
};

export default ChickenPortfolio;
