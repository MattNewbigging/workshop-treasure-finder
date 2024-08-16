import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { AssetManager } from "./asset-manager";
import { Player } from "./agent";

export interface Cell {
  row: number;
  col: number;
  obstacle: boolean;
}

export type Grid = Cell[][];

export class GameState {
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private orbitControls: OrbitControls;

  private blackMaterial: THREE.MeshLambertMaterial;
  private orangeMaterial: THREE.MeshLambertMaterial;

  private gridSize = 10;
  private grid: Grid;

  private player: Player;

  constructor(private assetManager: AssetManager) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const canvas = this.renderer.domElement;
    document.body.appendChild(canvas);

    this.onCanvasResize();
    window.addEventListener("resize", this.onCanvasResize);

    // Camera
    this.camera.fov = 75;
    this.camera.far = 500;
    this.camera.position.set(this.gridSize, 10, this.gridSize); // corner of grid

    // Controls
    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.enablePan = false;
    this.orbitControls.target.set(this.gridSize / 2, 0, this.gridSize / 2);

    // Lights
    this.setupLights();

    this.scene.background = new THREE.Color("#1680AF");

    // Materials
    this.blackMaterial = new THREE.MeshLambertMaterial({
      map: this.assetManager.textures.get("floor-black"),
    });
    this.orangeMaterial = new THREE.MeshLambertMaterial({
      map: this.assetManager.textures.get("obstacle-orange"),
    });

    // Grid
    this.grid = this.buildGrid(this.gridSize);
    this.displayGrid(this.grid);

    // Player
    this.player = new Player(assetManager);
    this.scene.add(this.player.model);

    // Start
    this.update();
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, Math.PI);
    this.scene.add(ambient);

    const direct = new THREE.DirectionalLight(0xffffff, Math.PI);
    // Light dir is the vector between direct.position and origin
    direct.position.set(1, 1, 1);
    this.scene.add(direct);
  }

  private buildGrid(size: number) {
    const grid: Grid = [];

    for (let row = 0; row < size; row++) {
      // Create array for the row
      grid[row] = [];
      for (let col = 0; col < size; col++) {
        // Each cell has a 20% chance of being an obstacle
        const obstacle = Math.random() >= 0.8;
        // Create cell, push into row
        grid[row][col] = { row, col, obstacle };
      }
    }

    return grid;
  }

  private displayGrid(grid: Grid) {
    grid.forEach((row) =>
      row.forEach((cell) => {
        // Create a 3d object to represent this cell
        const object = cell.obstacle
          ? this.createObstacleCell(cell.row, cell.col)
          : this.createFloorCell(cell.row, cell.col);

        this.scene.add(object);
      })
    );
  }

  private createFloorCell(row: number, col: number) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(), this.blackMaterial);

    object.position.set(col, -0.5, row);

    return object;
  }

  private createObstacleCell(row: number, col: number) {
    const object = new THREE.Mesh(
      new THREE.BoxGeometry(1, 3, 1),
      this.orangeMaterial
    );

    object.position.set(col, 0.5, row);

    return object;
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    this.orbitControls.update(dt);

    this.player.update(dt);

    this.renderer.render(this.scene, this.camera);
  };

  private onCanvasResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera.aspect = window.innerWidth / window.innerHeight;

    this.camera.updateProjectionMatrix();
  };
}
