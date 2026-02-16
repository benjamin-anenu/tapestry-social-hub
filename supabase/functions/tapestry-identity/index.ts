import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAPESTRY_BASE = "https://api.dev.usetapestry.dev/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TAPESTRY_API_KEY = Deno.env.get("TAPESTRY_API_KEY");
    if (!TAPESTRY_API_KEY) {
      throw new Error("TAPESTRY_API_KEY is not configured");
    }

    const { walletAddress, username, bio } = await req.json();
    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "walletAddress is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // findOrCreate profile on Tapestry
    const body: Record<string, string> = {
      walletAddress,
      blockchain: "SOLANA",
      execution: "FAST_UNCONFIRMED",
    };
    if (username) body.username = username;
    if (bio) body.bio = bio;

    const profileRes = await fetch(
      `${TAPESTRY_BASE}/profiles/findOrCreate?apiKey=${TAPESTRY_API_KEY}&namespace=find60`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      throw new Error(`Tapestry API error [${profileRes.status}]: ${errText}`);
    }

    const profile = await profileRes.json();

    // Try to fetch follower/following counts for reputation
    let followers = 0;
    let following = 0;
    try {
      const followersRes = await fetch(
        `${TAPESTRY_BASE}/followers/${profile.profile?.username || username}?apiKey=${TAPESTRY_API_KEY}&namespace=find60`
      );
      if (followersRes.ok) {
        const data = await followersRes.json();
        followers = data?.followers?.length ?? 0;
      } else {
        await followersRes.text(); // consume body
      }

      const followingRes = await fetch(
        `${TAPESTRY_BASE}/following/${profile.profile?.username || username}?apiKey=${TAPESTRY_API_KEY}&namespace=find60`
      );
      if (followingRes.ok) {
        const data = await followingRes.json();
        following = data?.following?.length ?? 0;
      } else {
        await followingRes.text();
      }
    } catch {
      // non-critical
    }

    return new Response(
      JSON.stringify({
        ...profile,
        social: { followers, following },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("tapestry-identity error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
