import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/stores/authStore";
import MainMenu from "@/pages/MainMenu";
import Lobby from "@/pages/Lobby";
import GameRoom from "@/pages/GameRoom";

export default function App() {
  const { user, loading, init } = useAuth();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) return <Splash />;

  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route
        path="/lobby/:code"
        element={user ? <Lobby /> : <Navigate to="/" />}
      />
      <Route
        path="/room/:code"
        element={user ? <GameRoom /> : <Navigate to="/" />}
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function Splash() {
  return (
    <div className="flex h-full items-center justify-center text-accent text-2xl animate-pulse">
      CoQuest
    </div>
  );
}