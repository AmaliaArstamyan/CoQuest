import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type Player = {
  id: string;
  user_id: string;
  role: "alpha" | "beta" | "gamma" | "delta";
  ready: boolean;
  profiles?: { username: string } | null;
};

type RoomState = {
  roomId: string | null;
  code: string | null;
  hostId: string | null;
  status: string;
  players: Player[];
  myRole: string | null;
  _channel: RealtimeChannel | null;
  setRoom: (r: Partial<RoomState>) => void;
  subscribe: (roomId: string) => () => void;
};

export const useRoom = create<RoomState>((set, get) => ({
  roomId: null,
  code: null,
  hostId: null,
  status: "lobby",
  players: [],
  myRole: null,
  _channel: null,

  setRoom: (r) => set(r),

  subscribe: (roomId) => {
    // Guard: if already subscribed to this room, do nothing
    const existing = get()._channel;
    if (existing && get().roomId === roomId) {
      return () => {};
    }

    // Clean up any previous channel
    if (existing) {
      supabase.removeChannel(existing);
      set({ _channel: null });
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*, profiles(username)")
        .eq("room_id", roomId);

      if (error) {
        console.error("Failed to load players:", error);
        return;
      }
      if (data) set({ players: data as Player[] });

      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (room) {
        set({
          roomId: room.id,
          code: room.code,
          hostId: room.host_id,
          status: room.status,
        });
      }
    };

    load();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (p) => set({ status: (p.new as any).status })
      )
      .subscribe();

    set({ _channel: channel });

    return () => {
      supabase.removeChannel(channel);
      set({ _channel: null });
    };
  },
}));