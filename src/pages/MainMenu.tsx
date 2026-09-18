import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

export default function MainMenu() {
  const { user, signInAnon } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleStart = async (mode: "create" | "join") => {
    setErr("");
    setBusy(true);
    try {
      if (!user) {
        if (username.trim().length < 2)
          throw new Error("Username must be at least 2 characters");
        await signInAnon(username.trim());
      }

     if (mode === "create") {
  const code = genCode();
  const { data: auth } = await supabase.auth.getUser();

  // 1. Room
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .insert({ code, host_id: auth.user!.id, chapter_id: "ch1_p1" })
    .select()
    .single();
  if (roomErr) throw roomErr;

  // 2. Player (առաջ)
  const { error: playerErr } = await supabase.from("players").insert({
    room_id: room.id,
    user_id: auth.user!.id,
    role: "alpha",
  });
  if (playerErr) throw playerErr;

  // 3. Puzzle state (հետո)
  const { error: puzzleErr } = await supabase
    .from("puzzle_state")
    .insert({ room_id: room.id, state: {} });
  if (puzzleErr) throw puzzleErr;

  nav(`/lobby/${code}`);
} else {
        const code = joinCode.trim().toUpperCase();
        if (!code) throw new Error("Enter a room code");

        const { data: room, error } = await supabase
          .from("rooms")
          .select("*")
          .eq("code", code)
          .single();
        if (error || !room) throw new Error("Room not found");

        nav(`/lobby/${code}`);
      }
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 gap-8 relative">
    {/* Header — ցուցադրվում ա միայն login եղած ժամանակ */}
    {user && (
      <div className="absolute top-4 right-4 flex items-center gap-3 text-sm">
        <span className="text-gray-400">
          {(user.user_metadata as any)?.username ?? "Player"}
        </span>
        <button
          onClick={async () => {
            await useAuth.getState().signOut();
            location.reload();
          }}
          className="px-3 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-xs"
        >
          Logout
        </button>
      </div>
    )}
      <motion.div
  initial={{ y: -20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  className="flex flex-col items-center gap-4"
>
  <img src="/logo.svg" alt="CoQuest" className="w-24 h-24" />
  <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
    CoQuest
  </h1>
</motion.div>

      <p className="text-gray-400 text-center max-w-md">
        A cooperative puzzle quest for 2–4 players. You each see a different
        piece — talk to survive.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {!user && (
          <input
            className="px-4 py-3 rounded-lg bg-panel border border-white/10 focus:border-accent outline-none"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}

        <button
          disabled={busy}
          onClick={() => handleStart("create")}
          className="py-3 rounded-lg bg-accent hover:bg-accent/80 font-semibold transition disabled:opacity-50"
        >
          {busy ? "..." : "Create Room"}
        </button>

        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-3 rounded-lg bg-panel border border-white/10 focus:border-accent outline-none uppercase tracking-widest text-center"
            placeholder="CODE"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button
            disabled={busy}
            onClick={() => handleStart("join")}
            className="px-6 rounded-lg bg-accent2/20 border border-accent2/40 hover:bg-accent2/30 transition disabled:opacity-50"
          >
            Join
          </button>
        </div>

        {err && <p className="text-danger text-sm text-center">{err}</p>}
      </div>
    </div>
  );
}

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}