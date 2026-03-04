import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function toBase58(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) str += "1";
  for (let i = digits.length - 1; i >= 0; i--) str += BASE58_ALPHABET[digits[i]];
  return str;
}

function fromBase58(str: string): Uint8Array {
  const digits = [0];
  for (const c of str) {
    const idx = BASE58_ALPHABET.indexOf(c);
    if (idx < 0) throw new Error("Invalid base58 char");
    let carry = idx;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 58;
      digits[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      digits.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) digits.push(0);
  return new Uint8Array(digits.reverse());
}

function encodeLittleEndian(value: bigint, bytes: number): Uint8Array {
  const result = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    result[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return result;
}

async function sendPayout(winnerAddress: string, lamports: number): Promise<string | null> {
  const SOLANA_RPC = "https://api.devnet.solana.com";
  const privateKeyJson = Deno.env.get("ESCROW_WALLET_PRIVATE_KEY");
  if (!privateKeyJson) return null;

  let secretKeyArray: number[];
  try { secretKeyArray = JSON.parse(privateKeyJson); } catch { return null; }

  const secretKey = new Uint8Array(secretKeyArray);
  const publicKeyBytes = secretKey.slice(32, 64);

  // Get recent blockhash
  const bhResp = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestBlockhash", params: [{ commitment: "finalized" }] }),
  });
  const bhData = await bhResp.json();
  const recentBlockhash = fromBase58(bhData.result.value.blockhash);

  const recipientKey = fromBase58(winnerAddress);
  const SYSTEM_PROGRAM = new Uint8Array(32);

  // Build transfer instruction
  const data = new Uint8Array(12);
  data.set(encodeLittleEndian(2n, 4), 0); // transfer instruction index
  data.set(encodeLittleEndian(BigInt(lamports), 8), 4);

  // Compile message (legacy)
  const numKeys = 2;
  const header = new Uint8Array([1, 0, 1]); // 1 signer, 0 readonly signed, 1 readonly unsigned
  const keys = new Uint8Array(numKeys * 32);
  keys.set(publicKeyBytes, 0);
  keys.set(recipientKey, 32);

  const programIdx = numKeys;
  const allKeys = new Uint8Array((numKeys + 1) * 32);
  allKeys.set(keys, 0);
  allKeys.set(SYSTEM_PROGRAM, numKeys * 32);

  const updatedHeader = new Uint8Array([1, 0, 2]); // 1 signer, 0 readonly signed, 2 readonly unsigned (recipient + system)

  // Actually build proper message
  const msgParts: Uint8Array[] = [];
  msgParts.push(new Uint8Array([1, 0, 1])); // header
  msgParts.push(new Uint8Array([3])); // num accounts
  msgParts.push(publicKeyBytes); // account 0: signer (escrow)
  msgParts.push(recipientKey); // account 1: recipient
  msgParts.push(SYSTEM_PROGRAM); // account 2: system program
  msgParts.push(recentBlockhash); // recent blockhash
  msgParts.push(new Uint8Array([1])); // num instructions
  // instruction: program_id_index, num_accounts, accounts, data_len, data
  msgParts.push(new Uint8Array([2])); // program id index (system)
  msgParts.push(new Uint8Array([2])); // num accounts in instruction
  msgParts.push(new Uint8Array([0, 1])); // account indices [signer, recipient] — both writable, first is signer
  msgParts.push(new Uint8Array([data.length]));
  msgParts.push(data);

  let totalLen = 0;
  for (const p of msgParts) totalLen += p.length;
  const message = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of msgParts) { message.set(p, offset); offset += p.length; }

  // Wrap 32-byte Ed25519 seed in PKCS8 DER for crypto.subtle
  const pkcs8Header = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
    0x04, 0x22, 0x04, 0x20,
  ]);
  const pkcs8Key = new Uint8Array(pkcs8Header.length + 32);
  pkcs8Key.set(pkcs8Header, 0);
  pkcs8Key.set(secretKey.slice(0, 32), pkcs8Header.length);
  const keyPair = await crypto.subtle.importKey("pkcs8", pkcs8Key, { name: "Ed25519" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", keyPair, message));

  // Build transaction
  const txParts: Uint8Array[] = [];
  txParts.push(new Uint8Array([1])); // num signatures
  txParts.push(signature);
  txParts.push(message);

  let txLen = 0;
  for (const p of txParts) txLen += p.length;
  const tx = new Uint8Array(txLen);
  let txOff = 0;
  for (const p of txParts) { tx.set(p, txOff); txOff += p.length; }

  const txBase64 = btoa(String.fromCharCode(...tx));

  const sendResp = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "sendTransaction",
      params: [txBase64, { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed" }],
    }),
  });
  const sendData = await sendResp.json();
  if (sendData.error) {
    console.error("sendTransaction error:", sendData.error);
    return null;
  }
  return sendData.result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, walletAddress, value, configs, gameId } = await req.json();
    if (!walletAddress) throw new Error("walletAddress required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const { data: admin } = await supabase
      .from("admin_wallets")
      .select("wallet_address")
      .eq("wallet_address", walletAddress)
      .single();

    if (!admin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "dashboard") {
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_bot", false);

      const { data: vibedRows } = await supabase
        .from("vibe_sessions")
        .select("user_a_id, user_b_id")
        .eq("status", "completed");

      const vibedUserIds = new Set<string>();
      if (vibedRows) {
        for (const r of vibedRows) {
          vibedUserIds.add(r.user_a_id);
          vibedUserIds.add(r.user_b_id);
        }
      }
      const { data: botProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_bot", true);
      const botIds = new Set((botProfiles ?? []).map((b: { id: string }) => b.id));
      for (const bid of botIds) vibedUserIds.delete(bid);

      const { count: activeSessions } = await supabase
        .from("vibe_sessions")
        .select("*", { count: "exact", head: true })
        .in("status", ["waiting", "active"]);

      const { data: allSettings } = await supabase
        .from("app_settings")
        .select("key, value");

      const settingsMap: Record<string, string> = {};
      for (const s of allSettings ?? []) settingsMap[s.key] = s.value;

      const { data: users } = await supabase
        .from("profiles")
        .select("id, username, wallet_address, vibe_score, last_seen, is_online, created_at, real_name, display_name, country, city, x_handle, instagram_handle, bio_text, tapestry_id, games_played, games_won, avatar_url, find_score, hide_score, hunter_points, hunted_points")
        .eq("is_bot", false)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({
        totalUsers: totalUsers ?? 0,
        vibedUsers: vibedUserIds.size,
        activeSessions: activeSessions ?? 0,
        matchingMode: settingsMap["matching_mode"] ?? "auto",
        botConfig: {
          bot_model: settingsMap["bot_model"] ?? "google/gemini-3-flash-preview",
          bot_max_tokens: settingsMap["bot_max_tokens"] ?? "150",
          bot_max_nudges: settingsMap["bot_max_nudges"] ?? "3",
          bot_prompt_vibe: settingsMap["bot_prompt_vibe"] ?? "",
          bot_prompt_dm: settingsMap["bot_prompt_dm"] ?? "",
        },
        users: users ?? [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "escrow_dashboard") {
      const privateKeyJson = Deno.env.get("ESCROW_WALLET_PRIVATE_KEY");
      if (!privateKeyJson) throw new Error("Escrow wallet not configured");

      let secretKeyArray: number[];
      try { secretKeyArray = JSON.parse(privateKeyJson); } catch { throw new Error("Invalid escrow key format"); }

      const publicKeyBytes = new Uint8Array(secretKeyArray.slice(32, 64));
      const escrowPublicKey = toBase58(publicKeyBytes);

      let balanceSol = 0;
      try {
        const rpcResp = await fetch("https://api.devnet.solana.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [escrowPublicKey] }),
        });
        const rpcData = await rpcResp.json();
        if (rpcData.result?.value != null) balanceSol = rpcData.result.value / 1_000_000_000;
      } catch (e) { console.error("Failed to fetch escrow balance:", e); }

      const { data: games } = await supabase
        .from("chicken_games")
        .select("id, player_a_id, player_b_id, stake_amount, status, winner_id, player_a_deposited, player_b_deposited, player_a_tx, player_b_tx, payout_tx, payout_error, platform_fee, created_at, ended_at")
        .or("player_a_deposited.eq.true,player_b_deposited.eq.true,stake_amount.eq.0")
        .order("created_at", { ascending: false })
        .limit(50);

      const playerIds = new Set<string>();
      for (const g of games ?? []) {
        if (g.player_a_id) playerIds.add(g.player_a_id);
        if (g.player_b_id) playerIds.add(g.player_b_id);
        if (g.winner_id) playerIds.add(g.winner_id);
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", Array.from(playerIds));

      const nameMap: Record<string, string> = {};
      for (const p of profiles ?? []) nameMap[p.id] = p.username ?? p.id.slice(0, 8);

      const transactions = (games ?? []).map((g) => ({
        id: g.id,
        player_a: nameMap[g.player_a_id] ?? g.player_a_id?.slice(0, 8),
        player_b: g.player_b_id ? (nameMap[g.player_b_id] ?? g.player_b_id?.slice(0, 8)) : null,
        stake: g.stake_amount,
        status: g.status,
        winner: g.winner_id ? (nameMap[g.winner_id] ?? g.winner_id?.slice(0, 8)) : null,
        player_a_deposited: g.player_a_deposited,
        player_b_deposited: g.player_b_deposited,
        player_a_tx: g.player_a_tx,
        player_b_tx: g.player_b_tx,
        payout_tx: g.payout_tx,
        payout_error: g.payout_error,
        platform_fee: g.platform_fee,
        created_at: g.created_at,
        ended_at: g.ended_at,
      }));

      return new Response(JSON.stringify({ escrowPublicKey, balanceSol, transactions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "retry_payout") {
      if (!gameId) throw new Error("gameId required");

      const { data: game, error: gameErr } = await supabase
        .from("chicken_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (gameErr || !game) throw new Error("Game not found");
      if (game.status !== "finished") throw new Error("Game is not finished");
      if (!game.winner_id) throw new Error("No winner for this game");
      if (Number(game.stake_amount) === 0) throw new Error("Free play game — no payout needed");
      if (game.payout_tx) throw new Error("Payout already sent");

      const { data: winnerProfile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", game.winner_id)
        .single();

      if (!winnerProfile) throw new Error("Winner profile not found");

      const totalPot = Number(game.stake_amount) * 2;
      const fee = totalPot * 0.1;
      const payoutAmount = totalPot - fee;
      const lamports = Math.round(payoutAmount * 1_000_000_000);

      const txSig = await sendPayout(winnerProfile.wallet_address, lamports);

      if (txSig) {
        await supabase
          .from("chicken_games")
          .update({ payout_tx: txSig, payout_error: null, platform_fee: fee })
          .eq("id", gameId);

        return new Response(JSON.stringify({ success: true, payout_tx: txSig }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errMsg = "sendPayout returned null — check escrow balance or RPC";
        await supabase
          .from("chicken_games")
          .update({ payout_error: errMsg })
          .eq("id", gameId);

        throw new Error(errMsg);
      }
    }

    if (action === "set_matching_mode") {
      const valid = ["auto", "bot_only", "human_only"];
      if (!valid.includes(value)) throw new Error("Invalid matching mode");
      await supabase.from("app_settings").update({ value }).eq("key", "matching_mode");
      return new Response(JSON.stringify({ success: true, matchingMode: value }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_bot_config") {
      if (!configs || typeof configs !== "object") throw new Error("configs object required");
      const allowedKeys = ["bot_model", "bot_max_tokens", "bot_max_nudges", "bot_prompt_vibe", "bot_prompt_dm"];
      for (const [key, val] of Object.entries(configs)) {
        if (!allowedKeys.includes(key)) continue;
        const strVal = String(val);
        const { data: existing } = await supabase.from("app_settings").select("key").eq("key", key).maybeSingle();
        if (existing) {
          await supabase.from("app_settings").update({ value: strVal }).eq("key", key);
        } else {
          await supabase.from("app_settings").insert({ key, value: strVal });
        }
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      if (!value) throw new Error("User profile id required");
      await supabase.from("direct_messages").delete().or(`sender_id.eq.${value},receiver_id.eq.${value}`);
      await supabase.from("conversations").delete().or(`participant_a.eq.${value},participant_b.eq.${value}`);
      await supabase.from("friendships").delete().or(`follower_id.eq.${value},following_id.eq.${value}`);
      await supabase.from("puzzle_templates").delete().eq("profile_id", value);
      await supabase.from("vibe_sessions").delete().or(`user_a_id.eq.${value},user_b_id.eq.${value}`);
      await supabase.from("matchmaking_queue").delete().eq("profile_id", value);
      await supabase.from("games").delete().or(`hunter_id.eq.${value},hunted_id.eq.${value}`);
      const { error: delErr } = await supabase.from("profiles").delete().eq("id", value);
      if (delErr) throw new Error(delErr.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
