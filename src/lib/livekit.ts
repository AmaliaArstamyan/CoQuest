import { supabase } from "./supabase";

/**
 * Ստանում ա LiveKit JWT token Supabase Edge Function-ից։
 */
export async function fetchLiveKitToken(
  roomName: string,
  identity: string,
  name: string
): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken ?? "anon"}`,
      },
      body: JSON.stringify({ room: roomName, identity, name }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LiveKit token error: ${err}`);
  }

  const { token } = await res.json();
  return token;
}