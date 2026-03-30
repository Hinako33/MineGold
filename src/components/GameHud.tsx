import { useGameStore } from "../game/store/useGameStore";

export function GameHud() {
  const locked = useGameStore((state) => state.pointerLocked);
  const actionText = useGameStore((state) => state.lastActionText);
  const objectiveText = useGameStore((state) => state.objectiveText);
  const collectedMemories = useGameStore((state) => state.collectedMemories);
  const totalMemories = useGameStore((state) => state.totalMemories);
  const fearLevel = useGameStore((state) => state.fearLevel);
  const gameState = useGameStore((state) => state.gameState);

  const statusText =
    gameState === "escaped"
      ? "You made it out."
      : gameState === "caught"
        ? "It reached you in the dark."
        : locked
          ? "Keep moving. Standing still helps it listen."
          : "Click the scene to descend.";

  return (
    <div className="hud">
      <div className="hud__crosshair" />

      <div className="hud__top">
        <div className="hud__panel">
          <div className="hud__label">Recovered</div>
          <div className="hud__value">
            {collectedMemories}/{totalMemories} memories
          </div>
        </div>

        <div className="hud__panel">
          <div className="hud__label">Dread</div>
          <div className="hud__value">{Math.round(fearLevel)}%</div>
          <div className="hud__meter">
            <div className="hud__meter-fill hud__meter-fill--danger" style={{ width: `${fearLevel}%` }} />
          </div>
        </div>

        <div className="hud__panel">
          <div className="hud__label">Objective</div>
          <div className="hud__value hud__value--compact">{objectiveText}</div>
        </div>
      </div>

      <div className="hud__bottom">
        <div className="hud__panel hud__tips">
          <div className="hud__label">Controls</div>
          <span>Click to enter</span>
          <span>WASD move</span>
          <span>Mouse look</span>
          <span>Hold left click to break weak walls</span>
          <span>Walk through pale lights to recover memories</span>
        </div>

        <div className="hud__stack">
          <div className="hud__panel">
            <div className="hud__label">State</div>
            <div className="hud__status">{statusText}</div>
          </div>

          <div className="hud__panel">
            <div className="hud__label">Whisper</div>
            <div className="hud__status hud__status--muted">{actionText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
