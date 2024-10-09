import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { AssetManager } from "./asset-manager";
import { Player } from "./agent";
import { AStar } from "./astar";

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
  private greenMaterial: THREE.MeshLambertMaterial;

  private pointer = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();

  private gridSize = 10;
  private grid: Grid;
  private gridGroup = new THREE.Group();

  private player: Player;
  private moveGraphic: THREE.Object3D;
  private moveGraphicCell?: Cell;

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
      map: assetManager.textures.get("floor-black"),
    });
    this.orangeMaterial = new THREE.MeshLambertMaterial({
      map: assetManager.textures.get("obstacle-orange"),
    });
    this.greenMaterial = new THREE.MeshLambertMaterial({
      map: assetManager.textures.get("floor-green"),
    });

    // Move graphic
    this.moveGraphic = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.8),
      new THREE.MeshStandardMaterial({
        map: assetManager.textures.get("panel"),
        transparent: true,
      })
    );
    this.moveGraphic.rotateX(-Math.PI / 2);
    this.moveGraphic.position.y = 0.01;
    this.moveGraphic.visible = false;
    this.scene.add(this.moveGraphic);

    // Grid
    this.scene.add(this.gridGroup);
    this.grid = this.buildGrid(this.gridSize);
    this.displayGrid(this.grid);

    // Listeners
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);

    // Player
    const firstCell = getRandomEdgeCell(this.grid, this.gridSize);
    this.player = new Player(assetManager, firstCell);
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

        // Assign a reference to the Cell object to it for later
        object.userData.cell = cell;

        this.gridGroup.add(object);
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

  private onMouseMove = (event: MouseEvent) => {
    // Setup raycaster
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Intersect against items in the grid group only
    const intersections = this.raycaster.intersectObjects(
      this.gridGroup.children,
      true
    );
    if (!intersections.length) {
      this.moveGraphic.visible = false;
      this.moveGraphicCell = undefined;
      return;
    }

    // Take closest thing hit
    const intersection = intersections[0];

    // Does this have any cell data?
    const cell = intersection.object.userData.cell;

    // We ignore obstacles and the player's current cell
    if (cell.obstacle || cellsAreEqual(cell, this.player.currentCell)) {
      this.moveGraphic.visible = false;
      this.moveGraphicCell = undefined;
      return;
    }

    // This is a valid destination - show the graphic
    this.moveGraphic.position.x = cell.col;
    this.moveGraphic.position.z = cell.row;
    this.moveGraphic.visible = true;

    this.moveGraphicCell = cell;
  };

  private onMouseDown = () => {
    // Instead of re-doing the intersection stuff, save the move graphic's cell in onMouseMove
    if (!this.moveGraphicCell) {
      return;
    }

    // Find a path to it
    const toCell = this.moveGraphicCell;

    const aStar = new AStar();
    const path = aStar.getPath(this.grid, this.player.currentCell, toCell);
    if (path) {
      // this.player.setPath(path);
      this.displayPath(path);
    }
  };

  private onCanvasResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera.aspect = window.innerWidth / window.innerHeight;

    this.camera.updateProjectionMatrix();
  };

  private displayPath(path: Cell[]) {
    // Turn all these cells green
    this.gridGroup.children.forEach((object) => {
      // Does this cell exist on the path?
      const onPath = path.some((cell) =>
        cellsAreEqual(cell, object.userData.cell)
      );
      if (onPath) {
        (object as THREE.Mesh).material = this.greenMaterial;
      }
    });
  }
}

export function cellsAreEqual(a: Cell, b: Cell) {
  return a.row === b.row && a.col === b.col;
}

function getRandomEdgeCell(grid: Grid, size: number) {
  // Pull out all the edge cells into an array
  const edgeCells: Cell[] = [];

  // Get first and last row and column
  edgeCells.push(...grid[0]);
  edgeCells.push(...grid[size - 1]);

  // Go through other rows between top and bot
  for (let row = 1; row < size - 1; row++) {
    edgeCells.push(grid[row][0], grid[row][size - 1]);
  }

  // Filter out obstacles
  const validEdgeCells = edgeCells.filter((cell) => !cell.obstacle);

  // Pick a random one
  const rnd = Math.floor(Math.random() * validEdgeCells.length);

  return validEdgeCells[rnd];
}

export function getCellWorldPosition(cell: Cell) {
  return new THREE.Vector3(cell.row, 0, cell.col);
}
