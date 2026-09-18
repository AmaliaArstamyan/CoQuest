import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/stores/authStore";
import { useRoom } from "@/stores/roomStore";


const ROLES = ["alpha", "beta", "gamma", "delta"] as const;
const ROLE_COLORS: Record<string, string> = {
  alpha: "text-accent",
  beta: "text-accent2",
  gamma: "text-yellow-400",
  delta: "text-pink-400",
};

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const { user } = useAuth();

  // ⭐ status ավելացված
  const { players, hostId, roomId, status, subscribe, setRoom } = useRoom();

  const codeUC = code!.toUpperCase();

  // ============================================
  // useEffect #1 — room fetch + player join + subscribe
  // ============================================
  useEffect(() => {
    let active = true;
    let unsub: (() => void) | null = null;

    const joinRoom = async () => {
      console.log("🔍 Lobby useEffect, code:", codeUC);

      const { data: room, error: roomErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", codeUC)
        .single();

      console.log("🏠 room fetch:", { room: room?.code, roomErr });

      if (!active) return;

      if (!room) {
        console.error("❌ No room found");
        nav("/");
        return;
      }

      const { data: existing } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!active) return;

      if (!existing) {
        const { data: current } = await supabase
          .from("players")
          .select("role")
          .eq("room_id", room.id);

        if (!active) return;

        const taken = new Set(current?.map((p) => p.role));
        const free = ROLES.find((r) => !taken.has(r));

        if (!free) {
          alert("Room full");
          nav("/");
          return;
        }

        await supabase.from("players").insert({
          room_id: room.id,
          user_id: user!.id,
          role: free,
        });

        if (!active) return;
      }

      setRoom({
        roomId: room.id,
        code: room.code,
        hostId: room.host_id,
        status: room.status,
      });

      unsub = subscribe(room.id);
    };

    joinRoom();

    return () => {
      active = false;
      unsub?.();
    };
  }, [codeUC, user, nav, setRoom, subscribe]);

  // ============================================
  // ⭐ useEffect #2 — status watcher → auto-navigate to game
  // ============================================
  useEffect(() => {
    if (status === "playing") {
      console.log("🎮 Status = playing → navigating to room");
      nav(`/room/${codeUC}`);
    }
  }, [status, codeUC, nav]);

  // ============================================
  // UI logic
  // ============================================
  const me = players.find((p) => p.user_id === user?.id);
  const isHost = hostId === user?.id;
  const canStart =
    players.length >= 2 && players.every((p) => p.ready) && isHost;

  const toggleReady = async () => {
    if (!me) return;
    await supabase
      .from("players")
      .update({ ready: !me.ready })
      .eq("id", me.id);
  };

  const startGame = async () => {
    if (!roomId) return;
    await supabase
      .from("rooms")
      .update({ status: "playing" })
      .eq("id", roomId);
    // nav-ը կանչվում ա useEffect #2-ով
  };

  const shareLink = useMemo(
    () => window.location.origin + `/lobby/${codeUC}`,
    [codeUC]
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
  };

  return (
    <div className="min-h-full flex flex-col items-center p-6 gap-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full text-center"
      >
        <p className="text-gray-500 text-sm">Room Code</p>
        <h2 className="text-4xl font-mono tracking-[0.4em] text-accent">
          {codeUC}
        </h2>
        <button
          onClick={copyLink}
          className="text-xs text-gray-400 hover:text-accent mt-2 underline"
        >
          Copy invite link
        </button>
      </motion.div>


      <div className="w-full bg-panel rounded-xl p-4 border border-white/10">
        <p className="text-sm text-gray-400 mb-3">
          Players ({players.length}/4)
        </p>
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {players.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between bg-black/30 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-xs uppercase ${ROLE_COLORS[p.role]}`}
                  >
                    {p.role}
                  </span>
                  <span>{p.profiles?.username ?? "Player"}</span>
                  {p.user_id === hostId && (
                    <span className="text-xs text-gray-500">(host)</span>
                  )}
                </div>
                <span
                  className={
                    p.ready
                      ? "text-green-400 text-sm"
                      : "text-gray-500 text-sm"
                  }
                >
                  {p.ready ? "Ready" : "Not ready"}
                </span>
              </motion.div>

              
            ))}
          </AnimatePresence>
          {players.length < 2 && (
            <p className="text-xs text-gray-500 text-center py-2">
              Waiting for at least 2 players...
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={toggleReady}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            me?.ready
              ? "bg-green-500/20 border border-green-500/40"
              : "bg-white/5 border border-white/10 hover:bg-white/10"
          }`}
        >
          {me?.ready ? "Ready ✓" : "Ready Up"}
        </button>
        {isHost && (
          <button
            disabled={!canStart}
            onClick={startGame}
            className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent/80 font-semibold transition disabled:opacity-40"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}