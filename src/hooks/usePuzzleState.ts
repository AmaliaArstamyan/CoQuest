import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function usePuzzleState<T>(roomId: string | null, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    let active = true;

    (async () => {
      const { data } = await supabase
        .from("puzzle_state")
        .select("state")
        .eq("room_id", roomId)
        .single();

      if (!active) return;

      // If DB is empty or has {} → seed with initial
      if (data?.state && Object.keys(data.state).length > 0) {
        setState(data.state as T);
      } else {
        await supabase
          .from("puzzle_state")
          .upsert({ room_id: roomId, state: initial as any });
        setState(initial);
      }
      setReady(true);
    })();

    const channel = supabase
      .channel(`puzzle:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "puzzle_state",
          filter: `room_id=eq.${roomId}`,
        },
        (p) => setState((p.new as any).state as T)
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const update = useCallback(
    async (next: T) => {
      if (!roomId) return;
      setState(next); // optimistic update
      await supabase
        .from("puzzle_state")
        .update({
          state: next as any,
          updated_at: new Date().toISOString(),
        })
        .eq("room_id", roomId);
    },
    [roomId]
  );

  return { state, update, ready };
}