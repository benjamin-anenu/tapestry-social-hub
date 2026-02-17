import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAPESTRY_BASE = "https://api.usetapestry.dev/api/v1";

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
    const defaultUsername = `find60_${walletAddress.slice(0, 8).toLowerCase()}`;
    const body: Record<string, string> = {
      walletAddress,
      username: username || defaultUsername,
      blockchain: "SOLANA",
      execution: "FAST_UNCONFIRMED",
    };
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
      const profileId = profile.profile?.username || username;
      const followersRes = await fetch(
        `${TAPESTRY_BASE}/profiles/${profileId}/followers?apiKey=${TAPESTRY_API_KEY}&namespace=find60`
      );
      if (followersRes.ok) {
        const data = await followersRes.json();
        followers = data?.followers?.length ?? 0;
      } else {
        await followersRes.text();
      }

      const followingRes = await fetch(
        `${TAPESTRY_BASE}/profiles/${profileId}/following?apiKey=${TAPESTRY_API_KEY}&namespace=find60`
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

    // Fetch cross-app profiles
    let crossAppProfiles: Array<{ namespace: string; username?: string; followers: number; following: number }> = [];
    try {
      const searchRes = await fetch(
        `${TAPESTRY_BASE}/profiles/search?apiKey=${TAPESTRY_API_KEY}&shouldIncludeExternalProfiles=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        crossAppProfiles = (searchData.profiles || []).map((p: any) => ({
          namespace: p.namespace || "Unknown",
          username: p.username,
          followers: p.socialCounts?.followers ?? 0,
          following: p.socialCounts?.following ?? 0,
        }));
      } else {
        await searchRes.text();
      }
    } catch {
      // non-critical
    }

    return new Response(
      JSON.stringify({
        ...profile,
        social: { followers, following },
        crossAppProfiles,
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
