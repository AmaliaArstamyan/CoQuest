import { motion, AnimatePresence } from "framer-motion";
import { useVoice } from "@/stores/voiceStore";
import { cn } from "@/lib/utils";

export default function VoicePanel() {
  const { connected, connecting, muted, participants, toggleMute, error } =
    useVoice();

  if (error) {
    return (
      <div className="text-xs text-danger text-center p-2">
        Voice error: {error}
      </div>
    );
  }

  return (
    <div className="w-full bg-panel border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
      {/* Left: participant dots */}
      <div className="flex items-center gap-2">
        <AnimatePresence>
          {participants.map((p) => (
            <motion.div
              key={p.identity}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative flex items-center gap-1.5"
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  p.speaking
                    ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] scale-125"
                    : "bg-gray-600"
                )}
              />
              <span className="text-xs text-gray-400 hidden sm:inline">
                {p.name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Right: mute toggle */}
      <button
        onClick={toggleMute}
        disabled={!connected}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium transition",
          !connected
            ? "bg-white/5 text-gray-500"
            : muted
            ? "bg-red-500/20 border border-red-500/40 text-red-400"
            : "bg-green-500/20 border border-green-500/40 text-green-400"
        )}
      >
        {connecting
          ? "Connecting…"
          : !connected
          ? "Voice off"
          : muted
          ? "🔇 Muted"
          : "🎙️ Live"}
      </button>
    </div>
  );
}