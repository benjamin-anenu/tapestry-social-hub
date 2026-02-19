import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Activity, Zap, Settings, ArrowLeft, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminUserSearch from "@/components/admin/AdminUserSearch";
import AdminBulkActions from "@/components/admin/AdminBulkActions";
import AdminUserRow, { type UserProfile } from "@/components/admin/AdminUserRow";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (!searchQuery.trim()) return data.users;
    const q = searchQuery.toLowerCase();
    return data.users.filter(
      (u) =>
        (u.username?.toLowerCase().includes(q)) ||
        u.wallet_address.toLowerCase().includes(q) ||
        (u.display_name?.toLowerCase().includes(q)) ||
        (u.real_name?.toLowerCase().includes(q))
    );
  }, [data?.users, searchQuery]);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const u of filteredUsers) {
        if (checked) next.add(u.id); else next.delete(u.id);
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

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
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
      toast({ title: "Deleted", description: `User ${username ?? "unknown"} has been removed` });
    }
  };

  const handleBulkDelete = async () => {
    if (!walletAddress || selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let deleted = 0;
    for (const id of ids) {
      const { error } = await supabase.functions.invoke("admin-api", {
        body: { action: "delete_user", walletAddress, value: id },
      });
      if (!error) deleted++;
    }
    setData((prev) => prev ? { ...prev, users: prev.users.filter((u) => !selectedIds.has(u.id)), totalUsers: prev.totalUsers - deleted } : prev);
    setSelectedIds(new Set());
    setBulkDeleting(false);
    toast({ title: "Bulk Delete", description: `${deleted} user(s) deleted` });
  };

  const handleExport = () => {
    const users = data?.users.filter((u) => selectedIds.has(u.id)) ?? [];
    if (users.length === 0) return;
    const headers = ["username", "wallet_address", "vibe_score", "real_name", "display_name", "country", "city", "x_handle", "instagram_handle", "games_played", "games_won", "find_score", "hide_score", "hunter_points", "hunted_points", "created_at"];
    const rows = users.map((u) => headers.map((h) => String((u as any)[h] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${users.length} user(s) exported to CSV` });
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
            {publicKey && (
              <p className="text-muted-foreground text-center font-mono text-[10px] break-all bg-muted/50 rounded px-3 py-2 select-all">
                {publicKey.toBase58()}
              </p>
            )}
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
          <CardHeader className="space-y-4">
            <CardTitle className="font-display text-lg text-primary flex items-center gap-2">
              <Users className="h-5 w-5" /> Registered Users ({data?.users?.length ?? 0})
            </CardTitle>
            <AdminUserSearch value={searchQuery} onChange={setSearchQuery} />
            <AdminBulkActions
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              onBulkDelete={handleBulkDelete}
              onExport={handleExport}
              deleting={bulkDeleting}
            />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/10">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-mono text-xs">Username</TableHead>
                  <TableHead className="font-mono text-xs">Wallet</TableHead>
                  <TableHead className="font-mono text-xs">Vibe Score</TableHead>
                  <TableHead className="font-mono text-xs">Last Seen</TableHead>
                  <TableHead className="font-mono text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <AdminUserRow
                    key={user.id}
                    user={user}
                    isExpanded={expandedUserId === user.id}
                    isSelected={selectedIds.has(user.id)}
                    onToggleExpand={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                    onToggleSelect={(checked) => toggleSelectOne(user.id, !!checked)}
                    onDelete={() => handleDeleteUser(user.id, user.username)}
                  />
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground font-mono text-sm py-8">
                      {searchQuery ? "No users match your search." : "No registered users yet."}
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
