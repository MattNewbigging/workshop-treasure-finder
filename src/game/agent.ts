import * as THREE from "three";
import { AssetManager } from "./asset-manager";

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

  protected mixer: THREE.AnimationMixer;
  protected animations = new Map<string, THREE.AnimationAction>();
  protected currentAction?: THREE.AnimationAction;

  constructor(protected assetManager: AssetManager) {
    this.model = assetManager.models.get("dummy");

    this.mixer = new THREE.AnimationMixer(this.model);

    const idleClip = assetManager.animations.get("idle");
    const idleAction = this.mixer.clipAction(idleClip);
    this.animations.set("idle", idleAction);

    // Idle by default
    this.playAnimation("idle");
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

  update(dt: number) {
    this.mixer.update(dt);
  }
}

export class Player extends Agent {
  constructor(assetManager: AssetManager) {
    super(assetManager);

    // Assign player texture to model
    const texture = assetManager.textures.get("dummy");
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.map = texture;
      }
    });
  }
}
