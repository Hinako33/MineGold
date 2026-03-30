import { BLOCK_LABELS, PLACEABLE_BLOCKS } from "../game/core/blocks";
import { useGameStore } from "../game/store/useGameStore";

export function GameHud() {
  const mined = useGameStore((state) => state.minedBlocks);
  const selected = useGameStore((state) => state.selectedBlockName);
  const locked = useGameStore((state) => state.pointerLocked);
  const inventory = useGameStore((state) => state.inventory);
  const hotbar = useGameStore((state) => state.selectedHotbarBlock);
  const actionText = useGameStore((state) => state.lastActionText);
  const miningProgress = useGameStore((state) => state.miningProgress);
  const loadedChunks = useGameStore((state) => state.loadedChunks);

  return (
    <div className="hud">
      <div className="hud__crosshair" />

      <div className="hud__top">
        <div className="hud__panel">
          <div className="hud__label">Inventory</div>
          <div className="hud__value">{mined} blocks mined</div>
        </div>

        <div className="hud__panel">
          <div className="hud__label">Target</div>
          <div className="hud__value">{selected ?? "Stone wall"}</div>
          <div className="hud__meter">
            <div className="hud__meter-fill" style={{ width: `${Math.round(miningProgress * 100)}%` }} />
          </div>
        </div>
        <div className="hud__panel">
          <div className="hud__label">Loaded Chunks</div>
          <div className="hud__value">{loadedChunks}</div>
        </div>
      </div>

      <div className="hud__bottom">
        <div className="hud__panel hud__tips">
          <div className="hud__label">Controls</div>
          <span>Click to lock cursor</span>
          <span>WASD move</span>
          <span>Mouse look</span>
          <span>Left click mine</span>
          <span>Right click place</span>
          <span>1-3 switch block</span>
        </div>

        <div className="hud__stack">
          <div className="hud__panel">
            <div className="hud__label">State</div>
            <div className="hud__status">
              {locked ? "In the tunnel" : "Click the scene to enter the mine"}
            </div>
          </div>

          <div className="hud__panel">
            <div className="hud__label">Feedback</div>
            <div className="hud__status hud__status--muted">{actionText}</div>
          </div>
        </div>
      </div>

      <div className="hotbar">
        {PLACEABLE_BLOCKS.map((block, index) => (
          <div
            key={block}
            className={`hotbar__slot${hotbar === block ? " hotbar__slot--active" : ""}`}
          >
            <div className="hotbar__key">{index + 1}</div>
            <div className="hotbar__name">{BLOCK_LABELS[block]}</div>
            <div className="hotbar__count">{inventory[block]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
