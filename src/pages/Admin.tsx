import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Activity, Zap, Settings, ArrowLeft, ShieldAlert, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  username: string | null;
  wallet_address: string;
  vibe_score: number | null;
  last_seen: string | null;
  is_online: boolean;
  created_at: string;
  real_name: string | null;
  display_name: string | null;
  country: string | null;
  city: string | null;
  x_handle: string | null;
  instagram_handle: string | null;
  bio_text: string | null;
  tapestry_id: string | null;
  games_played: number | null;
  games_won: number | null;
  avatar_url: string | null;
  find_score: number | null;
  hide_score: number | null;
  hunter_points: number | null;
  hunted_points: number | null;
}

interface DashboardData {
  totalUsers: number;
  vibedUsers: number;
  activeSessions: number;
  matchingMode: string;
  users: UserProfile[];
}

const Admin = () => {
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58() ?? null;

  const fetchDashboard = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    const { data: resp, error } = await supabase.functions.invoke("admin-api", {
      body: { action: "dashboard", walletAddress },
    });
    if (error || resp?.error) {
      setAuthorized(false);
    } else {
      setAuthorized(true);
      setData(resp as DashboardData);
    }
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (connected && walletAddress) fetchDashboard();
    else setLoading(false);
  }, [connected, walletAddress, fetchDashboard]);

  const handleModeChange = async (mode: string) => {
    if (!walletAddress) return;
    setSavingMode(true);
    const { data: resp, error } = await supabase.functions.invoke("admin-api", {
      body: { action: "set_matching_mode", walletAddress, value: mode },
    });
    if (error || resp?.error) {
      toast({ title: "Error", description: "Failed to update mode", variant: "destructive" });
    } else {
      setData((prev) => prev ? { ...prev, matchingMode: mode } : prev);
      toast({ title: "Updated", description: `Matching mode set to ${mode.replace("_", " ")}` });
    }
    setSavingMode(false);
  };

  const handleDeleteUser = async (userId: string, username: string | null) => {
    if (!walletAddress) return;
    const { data: resp, error } = await supabase.functions.invoke("admin-api", {
      body: { action: "delete_user", walletAddress, value: userId },
    });
    if (error || resp?.error) {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    } else {
      setData((prev) => prev ? { ...prev, users: prev.users.filter((u) => u.id !== userId), totalUsers: prev.totalUsers - 1 } : prev);
      toast({ title: "Deleted", description: `User ${username ?? "unknown"} has been removed` });
    }
  };

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
        <div className="scanlines" />
        <Card className="w-full max-w-md border-primary/30 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="font-display text-2xl text-primary">Admin Portal</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground text-center font-mono text-sm">
              Connect your wallet to access the admin dashboard.
            </p>
            <WalletMultiButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <div className="scanlines" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Unauthorized
  if (!authorized) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
        <div className="scanlines" />
        <Card className="w-full max-w-md border-destructive/30 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-2" />
            <CardTitle className="font-display text-2xl text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground text-center font-mono text-sm">
              This wallet is not authorized for admin access.
            </p>
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="scanlines" />
      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-primary glow-blue">Admin Dashboard</h1>
            <p className="text-muted-foreground font-mono text-xs mt-1">
              {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-4)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Home
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Registered Users", value: data?.totalUsers ?? 0, icon: Users, color: "text-primary" },
            { label: "Vibed Users", value: data?.vibedUsers ?? 0, icon: Zap, color: "text-accent" },
            { label: "Active Sessions", value: data?.activeSessions ?? 0, icon: Activity, color: "text-secondary" },
            { label: "Match Mode", value: (data?.matchingMode ?? "auto").replace("_", " "), icon: Settings, color: "text-muted-foreground" },
          ].map((stat) => (
            <Card key={stat.label} className="border-primary/20 bg-card/60 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs font-mono text-muted-foreground">{stat.label}</span>
                </div>
                <p className={`text-2xl font-display ${stat.color}`}>
                  {typeof stat.value === "number" ? stat.value : stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Matching Mode */}
        <Card className="border-primary/20 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-display text-lg text-primary flex items-center gap-2">
              <Settings className="h-5 w-5" /> Matching Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={data?.matchingMode ?? "auto"}
              onValueChange={handleModeChange}
              disabled={savingMode}
              className="space-y-3"
            >
              {[
                { value: "auto", label: "Auto", desc: "Human matches first, Amara bot fallback" },
                { value: "bot_only", label: "Bot Only", desc: "All users match with Amara only" },
                { value: "human_only", label: "Human Only", desc: "No bot fallback — users wait or see 'no one online'" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors">
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                  <Label htmlFor={opt.value} className="cursor-pointer flex-1">
                    <span className="font-display text-sm text-foreground">{opt.label}</span>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{opt.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {savingMode && <p className="text-xs text-muted-foreground mt-2 font-mono animate-pulse">Saving...</p>}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-primary/20 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-display text-lg text-primary flex items-center gap-2">
              <Users className="h-5 w-5" /> Registered Users ({data?.users?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/10">
                  <TableHead className="font-mono text-xs">Username</TableHead>
                  <TableHead className="font-mono text-xs">Wallet</TableHead>
                  <TableHead className="font-mono text-xs">Vibe Score</TableHead>
                  <TableHead className="font-mono text-xs">Last Seen</TableHead>
                  <TableHead className="font-mono text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.users ?? []).map((user) => (
                  <React.Fragment key={user.id}>
                    <TableRow
                      className="border-primary/5 cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                    >
                      <TableCell className="font-mono text-sm">{user.username ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.vibe_score ?? 0}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {user.last_seen ? new Date(user.last_seen).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block w-2 h-2 rounded-full ${user.is_online ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      </TableCell>
                    </TableRow>
                    {expandedUserId === user.id && (
                      <TableRow className="border-primary/5 bg-primary/5">
                        <TableCell colSpan={5} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 font-mono text-xs">
                            {[
                              ["Display Name", user.display_name],
                              ["Real Name", user.real_name],
                              ["Country", user.country],
                              ["City", user.city],
                              ["X Handle", user.x_handle ? `@${user.x_handle}` : null],
                              ["Instagram", user.instagram_handle ? `@${user.instagram_handle}` : null],
                              ["Tapestry ID", user.tapestry_id],
                              ["Games Played", user.games_played],
                              ["Games Won", user.games_won],
                              ["Vibe Score (Find)", user.find_score],
                              ["Hide Score", user.hide_score],
                              ["Hunter Pts", user.hunter_points],
                              ["Hunted Pts", user.hunted_points],
                              ["Joined", new Date(user.created_at).toLocaleDateString()],
                            ].map(([label, val]) => (
                              <div key={label as string}>
                                <span className="text-muted-foreground">{label as string}</span>
                                <p className="text-foreground mt-0.5">{val ?? "—"}</p>
                              </div>
                            ))}
                            {user.bio_text && (
                              <div className="col-span-2 md:col-span-3">
                                <span className="text-muted-foreground">Bio</span>
                                <p className="text-foreground mt-0.5">{user.bio_text}</p>
                              </div>
                            )}
                            <div className="col-span-2 md:col-span-3 pt-2 border-t border-primary/10">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm" className="gap-2">
                                    <Trash2 className="h-4 w-4" /> Delete User
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {user.username ?? "this user"}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove the user and all their associated data (games, sessions, messages, friendships). This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.username)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {(data?.users ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground font-mono text-sm py-8">
                      No registered users yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
