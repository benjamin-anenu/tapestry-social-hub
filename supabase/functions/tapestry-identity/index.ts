import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAPESTRY_API = "https://api.usetapestry.dev/api/v1";
const NAMESPACE = "vibe";
const LEGACY_NAMESPACE = "find";

// Helper: find all profiles linked to a wallet address
async function getProfilesByWallet(apiKey: string, walletAddress: string) {
  const res = await fetch(
    `${TAPESTRY_API}/identities/${encodeURIComponent(walletAddress)}/profiles?apiKey=${apiKey}`
  );
  return res;
}

// Helper: extract namespace name (handles both string and object formats)
function getNamespaceName(ns: unknown): string {
  if (typeof ns === "string") return ns;
  if (ns && typeof ns === "object" && "name" in ns) return (ns as any).name;
  return "Unknown";
}

// Helper: extract username from profile (handles various response formats)
function getProfileUsername(p: any): string | undefined {
  return p.username || p.id || p.profile?.username || p.profile?.id;
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

    const { walletAddress, username, bio, checkUsername, realName, country, xHandle, instagramHandle, bioText, updateProfile } = await req.json();

    // === UPDATE PROFILE MODE (edit existing) ===
    if (updateProfile && walletAddress) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey);
        const updateFields: Record<string, unknown> = {};
        if (realName !== undefined) updateFields.real_name = realName || null;
        if (country !== undefined) updateFields.country = country || null;
        if (xHandle !== undefined) updateFields.x_handle = xHandle || null;
        if (instagramHandle !== undefined) updateFields.instagram_handle = instagramHandle || null;
        if (bioText !== undefined) updateFields.bio_text = bioText || null;
        const { error: updateErr } = await supabase
          .from("profiles")
          .update(updateFields)
          .eq("wallet_address", walletAddress);
        if (updateErr) throw updateErr;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Profile update error:", e);
        return new Response(JSON.stringify({ error: "Failed to update profile" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (checkUsername) {
      const checkRes = await fetch(
        `${TAPESTRY_API}/profiles/${encodeURIComponent(checkUsername)}?apiKey=${TAPESTRY_API_KEY}`
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
        `${TAPESTRY_API}/profiles/findOrCreate?apiKey=${TAPESTRY_API_KEY}&namespace=${NAMESPACE}`,
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
          const recoveryRes = await getProfilesByWallet(TAPESTRY_API_KEY, walletAddress);
          if (recoveryRes.ok) {
            const recoveryData = await recoveryRes.json();
            const allProfiles = recoveryData.profiles || recoveryData || [];
            const profilesList = Array.isArray(allProfiles) ? allProfiles : [];
            console.log("Recovery profiles raw:", JSON.stringify(profilesList.slice(0, 2)));
            const findProfile = profilesList.find((p: any) => getNamespaceName(p.namespace) === NAMESPACE)
              || profilesList.find((p: any) => getNamespaceName(p.namespace) === LEGACY_NAMESPACE);
            if (findProfile) {
              const uname = getProfileUsername(findProfile);
              profile = {
                profile: {
                  username: uname,
                  bio: findProfile.bio || findProfile.customProperties?.bio,
                  image: findProfile.image || findProfile.customProperties?.profileImage,
                },
                username: uname,
              };
              crossAppProfiles = profilesList.map((p: any) => ({
                namespace: getNamespaceName(p.namespace),
                username: getProfileUsername(p),
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

      // Save profile fields to DB via service role (bypasses RLS)
      // Always update display_name, tapestry_id, and username during create mode
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey);
        const updateFields: Record<string, unknown> = {
          display_name: username,
          tapestry_id: username,
          username: username,
        };
        // Fallback: ensure display_name is always set
        if (realName) updateFields.real_name = realName;
        if (country) updateFields.country = country;
        if (xHandle) updateFields.x_handle = xHandle;
        if (instagramHandle) updateFields.instagram_handle = instagramHandle;
        if (bioText) updateFields.bio_text = bioText;
        const { error: updateErr } = await supabase
          .from("profiles")
          .update(updateFields)
          .eq("wallet_address", walletAddress);
        if (updateErr) console.warn("Profile extension update failed:", updateErr);
      } catch (e) {
        console.warn("Profile extension error:", e);
      }
    } else {
      // === LOOKUP MODE ===
      const searchRes = await getProfilesByWallet(TAPESTRY_API_KEY, walletAddress);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        console.log("Lookup raw response keys:", Object.keys(searchData));
        const allProfiles = searchData.profiles || searchData || [];
        const profilesList = Array.isArray(allProfiles) ? allProfiles : [];
        if (profilesList.length > 0) {
          console.log("First profile shape:", JSON.stringify(profilesList[0]));
        }
        const findProfile = profilesList.find((p: any) => getNamespaceName(p.namespace) === NAMESPACE)
          || profilesList.find((p: any) => getNamespaceName(p.namespace) === LEGACY_NAMESPACE);

        if (findProfile) {
          const uname = getProfileUsername(findProfile);
          profile = {
            profile: {
              username: uname,
              bio: findProfile.bio || findProfile.customProperties?.bio,
              image: findProfile.image || findProfile.customProperties?.profileImage,
            },
            username: uname,
          };
        }

        crossAppProfiles = profilesList.map((p: any) => ({
          namespace: getNamespaceName(p.namespace),
          username: getProfileUsername(p),
          followers: p.socialCounts?.followers ?? 0,
          following: p.socialCounts?.following ?? 0,
        }));
      } else {
        const errText = await searchRes.text();
        console.warn("Tapestry identity lookup failed:", searchRes.status, errText);
      }
    }

    // Fetch follower/following counts
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
          const searchRes = await getProfilesByWallet(TAPESTRY_API_KEY, walletAddress);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const allProfiles = searchData.profiles || searchData || [];
            const profilesList = Array.isArray(allProfiles) ? allProfiles : [];
            crossAppProfiles = profilesList.map((p: any) => ({
              namespace: getNamespaceName(p.namespace),
              username: getProfileUsername(p),
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
