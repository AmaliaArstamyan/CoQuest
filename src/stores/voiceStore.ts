import { create } from "zustand";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
} from "livekit-client";
import { fetchLiveKitToken } from "@/lib/livekit";

type VoiceState = {
  room: Room | null;
  connected: boolean;
  muted: boolean;
  connecting: boolean;
  participants: { identity: string; name: string; speaking: boolean }[];
  error: string | null;

  connect: (roomName: string, identity: string, name: string) => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
};

export const useVoice = create<VoiceState>((set, get) => ({
  room: null,
  connected: false,
  muted: false,
  connecting: false,
  participants: [],
  error: null,

  connect: async (roomName, identity, name) => {
    if (get().connected || get().connecting) return;

    set({ connecting: true, error: null });

    try {
      const token = await fetchLiveKitToken(roomName, identity, name);
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Event listeners
      room
        .on(RoomEvent.Connected, () => {
          console.log("🎙️ Voice connected to", roomName);
          set({ connected: true, connecting: false });
          refreshParticipants(room, set);
        })
        .on(RoomEvent.Disconnected, () => {
          console.log("🔌 Voice disconnected");
          set({ connected: false, room: null });
        })
        .on(RoomEvent.ParticipantConnected, () => refreshParticipants(room, set))
        .on(RoomEvent.ParticipantDisconnected, () =>
          refreshParticipants(room, set)
        )
        .on(RoomEvent.ActiveSpeakersChanged, () => refreshParticipants(room, set))
        .on(RoomEvent.TrackMuted, () => refreshParticipants(room, set))
        .on(RoomEvent.TrackUnmuted, () => refreshParticipants(room, set));

      await room.connect(import.meta.env.VITE_LIVEKIT_URL, token);

      // Միացնում ենք միկրոֆոնը
      await room.localParticipant.setMicrophoneEnabled(true);

      set({ room, connected: true, connecting: false, muted: false });
    } catch (err) {
      console.error("❌ LiveKit connect error:", err);
      set({
        connecting: false,
        error: (err as Error).message,
      });
    }
  },

  disconnect: async () => {
    const { room } = get();
    if (room) {
      await room.disconnect();
    }
    set({
      room: null,
      connected: false,
      muted: false,
      participants: [],
    });
  },

  toggleMute: async () => {
    const { room, muted } = get();
    if (!room) return;

    await room.localParticipant.setMicrophoneEnabled(muted);
    set({ muted: !muted });
  },
}));

/* ---------- helpers ---------- */

function refreshParticipants(
  room: Room,
  set: (s: Partial<VoiceState>) => void
) {
  const local: LocalParticipant = room.localParticipant;
  const remotes: RemoteParticipant[] = Array.from(
    room.remoteParticipants.values()
  );

  const activeSpeakers = new Set(
    room.activeSpeakers.map((p) => p.identity)
  );

  const list = [
    {
      identity: local.identity,
      name: local.name ?? local.identity,
      speaking: activeSpeakers.has(local.identity),
    },
    ...remotes.map((p) => ({
      identity: p.identity,
      name: p.name ?? p.identity,
      speaking: activeSpeakers.has(p.identity),
    })),
  ];

  set({ participants: list });
}