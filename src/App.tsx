import { GameHud } from "./components/GameHud";
import { GameScene } from "./components/GameScene";

export default function App() {
  return (
    <main className="app-shell">
      <GameScene />
      <GameHud />
    </main>
  );
}
