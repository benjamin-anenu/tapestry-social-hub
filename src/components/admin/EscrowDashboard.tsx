import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wallet, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EscrowTransaction {
  id: string;
  player_a: string;
  player_b: string | null;
  stake: number;
  status: string;
  winner: string | null;
  player_a_tx: string | null;
  player_b_tx: string | null;
  payout_tx: string | null;
  payout_error: string | null;
  platform_fee: number;
  created_at: string;
  ended_at: string | null;
}

interface EscrowData {
  escrowPublicKey: string;
  balanceSol: number;
  transactions: EscrowTransaction[];
}

interface EscrowDashboardProps {
  walletAddress: string;
}

const EXPLORER_BASE = "https://explorer.solana.com/tx/";
const EXPLORER_SUFFIX = "?cluster=devnet";

function TxLink({ sig }: { sig: string }) {
  return (
    <a
      href={`${EXPLORER_BASE}${sig}${EXPLORER_SUFFIX}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline font-mono text-[10px] inline-flex items-center gap-1"
    >
      {sig.slice(0, 8)}…
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "active": return "text-accent";
    case "finished": return "text-primary";
    case "depositing": return "text-yellow-500";
    default: return "text-muted-foreground";
  }
}

function PayoutCell({ tx }: { tx: EscrowTransaction }) {
  // Active/depositing games — payout not expected yet
  if (tx.status !== "finished") {
    return <span className="text-muted-foreground text-[10px]">—</span>;
  }
  // Finished with successful payout
  if (tx.payout_tx) {
    return <TxLink sig={tx.payout_tx} />;
  }
  // Finished with recorded error
  if (tx.payout_error) {
    return (
      <span className="text-destructive font-mono text-[10px] uppercase cursor-help" title={tx.payout_error}>
        FAILED
      </span>
    );
  }
  // Finished but no payout and no error — unknown failure
  return (
    <span className="text-destructive font-mono text-[10px] uppercase">
      MISSING
    </span>
  );
}

const EscrowDashboard = ({ walletAddress }: EscrowDashboardProps) => {
  const [data, setData] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEscrow = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("admin-api", {
        body: { action: "escrow_dashboard", walletAddress },
      });
      if (!error && !resp?.error) {
        setData(resp as EscrowData);
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEscrow();
  }, [walletAddress]);

  const copyAddress = () => {
    if (data?.escrowPublicKey) {
      navigator.clipboard.writeText(data.escrowPublicKey);
      toast({ title: "Copied", description: "Escrow address copied to clipboard" });
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-card/60 backdrop-blur">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Summary stats
  const totalDeposits = data.transactions.reduce((sum, tx) => {
    const deposited = (tx.player_a_tx ? 1 : 0) + (tx.player_b_tx ? 1 : 0);
    return sum + deposited * tx.stake;
  }, 0);
  const totalPayouts = data.transactions.filter((tx) => tx.payout_tx).length;
  const totalFees = data.transactions.reduce((sum, tx) => sum + (tx.platform_fee || 0), 0);
  const failedPayouts = data.transactions.filter((tx) => tx.status === "finished" && !tx.payout_tx).length;

  return (
    <Card className="border-primary/20 bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg text-primary flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Escrow Wallet
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchEscrow} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance + Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-primary/20 bg-card p-4">
            <p className="text-xs font-mono text-muted-foreground mb-1">Balance</p>
            <p className="text-3xl font-display text-primary">{data.balanceSol.toFixed(4)} <span className="text-lg text-muted-foreground">SOL</span></p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-mono text-muted-foreground mb-1">Address</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-foreground truncate">
                {data.escrowPublicKey.slice(0, 12)}…{data.escrowPublicKey.slice(-8)}
              </p>
              <Button variant="ghost" size="icon" onClick={copyAddress} className="h-7 w-7 shrink-0">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">Total Deposits</p>
            <p className="text-lg font-display text-foreground">{totalDeposits.toFixed(2)} <span className="text-xs text-muted-foreground">SOL</span></p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">Payouts Sent</p>
            <p className="text-lg font-display text-primary">{totalPayouts}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">Fees Collected</p>
            <p className="text-lg font-display text-foreground">{totalFees.toFixed(4)} <span className="text-xs text-muted-foreground">SOL</span></p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">Failed Payouts</p>
            <p className={`text-lg font-display ${failedPayouts > 0 ? "text-destructive" : "text-primary"}`}>{failedPayouts}</p>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <p className="text-sm font-display text-foreground mb-3">Transaction History ({data.transactions.length})</p>
          <ScrollArea className="h-[400px] rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/10">
                  <TableHead className="font-mono text-[10px]">Game</TableHead>
                  <TableHead className="font-mono text-[10px]">Players</TableHead>
                  <TableHead className="font-mono text-[10px]">Stake</TableHead>
                  <TableHead className="font-mono text-[10px]">Fee</TableHead>
                  <TableHead className="font-mono text-[10px]">Status</TableHead>
                  <TableHead className="font-mono text-[10px]">Winner</TableHead>
                  <TableHead className="font-mono text-[10px]">Deposits</TableHead>
                  <TableHead className="font-mono text-[10px]">Payout</TableHead>
                  <TableHead className="font-mono text-[10px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border/50">
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {tx.id.slice(0, 6)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="text-foreground">{tx.player_a}</span>
                      <span className="text-muted-foreground mx-1">vs</span>
                      <span className="text-foreground">{tx.player_b ?? "—"}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{tx.stake} SOL</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {tx.platform_fee > 0 ? `${tx.platform_fee.toFixed(3)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-[10px] uppercase ${statusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">{tx.winner ?? "—"}</TableCell>
                    <TableCell className="space-y-0.5">
                      {tx.player_a_tx && <div><span className="text-muted-foreground text-[9px]">A:</span> <TxLink sig={tx.player_a_tx} /></div>}
                      {tx.player_b_tx && <div><span className="text-muted-foreground text-[9px]">B:</span> <TxLink sig={tx.player_b_tx} /></div>}
                      {!tx.player_a_tx && !tx.player_b_tx && <span className="text-muted-foreground text-[10px]">—</span>}
                    </TableCell>
                    <TableCell>
                      <PayoutCell tx={tx} />
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {data.transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground font-mono text-sm py-8">
                      No escrow transactions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default EscrowDashboard;
