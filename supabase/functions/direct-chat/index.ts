import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { senderProfileId, receiverProfileId, text } = await req.json();
    if (!senderProfileId || !receiverProfileId || !text?.trim()) {
      throw new Error("Missing required fields");
    }
    if (text.length > 500) throw new Error("Message too long");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify mutual friendship
    const { data: isMutual } = await supabase.rpc("is_mutual_friend", {
      _profile_a: senderProfileId,
      _profile_b: receiverProfileId,
    });
    if (!isMutual) throw new Error("Not mutual friends");

    // Insert message
    const { error: insertErr } = await supabase
      .from("direct_messages")
      .insert({ sender_id: senderProfileId, receiver_id: receiverProfileId, text: text.trim() });
    if (insertErr) throw insertErr;

    // Update conversation preview
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("conversations")
      .update({ last_message_text: text.trim().slice(0, 100), last_message_at: now })
      .or(
        `and(participant_a.eq.${senderProfileId},participant_b.eq.${receiverProfileId}),and(participant_a.eq.${receiverProfileId},participant_b.eq.${senderProfileId})`
      );
    if (updateErr) console.error("Conv update err:", updateErr);

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
