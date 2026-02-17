import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAPESTRY_API = "https://api.usetapestry.dev/api/v1";
const NAMESPACE = "find";

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
        `${TAPESTRY_API}/profiles/${encodeURIComponent(checkUsername)}?apiKey=${TAPESTRY_API_KEY}`
      );
      let available = false;
      if (checkRes.status === 404) {
        available = true;
      } else if (checkRes.ok) {
        // Profile exists — not available
        available = false;
      } else {
        // Unexpected error — treat as unavailable to be safe
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
      // === CREATE MODE: use findOrCreate with user's chosen nickname ===
      const body: Record<string, string> = {
        walletAddress,
        username,
        blockchain: "SOLANA",
        execution: "FAST_UNCONFIRMED",
      };
      if (bio) body.bio = bio;

      const profileRes = await fetch(
        `${TAPESTRY_API}/profiles/findOrCreate?apiKey=${TAPESTRY_API_KEY}&namespace=${NAMESPACE}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!profileRes.ok) {
        const errText = await profileRes.text();
        // If "already exists", try to recover by looking up the existing profile
        if (profileRes.status === 400 && errText.includes("already exists")) {
          console.log("Username already exists, attempting wallet lookup recovery...");
          const recoveryRes = await fetch(
            `https://api.usetapestry.dev/v1/profiles/search?apiKey=${TAPESTRY_API_KEY}&shouldIncludeExternalProfiles=true`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ walletAddress }),
            }
          );
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
          // If recovery failed or no profile found, surface the error
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
      // === LOOKUP MODE: search for existing profile without creating one ===
      const searchRes = await fetch(
        `https://api.usetapestry.dev/v1/profiles/search?apiKey=${TAPESTRY_API_KEY}&shouldIncludeExternalProfiles=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const allProfiles = searchData.profiles || [];

        // Find the namespace profile
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

        // Map cross-app profiles
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

    // If we have a profile, fetch follower/following counts
    const profileUsername = (profile as any)?.profile?.username || (profile as any)?.username;
    if (profileUsername) {
      try {
        const followersRes = await fetch(
          `${TAPESTRY_API}/profiles/${profileUsername}/followers?apiKey=${TAPESTRY_API_KEY}`
        );
        if (followersRes.ok) {
          const data = await followersRes.json();
          followers = data?.followers?.length ?? 0;
        } else {
          await followersRes.text();
        }

        const followingRes = await fetch(
          `${TAPESTRY_API}/profiles/${profileUsername}/following?apiKey=${TAPESTRY_API_KEY}`
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

      // If create mode, also fetch cross-app profiles
      if (username && crossAppProfiles.length === 0) {
        try {
          const searchRes = await fetch(
            `https://api.usetapestry.dev/v1/profiles/search?apiKey=${TAPESTRY_API_KEY}&shouldIncludeExternalProfiles=true`,
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
      }
    }

    // Return profile (or null if not found in lookup mode)
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
