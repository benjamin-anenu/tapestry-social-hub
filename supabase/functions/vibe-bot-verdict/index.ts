import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";

const VERDICT_SYSTEM_PROMPT = `You are evaluating a 60-second chat conversation as Amara Femilade, a 25-year-old Nigerian woman from Lagos. You speak proper English with a soft Nigerian touch — warm, educated, confident.

Based on the conversation transcript provided, decide: would you genuinely want to connect with this person?

SCORING CRITERIA:
1. Authenticity — Were they genuine or were they putting on a show?
2. Conversational effort — Did they actually try or just give bare minimum responses?
3. Curiosity — Did they ask about you, or was it all about them?
4. Humor/Warmth — Could you actually enjoy talking to this person?
5. Respect — Were they respectful?

CRITICAL RULES FOR YOUR REASON:
- You MUST reference specific things the person said or did in the conversation transcript.
- NEVER claim they did something (e.g. "gave one-word answers", "didn't engage") if the transcript shows otherwise.
- Quote or paraphrase at least one specific thing they said in your reason.
- If giving a "nah", point to specific weak moments from the transcript.
- If giving a "vibe", mention what specifically impressed you from what they actually said.
- Your reason must be grounded ONLY in what appears in the transcript. Do not invent or assume anything.

You MUST respond using the provided tool function.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, walletAddress, userVerdict } = await req.json();
    if (!sessionId || !walletAddress || !["vibe", "nah"].includes(userVerdict)) {
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

    // Submit user's verdict
    const updateField = isA ? "user_a_verdict" : "user_b_verdict";
    await supabase
      .from("vibe_sessions")
      .update({ [updateField]: userVerdict })
      .eq("id", sessionId);

    // Get Amara's AI verdict
    let botVerdict: "vibe" | "nah" = "nah";
    let botReason = "The conversation didn't quite flow the way I hoped. Maybe next time sha!";

    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("No API key");

      const chatLog = Array.isArray(session.chat_log) ? session.chat_log : [];
      const chatSummary = chatLog
        .map((m: { sender: string; text: string }) =>
          `${m.sender === BOT_WALLET ? "Amara" : "Stranger"}: ${m.text}`
        )
        .join("\n");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: VERDICT_SYSTEM_PROMPT },
            { role: "user", content: `Here is the full conversation transcript:\n\n${chatSummary}\n\nIMPORTANT: Your reason MUST only reference things that actually appear in this transcript above. Do not invent or assume anything that is not shown. Based on this conversation, would Amara vibe with this person? Use the tool to respond.` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_verdict",
                description: "Submit Amara's verdict on the conversation",
                parameters: {
                  type: "object",
                  properties: {
                    verdict: {
                      type: "string",
                      enum: ["vibe", "nah"],
                      description: "Whether Amara vibes with this person",
                    },
                    reason: {
                      type: "string",
                      description: "Amara's reason in her voice — proper English with soft Nigerian flavor, 1-2 sentences. Written as if speaking directly to the person. MUST reference specific things from the conversation transcript. Never fabricate claims about what happened.",
                    },
                  },
                  required: ["verdict", "reason"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_verdict" } },
        }),
      });

      if (!aiResp.ok) {
        console.error("AI verdict error:", aiResp.status, await aiResp.text());
        throw new Error("AI error");
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        botVerdict = parsed.verdict === "vibe" ? "vibe" : "nah";
        botReason = parsed.reason ?? botReason;
      }
    } catch (aiErr) {
      console.error("AI verdict failed:", aiErr);
      botVerdict = "nah";
      botReason = "The conversation didn't quite flow the way I hoped. Maybe next time sha!";
    }

    // Submit Amara's verdict
    const botField = isA ? "user_b_verdict" : "user_a_verdict";
    await supabase
      .from("vibe_sessions")
      .update({ [botField]: botVerdict })
      .eq("id", sessionId);

    // Check mutual result
    const mutual = userVerdict === "vibe" && botVerdict === "vibe";

    // Complete session
    await supabase
      .from("vibe_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (mutual) {
      const botProfileId = isA ? session.user_b_id : session.user_a_id;

      await supabase.from("friendships").insert([
        { follower_id: profile.id, following_id: botProfileId, mutual: true },
        { follower_id: botProfileId, following_id: profile.id, mutual: true },
      ]);

      const [pA, pB] = [profile.id, botProfileId].sort();
      await supabase.from("conversations").upsert(
        { participant_a: pA, participant_b: pB, vibe_session_id: sessionId },
        { onConflict: "participant_a,participant_b" }
      );

      // Tapestry follow
      const apiKey = Deno.env.get("TAPESTRY_API_KEY");
      if (apiKey) {
        const [{ data: myP }, { data: botP }] = await Promise.all([
          supabase.from("profiles").select("username").eq("id", profile.id).single(),
          supabase.from("profiles").select("username").eq("id", botProfileId).single(),
        ]);
        if (myP?.username && botP?.username) {
          const tapUrl = "https://api.usetapestry.dev/api/v1";
          await Promise.allSettled([
            fetch(`${tapUrl}/followers?apiKey=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ startId: myP.username, endId: botP.username }),
            }),
            fetch(`${tapUrl}/followers?apiKey=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ startId: botP.username, endId: myP.username }),
            }),
          ]);
        }
      }

      // Increment vibe scores
      await Promise.allSettled([
        supabase.rpc("increment_vibe_score" as never, { profile_id: profile.id } as never),
        supabase.rpc("increment_vibe_score" as never, { profile_id: botProfileId } as never),
      ]);
    }

    return new Response(JSON.stringify({
      mutual,
      botVerdict,
      botReason,
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
