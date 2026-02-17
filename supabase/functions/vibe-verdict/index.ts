import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, walletAddress, verdict } = await req.json();
    if (!sessionId || !walletAddress || !["vibe", "nah"].includes(verdict)) {
      throw new Error("Invalid params");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();
    if (!profile) throw new Error("Profile not found");

    // Get session
    const { data: session } = await supabase
      .from("vibe_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (!session) throw new Error("Session not found");

    // Determine role
    const isA = profile.id === session.user_a_id;
    const isB = profile.id === session.user_b_id;
    if (!isA && !isB) throw new Error("Not a participant");

    // Update verdict
    const updateField = isA ? "user_a_verdict" : "user_b_verdict";
    await supabase
      .from("vibe_sessions")
      .update({ [updateField]: verdict })
      .eq("id", sessionId);

    // Check if both have submitted
    const otherVerdict = isA ? session.user_b_verdict : session.user_a_verdict;
    
    if (otherVerdict === null) {
      // Waiting for partner
      return new Response(JSON.stringify({ mutual: false, waiting: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Both verdicts are in
    const mutual = verdict === "vibe" && otherVerdict === "vibe";

    // Complete session
    await supabase
      .from("vibe_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (mutual) {
      // Create mutual friendship
      const partnerId = isA ? session.user_b_id : session.user_a_id;

      // Insert both directions as mutual
      await supabase.from("friendships").insert([
        { follower_id: profile.id, following_id: partnerId, mutual: true },
        { follower_id: partnerId, following_id: profile.id, mutual: true },
      ]);

      // Create conversation linked to this vibe session
      const [pA, pB] = [profile.id, partnerId].sort();
      await supabase.from("conversations").upsert(
        { participant_a: pA, participant_b: pB, vibe_session_id: sessionId },
        { onConflict: "participant_a,participant_b" }
      );

      // Call Tapestry follow API for both
      const apiKey = Deno.env.get("TAPESTRY_API_KEY");
      if (apiKey) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", profile.id)
          .single();
        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", partnerId)
          .single();

        if (myProfile?.username && partnerProfile?.username) {
          const tapestryUrl = "https://api.usetapestry.dev/api/v1";
          // Follow each other
          await Promise.allSettled([
            fetch(`${tapestryUrl}/profiles/${myProfile.username}/follow`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ targetUsername: partnerProfile.username }),
            }),
            fetch(`${tapestryUrl}/profiles/${partnerProfile.username}/follow`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ targetUsername: myProfile.username }),
            }),
          ]);
        }
      }

      // Increment vibe scores
      await Promise.allSettled([
        supabase.rpc("increment_vibe_score" as never, { profile_id: profile.id } as never),
        supabase.rpc("increment_vibe_score" as never, { profile_id: isA ? session.user_b_id : session.user_a_id } as never),
      ]);
    }

    return new Response(JSON.stringify({ mutual }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
