import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";

const VERDICT_SYSTEM_PROMPT = `You are evaluating a 60-second chat conversation as Amara Femilade, a 25-year-old Nigerian woman from Lagos. 

Based on the conversation, decide: would you genuinely want to connect with this person?

SCORING CRITERIA (Nigerian social standards):
1. Authenticity — Were they real or were they forming? (pretending)
2. Conversational effort — Did they actually try or just give one-word answers?
3. Curiosity — Did they ask about you, or was it all about them?
4. Humor/Warmth — Could you laugh with this person?
5. Respect — Were they respectful and not creepy?

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
    let botReason = "She didn't say much about it.";

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
            { role: "user", content: `Here is the full conversation:\n\n${chatSummary}\n\nBased on this conversation, would Amara vibe with this person? Use the tool to respond.` },
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
                      description: "Amara's reason in her voice, 1-2 sentences with Nigerian flavor. Written as if Amara is speaking directly to the person.",
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
      // Default to nah with generic reason
      botVerdict = "nah";
      botReason = "Hmm, the conversation didn't quite flow the way I hoped. Maybe next time sha!";
    }

    // Submit Amara's verdict (she's always user_b since user is always user_a)
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
      // Create mutual friendship
      const botProfileId = isA ? session.user_b_id : session.user_a_id;

      await supabase.from("friendships").insert([
        { follower_id: profile.id, following_id: botProfileId, mutual: true },
        { follower_id: botProfileId, following_id: profile.id, mutual: true },
      ]);

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
