import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, walletAddress, value } = await req.json();
    if (!walletAddress) throw new Error("walletAddress required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const { data: admin } = await supabase
      .from("admin_wallets")
      .select("wallet_address")
      .eq("wallet_address", walletAddress)
      .single();

    if (!admin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "dashboard") {
      // Total registered non-bot users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_bot", false);

      // Users who have completed at least one vibe session
      const { data: vibedRows } = await supabase
        .from("vibe_sessions")
        .select("user_a_id, user_b_id")
        .eq("status", "completed");

      const vibedUserIds = new Set<string>();
      if (vibedRows) {
        for (const r of vibedRows) {
          vibedUserIds.add(r.user_a_id);
          vibedUserIds.add(r.user_b_id);
        }
      }
      // Remove bot profiles from vibed count
      const { data: botProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_bot", true);
      const botIds = new Set((botProfiles ?? []).map((b: { id: string }) => b.id));
      for (const bid of botIds) vibedUserIds.delete(bid);

      // Active sessions
      const { count: activeSessions } = await supabase
        .from("vibe_sessions")
        .select("*", { count: "exact", head: true })
        .in("status", ["waiting", "active"]);

      // Matching mode
      const { data: modeSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "matching_mode")
        .single();

      // All non-bot users
      const { data: users } = await supabase
        .from("profiles")
        .select("id, username, wallet_address, vibe_score, last_seen, is_online, created_at")
        .eq("is_bot", false)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({
        totalUsers: totalUsers ?? 0,
        vibedUsers: vibedUserIds.size,
        activeSessions: activeSessions ?? 0,
        matchingMode: modeSetting?.value ?? "auto",
        users: users ?? [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_matching_mode") {
      const valid = ["auto", "bot_only", "human_only"];
      if (!valid.includes(value)) throw new Error("Invalid matching mode");

      await supabase
        .from("app_settings")
        .update({ value })
        .eq("key", "matching_mode");

      return new Response(JSON.stringify({ success: true, matchingMode: value }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
