import * as THREE from "three";
import { Cell, cellsAreEqual, Grid } from "./game-state";

interface PathNode extends Cell {
  parent?: PathNode;
  costFromStart: number;
  costToEnd: number;
  costTotal: number;
}

/**
 * Will expand upon the Cell interface with search-specific data.
 * Will need to know how to get the neighbours of a given cell.
 * Will need to calculate the cost values of a given cell.
 */
export class AStar {
  getPath(grid: Grid, fromCell: Cell, toCell: Cell) {
    // Create PathNodes from the given cells
    const start: PathNode = {
      ...fromCell,
      costFromStart: 0,
      costToEnd: 0,
      costTotal: 0,
    };
    const end: PathNode = {
      ...toCell,
      costFromStart: 0,
      costToEnd: 0,
      costTotal: 0,
    };

    const openList: PathNode[] = []; // cells yet to be explored
    const closedList: PathNode[] = []; // cells already explored

    // Being by exploring the start cell
    openList.push(start);

    // Continue so long as there are cells to explore
    while (openList.length) {
      // Get the cheapest node in the open list to check next
      openList.sort((a, b) => a.costTotal - b.costTotal);

      const current = openList[0];

      // Check: is this the end? return if so
      if (cellsAreEqual(current, end)) {
        // Backtrack the closed list
        let curNode = current;
        const route: PathNode[] = [];

        while (curNode.parent) {
          route.push(curNode);
          curNode = curNode.parent;
        }

        route.reverse();

        return route as Cell[];
      }

      // move this node from open to closed list
      openList.splice(0, 1);
      closedList.push(current);

      // for each neighbour of this node:
      for (const neighbour of this.getNeighbours(grid, current)) {
        // ignore obstacles and already-explored nodes
        if (
          neighbour.obstacle ||
          closedList.some((node) => cellsAreEqual(node, neighbour))
        ) {
          continue;
        }

        // calculate costs and set parent
        this.calculateCosts(neighbour, current, end);
        neighbour.parent = current;

        // if already considering this node at a cheaper cost, skip it
        const openNode = openList.find((node) =>
          cellsAreEqual(node, neighbour)
        );
        if (openNode && openNode.costFromStart < neighbour.costFromStart) {
          continue;
        }

        // add the node to the open list
        openList.push(neighbour);
      }
    }

    // No route was found
    return undefined;
  }

  getNeighbours(grid: Grid, cell: Cell): PathNode[] {
    const row = cell.row;
    const col = cell.col;

    let above, below, left, right;

    if (row > 0) {
      above = grid[row - 1][col];
    }
    if (row < grid.length - 1) {
      below = grid[row + 1][col];
    }

    if (col > 0) {
      left = grid[row][col - 1];
    }
    if (col < grid[0].length - 1) {
      right = grid[row][col + 1];
    }

    const existingNeighbours = [above, below, left, right].filter(
      (cell) => cell !== undefined
    );

    return existingNeighbours.map((cell) => ({
      ...cell,
      costFromStart: 0,
      costToEnd: 0,
      costTotal: 0,
    }));
  }

  calculateCosts(neighbour: PathNode, current: PathNode, end: PathNode) {
    neighbour.costFromStart = current.costFromStart + 1;
    neighbour.costToEnd = new THREE.Vector2(end.row, end.col).distanceToSquared(
      new THREE.Vector3(neighbour.row, neighbour.col)
    );
    neighbour.costTotal = neighbour.costFromStart + neighbour.costToEnd;
  }
}
