import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, walletAddress } = await req.json();
    if (!sessionId || !walletAddress) throw new Error("Missing params");

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

    const isA = profile.id === session.user_a_id;
    const isB = profile.id === session.user_b_id;
    if (!isA && !isB) throw new Error("Not a participant");

    const myVerdict = isA ? session.user_a_verdict : session.user_b_verdict;
    const otherVerdict = isA ? session.user_b_verdict : session.user_a_verdict;
    const myFeedback = isA ? session.user_a_feedback : session.user_b_feedback;
    const otherFeedback = isA ? session.user_b_feedback : session.user_a_feedback;

    // If partner hasn't submitted yet, still waiting
    if (otherVerdict === null) {
      return new Response(JSON.stringify({ waiting: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Both verdicts are in! Check if session already completed
    const mutual = myVerdict === "vibe" && otherVerdict === "vibe";

    if (session.status !== "completed") {
      // Complete session
      await supabase
        .from("vibe_sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", sessionId);

      if (mutual) {
        const partnerId = isA ? session.user_b_id : session.user_a_id;

        // Create mutual friendship with error logging
        const { error: friendErr } = await supabase.from("friendships").insert([
          { follower_id: profile.id, following_id: partnerId, mutual: true },
          { follower_id: partnerId, following_id: profile.id, mutual: true },
        ]);
        if (friendErr) {
          console.error("Friendship insert error:", JSON.stringify(friendErr));
        }

        // Create conversation with upsert
        const [pA, pB] = [profile.id, partnerId].sort();
        const { error: convoErr } = await supabase.from("conversations").upsert(
          { participant_a: pA, participant_b: pB, vibe_session_id: sessionId },
          { onConflict: "participant_a,participant_b" }
        );
        if (convoErr) {
          console.error("Conversation upsert error:", JSON.stringify(convoErr));
        }

        // Tapestry follow
        const apiKey = Deno.env.get("TAPESTRY_API_KEY");
        if (apiKey) {
          const [{ data: myP }, { data: partnerP }] = await Promise.all([
            supabase.from("profiles").select("username").eq("id", profile.id).single(),
            supabase.from("profiles").select("username").eq("id", partnerId).single(),
          ]);
          if (myP?.username && partnerP?.username) {
            const tapUrl = "https://api.usetapestry.dev/v1";
            await Promise.allSettled([
              fetch(`${tapUrl}/followers?apiKey=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startId: myP.username, endId: partnerP.username }),
              }),
              fetch(`${tapUrl}/followers?apiKey=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startId: partnerP.username, endId: myP.username }),
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
    }

    // Get partner display_name for result
    const partnerId = isA ? session.user_b_id : session.user_a_id;
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", partnerId)
      .single();

    return new Response(JSON.stringify({
      waiting: false,
      mutual,
      partnerName: partnerProfile?.display_name || partnerProfile?.username || "Stranger",
      myFeedback: myFeedback ?? "",
      partnerFeedback: otherFeedback ?? "",
      myVerdict: myVerdict,
      partnerVerdict: otherVerdict,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});