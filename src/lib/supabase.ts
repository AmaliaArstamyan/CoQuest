import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  console.warn("Supabase env vars missing — check .env.local");
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 20 } },
});