import * as THREE from "three";
import { AssetManager } from "./asset-manager";
import { Cell, getCellWorldPosition } from "./game-state";

/**
 * Player + Enemy:
 * - character models
 * - follow paths
 * - idle and walk animations
 *
 * Player:
 * - yellow character texture
 * - search animation
 * - pickup items
 *
 * Enemy:
 * - red character texture
 * - collides with player
 */
export abstract class Agent {
  model: THREE.Object3D;
  currentCell: Cell;

  protected mixer: THREE.AnimationMixer;
  protected animations = new Map<string, THREE.AnimationAction>();
  protected currentAction?: THREE.AnimationAction;

  private path?: Cell[];
  private targetCell?: Cell;

  constructor(protected assetManager: AssetManager, startingCell: Cell) {
    this.model = assetManager.models.get("dummy");

    // Animation
    this.mixer = new THREE.AnimationMixer(this.model);
    const idleClip = assetManager.animations.get("idle");
    const idleAction = this.mixer.clipAction(idleClip);
    this.animations.set("idle", idleAction);

    // Idle by default
    this.playAnimation("idle");

    // Position according to starting cell
    this.currentCell = startingCell;
    this.model.position.set(startingCell.col, 0, startingCell.row);
  }

  playAnimation(name: string) {
    const nextAction = this.animations.get(name);
    if (!nextAction) {
      return;
    }

    nextAction.reset();

    this.currentAction
      ? nextAction.crossFadeFrom(this.currentAction, 0.25, false).play()
      : nextAction.play();

    this.currentAction = nextAction;
  }

  setPath(path: Cell[]) {
    this.path = path;
    this.targetNextCell();
  }

  update(dt: number) {
    this.mixer.update(dt);

    this.followPath(dt);
  }

  private targetNextCell() {
    this.targetCell = this.path?.shift();
  }

  private followPath(dt: number) {
    if (!this.targetCell) {
      return;
    }

    // Move towards target cell
    const targetPos = getCellWorldPosition(this.targetCell);
    const targetDir = targetPos.sub(this.model.position).normalize();

    const moveStep = targetDir.multiplyScalar(dt * 2);
    this.model.position.add(moveStep);
  }
}

export class Player extends Agent {
  constructor(assetManager: AssetManager, startingCell: Cell) {
    super(assetManager, startingCell);

    // Assign player texture to model
    const texture = assetManager.textures.get("dummy");
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.map = texture;
      }
    });
  }
}
