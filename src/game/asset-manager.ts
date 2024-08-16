import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

export class AssetManager {
  models = new Map();
  textures = new Map();
  animations = new Map();

  private loadingManager = new THREE.LoadingManager();

  load(): Promise<void> {
    // Be made aware of any loading errors
    this.loadingManager.onError = (e) => console.error(e);

    // Create loaders, passing them the loading manager
    const fbxLoader = new FBXLoader(this.loadingManager);
    const textureLoader = new THREE.TextureLoader(this.loadingManager);

    // Load stuff
    this.loadModels(fbxLoader);
    this.loadTextures(textureLoader);
    this.loadAnimations(fbxLoader);

    return new Promise((resolve) => {
      this.loadingManager.onLoad = () => {
        resolve();
      };
    });
  }

  private loadModels(loader: FBXLoader) {
    const dummyUrl = new URL(
      "/models/SK_Character_Dummy_Male_01.fbx",
      import.meta.url
    ).href;
    loader.load(dummyUrl, (group: THREE.Group) => {
      group.scale.multiplyScalar(0.01);
      this.models.set("dummy", group);
    });
  }

  private loadTextures(loader: THREE.TextureLoader) {
    // dummy texture
    const dummy = new URL(
      "/textures/PolygonPrototype_Texture_01.png",
      import.meta.url
    ).href;
    loader.load(dummy, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set("dummy", texture);
    });

    const floorBlack = new URL(
      "/textures/texture_01_black.png",
      import.meta.url
    ).href;
    loader.load(floorBlack, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set("floor-black", texture);
    });

    const obstacleOrange = new URL(
      "/textures/texture_03_orange.png",
      import.meta.url
    ).href;
    loader.load(obstacleOrange, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set("obstacle-orange", texture);
    });

    const floorGreen = new URL(
      "/textures/texture_02_green.png",
      import.meta.url
    ).href;
    loader.load(floorGreen, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set("floor-green", texture);
    });

    const floorRed = new URL("/textures/texture_02_red.png", import.meta.url)
      .href;
    loader.load(floorRed, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set("floor-red", texture);
    });

    const panelUrl = new URL(
      "/textures/panel-transparent-center-000.png",
      import.meta.url
    ).href;
    loader.load(panelUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set("panel", texture);
    });
  }

  private loadAnimations(loader: FBXLoader) {
    const idleUrl = new URL("/anims/idle.fbx", import.meta.url).href;
    loader.load(idleUrl, (group) => {
      const clip = group.animations[0];
      clip.name = "idle";
      this.animations.set(clip.name, clip);
    });

    const walkUrl = new URL("/anims/walking.fbx", import.meta.url).href;
    loader.load(walkUrl, (group) => {
      const clip = group.animations[0];
      clip.name = "walk";
      this.animations.set(clip.name, clip);
    });
  }
}
