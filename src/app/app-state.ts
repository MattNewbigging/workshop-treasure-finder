import { action, makeAutoObservable, observable } from "mobx";
import { AssetManager } from "../game/asset-manager";
import { GameState } from "../game/game-state";

export class AppState {
  @observable loaded = false;
  @observable started = false;

  gameState?: GameState;

  private assetManager = new AssetManager();

  constructor() {
    makeAutoObservable(this);

    // Give UI time to mount
    setTimeout(() => this.loadGame(), 10);
  }

  @action startGame = () => {
    this.gameState = new GameState(this.assetManager);
    this.started = true;
  };

  @action private async loadGame() {
    await this.assetManager.load();
    this.loaded = true;
  }
}
