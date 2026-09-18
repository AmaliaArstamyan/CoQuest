import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  signInAnon: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signInAnon: async (username) => {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { username } },
    });
    if (error) throw error;

    if (data.user) {
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, username });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));