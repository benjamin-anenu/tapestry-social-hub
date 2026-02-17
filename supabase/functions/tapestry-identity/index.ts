import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAPESTRY_BASE = "https://api.usetapestry.dev/v1";
const NAMESPACE = "find";

// Helper: wallet-based profile search via POST
async function searchProfilesByWallet(apiKey: string, walletAddress: string) {
  const res = await fetch(
    `${TAPESTRY_BASE}/profiles/search?apiKey=${apiKey}&shouldIncludeExternalProfiles=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, limit: 50, offset: 0 }),
    }
  );
  return res;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TAPESTRY_API_KEY = Deno.env.get("TAPESTRY_API_KEY");
    if (!TAPESTRY_API_KEY) {
      throw new Error("TAPESTRY_API_KEY is not configured");
    }

    const { walletAddress, username, bio, checkUsername } = await req.json();

    // === CHECK USERNAME AVAILABILITY MODE ===
    if (checkUsername) {
      const checkRes = await fetch(
        `${TAPESTRY_BASE}/profiles/${encodeURIComponent(checkUsername)}?apiKey=${TAPESTRY_API_KEY}`
      );
      let available = false;
      if (checkRes.status === 404) {
        available = true;
      } else if (checkRes.ok) {
        available = false;
      } else {
        const errText = await checkRes.text();
        console.warn("Username check unexpected response:", checkRes.status, errText);
        available = false;
      }
      return new Response(JSON.stringify({ username: checkUsername, available }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "walletAddress is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let profile: Record<string, unknown> | null = null;
    let followers = 0;
    let following = 0;
    let crossAppProfiles: Array<{ namespace: string; username?: string; followers: number; following: number }> = [];

    if (username) {
      // === CREATE MODE ===
      const body: Record<string, string> = {
        walletAddress,
        username,
        blockchain: "SOLANA",
        execution: "FAST_UNCONFIRMED",
      };
      if (bio) body.bio = bio;

      const profileRes = await fetch(
        `${TAPESTRY_BASE}/profiles/findOrCreate?apiKey=${TAPESTRY_API_KEY}&namespace=${NAMESPACE}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!profileRes.ok) {
        const errText = await profileRes.text();
        if (profileRes.status === 400 && errText.includes("already exists")) {
          console.log("Username already exists, attempting wallet lookup recovery...");
          const recoveryRes = await searchProfilesByWallet(TAPESTRY_API_KEY, walletAddress);
          if (recoveryRes.ok) {
            const recoveryData = await recoveryRes.json();
            const allProfiles = recoveryData.profiles || [];
            const findProfile = allProfiles.find((p: any) => p.namespace === NAMESPACE);
            if (findProfile) {
              profile = {
                profile: {
                  username: findProfile.username,
                  bio: findProfile.bio,
                  image: findProfile.image,
                },
                username: findProfile.username,
              };
              crossAppProfiles = allProfiles.map((p: any) => ({
                namespace: p.namespace || "Unknown",
                username: p.username,
                followers: p.socialCounts?.followers ?? 0,
                following: p.socialCounts?.following ?? 0,
              }));
            }
          }
          if (!profile) {
            return new Response(JSON.stringify({ error: "That nickname is already taken. Please choose a different one." }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          throw new Error(`Tapestry API error [${profileRes.status}]: ${errText}`);
        }
      } else {
        profile = await profileRes.json();
      }
    } else {
      // === LOOKUP MODE ===
      const searchRes = await searchProfilesByWallet(TAPESTRY_API_KEY, walletAddress);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const allProfiles = searchData.profiles || [];
        const findProfile = allProfiles.find((p: any) => p.namespace === NAMESPACE);

        if (findProfile) {
          profile = {
            profile: {
              username: findProfile.username,
              bio: findProfile.bio,
              image: findProfile.image,
            },
            username: findProfile.username,
          };
        }

        crossAppProfiles = allProfiles.map((p: any) => ({
          namespace: p.namespace || "Unknown",
          username: p.username,
          followers: p.socialCounts?.followers ?? 0,
          following: p.socialCounts?.following ?? 0,
        }));
      } else {
        const errText = await searchRes.text();
        console.warn("Tapestry search failed:", searchRes.status, errText);
      }
    }

    // Fetch follower/following counts
    const profileUsername = (profile as any)?.profile?.username || (profile as any)?.username;
    if (profileUsername) {
      try {
        const followersRes = await fetch(
          `${TAPESTRY_BASE}/profiles/followers/${profileUsername}/count?apiKey=${TAPESTRY_API_KEY}`
        );
        if (followersRes.ok) {
          const data = await followersRes.json();
          followers = data?.count ?? 0;
        } else {
          await followersRes.text();
        }

        const followingRes = await fetch(
          `${TAPESTRY_BASE}/profiles/following/${profileUsername}/count?apiKey=${TAPESTRY_API_KEY}`
        );
        if (followingRes.ok) {
          const data = await followingRes.json();
          following = data?.count ?? 0;
        } else {
          await followingRes.text();
        }
      } catch {
        // non-critical
      }

      // If create mode, also fetch cross-app profiles
      if (username && crossAppProfiles.length === 0) {
        try {
          const searchRes = await searchProfilesByWallet(TAPESTRY_API_KEY, walletAddress);
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
      }
    }

    return new Response(
      JSON.stringify({
        ...(profile || {}),
        profile: profile ? (profile as any).profile || profile : null,
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
