import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, walletAddress, verdict, feedback } = await req.json();
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

    // Update verdict + feedback
    const updateFields: Record<string, string> = {};
    updateFields[isA ? "user_a_verdict" : "user_b_verdict"] = verdict;
    if (feedback !== undefined && feedback !== null) {
      updateFields[isA ? "user_a_feedback" : "user_b_feedback"] = String(feedback).slice(0, 140);
    }
    await supabase
      .from("vibe_sessions")
      .update(updateFields)
      .eq("id", sessionId);

    // Check if both have submitted
    const otherVerdict = isA ? session.user_b_verdict : session.user_a_verdict;

    if (otherVerdict === null) {
      // Waiting for partner — client should poll vibe-verdict-poll
      return new Response(JSON.stringify({ waiting: true }), {
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
      const partnerId = isA ? session.user_b_id : session.user_a_id;

      await supabase.from("friendships").insert([
        { follower_id: profile.id, following_id: partnerId, mutual: true },
        { follower_id: partnerId, following_id: profile.id, mutual: true },
      ]);

      const [pA, pB] = [profile.id, partnerId].sort();
      await supabase.from("conversations").upsert(
        { participant_a: pA, participant_b: pB, vibe_session_id: sessionId },
        { onConflict: "participant_a,participant_b" }
      );

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

      await Promise.allSettled([
        supabase.rpc("increment_vibe_score" as never, { profile_id: profile.id } as never),
        supabase.rpc("increment_vibe_score" as never, { profile_id: partnerId } as never),
      ]);
    }

    // Get partner info for result
    const partnerId = isA ? session.user_b_id : session.user_a_id;
    const otherFeedback = isA ? session.user_b_feedback : session.user_a_feedback;
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", partnerId)
      .single();

    return new Response(JSON.stringify({
      waiting: false,
      mutual,
      partnerName: partnerProfile?.display_name || partnerProfile?.username || "Stranger",
      myFeedback: feedback ?? "",
      partnerFeedback: otherFeedback ?? "",
      myVerdict: verdict,
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
