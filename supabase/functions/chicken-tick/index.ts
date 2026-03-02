import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { gameId } = await req.json();
    if (!gameId) throw new Error("gameId is required");

    // Get the game
    const { data: game, error: gameErr } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameErr || !game) throw new Error("Game not found");
    if (game.status !== "active") {
      return new Response(
        JSON.stringify({ counter: game.counter, status: game.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-spam: only increment if at least 800ms have passed since started_at + (counter * 1000ms)
    const startedAt = new Date(game.started_at).getTime();
    const expectedTime = startedAt + game.counter * 1000;
    const now = Date.now();

    if (now < expectedTime + 800) {
      // Too soon, return current state
      return new Response(
        JSON.stringify({ counter: game.counter, status: game.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newCounter = game.counter + 1;

    if (newCounter >= 100) {
      // Both lose - mutual destruction
      const { error: updateErr } = await supabase
        .from("chicken_games")
        .update({
          counter: 100,
          status: "finished",
          ended_at: new Date().toISOString(),
          // winner_id stays null = both lose, platform keeps pot
        })
        .eq("id", gameId)
        .eq("status", "active");

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ counter: 100, status: "finished", result: "mutual_destruction" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normal tick
    const { error: updateErr } = await supabase
      .from("chicken_games")
      .update({ counter: newCounter })
      .eq("id", gameId)
      .eq("status", "active")
      .eq("counter", game.counter); // Optimistic lock to prevent double-tick

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ counter: newCounter, status: "active" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chicken-tick error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
