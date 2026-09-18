import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/stores/authStore";
import { useRoom } from "@/stores/roomStore";
import { usePuzzleState } from "@/hooks/usePuzzleState";
import {
  initSignal,
  checkSignal,
  type SignalState,
} from "@/game/puzzles/signal";
import VoicePanel from "@/components/VoicePanel";
import { useVoice } from "@/stores/voiceStore";

export default function GameRoom() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { players, subscribe, setRoom } = useRoom();
  const [roomId, setRoomId] = useState<string | null>(null);

  // Resolve room from code
  // Resolve room from code
  useEffect(() => {
    (async () => {
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code!.toUpperCase())
        .single();
      if (!room) {
        nav("/");
        return;
      }
      setRoom({
        roomId: room.id,
        code: room.code,
        hostId: room.host_id,
        status: room.status,
      });
      setRoomId(room.id);
      subscribe(room.id);
    })();
  }, [code, nav, setRoom, subscribe]);

    // 🎙️ Voice — միանում ա GameRoom-ում
  useEffect(() => {
    if (!roomId || !user) return;

    const voice = useVoice.getState();
    if (voice.connected || voice.connecting) {
      console.log("🎙️ Voice already connected, skipping");
      return;
    }

    const username = (user.user_metadata as any)?.username ?? "Player";
    console.log("🎙️ Connecting voice to room:", code);

    voice
      .connect(code!.toUpperCase(), user.id, username)
      .then(() => console.log("✅ Voice connect success"))
      .catch((err) => console.error("❌ Voice connect error:", err));
  }, [roomId, user, code]);

  const { state, update, ready } = usePuzzleState<SignalState>(
    roomId,
    initSignal()
  );
  const me = players.find((p) => p.user_id === user?.id);
  const role = me?.role ?? "alpha";

  // Auto-detect win
  useEffect(() => {
    if (ready && !state.solved && checkSignal(state)) {
      update({ ...state, solved: true });
    }
  }, [state, ready, update]);

  if (!ready || !role) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Loading puzzle…
      </div>
    );
  }

  const turnDial = (i: 0 | 1 | 2, delta: number) => {
    if (state.solved) return;
    const next = [...state.dials] as [number, number, number];
    next[i] = (next[i] + delta + 10) % 10;
    update({ ...state, dials: next });
  };

  return (
    <div className="min-h-full flex flex-col p-4 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase">Chapter 1</p>
          <h1 className="text-xl font-semibold">The Signal</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">You are</p>
          <p
            className={`font-mono uppercase ${
              role === "alpha" ? "text-accent" : "text-accent2"
            }`}
          >
            {role}
          </p>
        </div>
      </header>

          <AnimatePresence mode="wait">
        {state.solved ? (
          <SolvedView key="solved" />
        ) : role === "alpha" ? (
          <AlphaView key="alpha" dials={state.dials} onTurn={turnDial} />
        ) : (
          <BetaView key="beta" target={state.target} />
        )}
      </AnimatePresence>

      <div className="mt-6">
        <VoicePanel />
      </div>

      <footer className="mt-3 text-xs text-gray-500 text-center">
        Talk to your partner. Share what you see.
      </footer>
    </div>
  );
}

/* ---------- Role views ---------- */

function AlphaView({
  dials,
  onTurn,
}: {
  dials: [number, number, number];
  onTurn: (i: 0 | 1 | 2, d: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-panel border border-white/10 rounded-2xl p-6 flex flex-col gap-6"
    >
      <div>
        <p className="text-sm text-gray-400">Control Panel</p>
        <p className="text-xs text-gray-500 mt-1">
          Your partner can see the target code. Ask them for it.
        </p>
      </div>

      <div className="flex justify-around gap-4">
        {dials.map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <button
              onClick={() => onTurn(i as 0 | 1 | 2, +1)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-lg"
            >
              ▲
            </button>
            <div className="w-20 h-24 rounded-lg bg-black/50 border border-accent/40 flex items-center justify-center text-4xl font-mono text-accent">
              {v}
            </div>
            <button
              onClick={() => onTurn(i as 0 | 1 | 2, -1)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-lg"
            >
              ▼
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function BetaView({ target }: { target: [number, number, number] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-panel border border-accent2/30 rounded-2xl p-6 flex flex-col gap-6"
    >
      <div>
        <p className="text-sm text-accent2">Readout Screen</p>
        <p className="text-xs text-gray-500 mt-1">
          Read the code to your partner. They control the dials.
        </p>
      </div>

      <div className="flex justify-around gap-4">
        {target.map((v, i) => (
          <div
            key={i}
            className="w-20 h-24 rounded-lg bg-black/60 border border-accent2/40 flex items-center justify-center text-4xl font-mono text-accent2 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
          >
            {v}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SolvedView() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="bg-panel border border-green-500/40 rounded-2xl p-8 text-center"
    >
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-green-400">Signal Restored</h2>
      <p className="text-gray-400 mt-2 text-sm">
        The station hums back to life. But something is still wrong…
      </p>
      <p className="text-xs text-gray-500 mt-6 italic">
        Chapter 2 coming soon.
      </p>
    </motion.div>
  );
}