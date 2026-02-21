import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress, offline } = await req.json();
    if (!walletAddress) throw new Error("walletAddress required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("profiles")
      .update({
        is_online: !offline,
        last_seen: new Date().toISOString(),
      })
      .eq("wallet_address", walletAddress);

    // Self-healing: sync Tapestry identity if tapestry_id is missing
    if (!offline) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, tapestry_id")
        .eq("wallet_address", walletAddress)
        .single();

      if (prof && !prof.tapestry_id) {
        try {
          const tapestryApiKey = Deno.env.get("TAPESTRY_API_KEY");
          if (tapestryApiKey) {
            const res = await fetch(
              `https://api.usetapestry.dev/api/v1/identities/${encodeURIComponent(walletAddress)}/profiles?apiKey=${tapestryApiKey}`
            );
            if (res.ok) {
              const data = await res.json();
              const profiles = data.profiles || data || [];
              const list = Array.isArray(profiles) ? profiles : [];
              const vibeProfile = list.find((p: any) => {
                const ns = typeof p.namespace === "string" ? p.namespace : p.namespace?.name;
                return ns === "vibe" || ns === "find";
              });
              if (vibeProfile) {
                const uname = vibeProfile.username || vibeProfile.id;
                if (uname) {
                  await supabase.from("profiles").update({
                    display_name: uname,
                    username: uname,
                    tapestry_id: uname,
                  }).eq("id", prof.id);
                }
              }
            }
          }
        } catch (e) {
          console.warn("Heartbeat Tapestry sync failed (non-blocking):", e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
