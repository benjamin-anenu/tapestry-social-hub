import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, walletAddress, text } = await req.json();
    if (!sessionId || !walletAddress) throw new Error("Missing fields");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get session
    const { data: session, error: sessErr } = await supabase
      .from("vibe_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessErr || !session) throw new Error("Session not found");
    if (session.status !== "active") throw new Error("Session not active");

    // Verify sender is participant
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (!profile) throw new Error("Profile not found");
    if (profile.id !== session.user_a_id && profile.id !== session.user_b_id) {
      throw new Error("Not a participant");
    }

    const chatLog = Array.isArray(session.chat_log) ? session.chat_log : [];

    // If text is provided, append message
    if (text) {
      chatLog.push({
        sender: walletAddress,
        text: text.slice(0, 500),
        time: Date.now(),
      });

      await supabase
        .from("vibe_sessions")
        .update({ chat_log: chatLog })
        .eq("id", sessionId);
    }

    // Return full chat_log for polling support
    return new Response(JSON.stringify({ ok: true, chatLog }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
