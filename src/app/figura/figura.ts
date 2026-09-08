import { Component, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StageComponent, CoreShapeComponent } from 'ng2-konva';
import { mat2d, vec2 } from 'gl-matrix';

const CANVAS_WIDTH = 1100;
const CANVAS_HEIGHT = 780;
const CENTER: vec2 = [CANVAS_WIDTH / 2, 260];

// Edge length and isometric projection offsets (30° cube).
const EDGE = 60;
const EX = EDGE * Math.cos(Math.PI / 6);
const EY = EDGE * Math.sin(Math.PI / 6);

// Vertices of an isometric cube in local (object) space, centered on the canvas.
// C is the front corner where all three visible faces meet.
const C: vec2 = [CENTER[0], CENTER[1]];
const L: vec2 = [CENTER[0] - EX, CENTER[1] - EY];
const R: vec2 = [CENTER[0] + EX, CENTER[1] - EY];
const T: vec2 = [CENTER[0], CENTER[1] - 2 * EY];
const B: vec2 = [CENTER[0], CENTER[1] + EDGE];
const LB: vec2 = [CENTER[0] - EX, CENTER[1] - EY + EDGE];
const RB: vec2 = [CENTER[0] + EX, CENTER[1] - EY + EDGE];

const TOP_FACE: vec2[] = [C, R, T, L];
const LEFT_FACE: vec2[] = [B, C, L, LB];
const RIGHT_FACE: vec2[] = [B, C, R, RB];

// Pixel-art silhouette of the Chrome "no internet" dinosaur, drawn as a grid
// of blocks ('#' = filled) so it matches the game's blocky look. Sized to
// roughly match the cube's own bounding box, and placed below it. The tail
// is the wedge added on the left (cols 0-4) at rows 5-9, tapering to a point
// and merging into the body's back at row 9.
const DINO_GRID: readonly string[] = [
  '..................######',
  '.................#####.##',
  '.................########',
  '.................#####...',
  '#................########',
  '#...............#####....',
  '##...........########....',
  '###........##########....',
  '#####....###############',
  '.###################..##',
  '..##################....',
  '.....##############......',
  '.......#####.######......',
  '........###...###........',
  '........###...###........',
  '........###...###........',
  '........###...###........',
  '........####..####.......',
  '........####..####.......',
];
const DINO_EYE = { row: 1, col: 22 };
const DINO_ARM = { row: 8, col: 19 };
const DINO_CELL = 6;
const DINO_WIDTH = DINO_GRID[0].length * DINO_CELL;
const DINO_HEIGHT = DINO_GRID.length * DINO_CELL;
const DINO_X = CENTER[0] - DINO_WIDTH / 2;
const DINO_Y = CANVAS_HEIGHT - DINO_HEIGHT - 60;

interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

function buildDinoBody(): PixelRect[] {
  const rects: PixelRect[] = [];
  DINO_GRID.forEach((rowStr, row) => {
    for (let col = 0; col < rowStr.length; col++) {
      if (rowStr[col] !== '#') continue;
      rects.push({
        x: DINO_X + col * DINO_CELL,
        y: DINO_Y + row * DINO_CELL,
        width: DINO_CELL,
        height: DINO_CELL,
        fill: '#535353',
      });
    }
  });
  return rects;
}

const DINO_BODY: PixelRect[] = buildDinoBody();
const DINO_EYE_RECT: PixelRect = {
  x: DINO_X + DINO_EYE.col * DINO_CELL,
  y: DINO_Y + DINO_EYE.row * DINO_CELL,
  width: DINO_CELL,
  height: DINO_CELL,
  fill: '#f7f8fa',
};
// Tiny forearm hanging from the chest, below the neck.
const DINO_ARM_RECT: PixelRect = {
  x: DINO_X + DINO_ARM.col * DINO_CELL,
  y: DINO_Y + DINO_ARM.row * DINO_CELL,
  width: DINO_CELL,
  height: 2 * DINO_CELL,
  fill: '#535353',
};

/** Lightens (positive percent) or darkens (negative percent) a #rrggbb color. */
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

/** Applies the transformation matrix to a face's local points and flattens them for Konva. */
function toKonvaPoints(points: vec2[], matrix: mat2d): number[] {
  const out: number[] = [];
  const transformed = vec2.create();
  for (const point of points) {
    vec2.transformMat2d(transformed, point, matrix);
    out.push(transformed[0], transformed[1]);
  }
  return out;
}

/**
 * Draws an isometric 3D cube on a Konva canvas. Position and color are inputs
 * so the controls/transformation logic built by the rest of the team can drive
 * this figure from the outside (e.g. <app-figura [x]="posX" [color]="tinte" />).
 */
@Component({
  selector: 'app-figura',
  imports: [StageComponent, CoreShapeComponent],
  templateUrl: './figura.html',
  styleUrl: './figura.css',
})
export class Figura {
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly stageConfig = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

  protected readonly dinoBody = DINO_BODY;
  protected readonly dinoEye = DINO_EYE_RECT;
  protected readonly dinoArm = DINO_ARM_RECT;

  readonly x = input(0);
  readonly y = input(0);
  readonly color = input('#2f6fed');

  private readonly matrix = computed<mat2d>(() => {
    const m = mat2d.create();
    mat2d.fromTranslation(m, [this.x(), this.y()]);
    return m;
  });

  private readonly topColor = computed(() => shade(this.color(), 35));
  private readonly leftColor = computed(() => shade(this.color(), 0));
  private readonly rightColor = computed(() => shade(this.color(), -35));

  protected readonly topConfig = computed(() => ({
    points: toKonvaPoints(TOP_FACE, this.matrix()),
    closed: true,
    fill: this.topColor(),
    stroke: '#1c1c1c',
    strokeWidth: 1.5,
  }));

  protected readonly leftConfig = computed(() => ({
    points: toKonvaPoints(LEFT_FACE, this.matrix()),
    closed: true,
    fill: this.leftColor(),
    stroke: '#1c1c1c',
    strokeWidth: 1.5,
  }));

  protected readonly rightConfig = computed(() => ({
    points: toKonvaPoints(RIGHT_FACE, this.matrix()),
    closed: true,
    fill: this.rightColor(),
    stroke: '#1c1c1c',
    strokeWidth: 1.5,
  }));
}
