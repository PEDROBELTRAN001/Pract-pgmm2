import { Component, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StageComponent, CoreShapeComponent } from 'ng2-konva';
import { mat2d, vec2 } from 'gl-matrix';

const CANVAS_WIDTH = 1100;
const CANVAS_HEIGHT = 780;
const CENTER: vec2 = [CANVAS_WIDTH / 2, 260];

const EDGE = 60;
const EX = EDGE * Math.cos(Math.PI / 6);
const EY = EDGE * Math.sin(Math.PI / 6);

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

function toKonvaPoints(points: vec2[], matrix: mat2d): number[] {
  const out: number[] = [];
  const transformed = vec2.create();
  for (const point of points) {
    vec2.transformMat2d(transformed, point, matrix);
    out.push(transformed[0], transformed[1]);
  }
  return out;
}

@Component({
  selector: 'app-figura',
  standalone: true,
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
  readonly rotacion = input(0);
  readonly escala = input(1);
  readonly espejoX = input(false);
  readonly espejoY = input(false);
  readonly color = input('#2f6fed');

  // Matriz Principal
  private readonly matrix = computed<mat2d>(() => {
    const m = mat2d.create();
    mat2d.translate(m, m, [CENTER[0] + this.x(), CENTER[1] + this.y()]);
    
    // Escala con reflexión
    const sx = this.escala() * (this.espejoX() ? -1 : 1);
    const sy = this.escala() * (this.espejoY() ? -1 : 1);
    mat2d.scale(m, m, [sx, sy]);

    const rad = (this.rotacion() * Math.PI) / 180;
    mat2d.rotate(m, m, rad);

    mat2d.translate(m, m, [-CENTER[0], -CENTER[1]]);
    return m;
  });

  // Matriz de Sombra / Espejo inferior en el suelo
  private readonly reflectionMatrix = computed<mat2d>(() => {
    const m = mat2d.create();
    mat2d.translate(m, m, [CENTER[0] + this.x(), CENTER[1] + this.y() + 180]);
    mat2d.scale(m, m, [this.escala() * (this.espejoX() ? -1 : 1), -this.escala() * 0.4]);
    
    const rad = (this.rotacion() * Math.PI) / 180;
    mat2d.rotate(m, m, rad);

    mat2d.translate(m, m, [-CENTER[0], -CENTER[1]]);
    return m;
  });

  private readonly topColor = computed(() => shade(this.color(), 35));
  private readonly leftColor = computed(() => shade(this.color(), 0));
  private readonly rightColor = computed(() => shade(this.color(), -35));

  // Capas Principales
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

  // Capas Reflejadas (Sombra de Suelo)
  protected readonly refTopConfig = computed(() => ({
    points: toKonvaPoints(TOP_FACE, this.reflectionMatrix()),
    closed: true,
    fill: '#cbd5e0',
    opacity: 0.25,
  }));

  protected readonly refLeftConfig = computed(() => ({
    points: toKonvaPoints(LEFT_FACE, this.reflectionMatrix()),
    closed: true,
    fill: '#a0aec0',
    opacity: 0.25,
  }));

  protected readonly refRightConfig = computed(() => ({
    points: toKonvaPoints(RIGHT_FACE, this.reflectionMatrix()),
    closed: true,
    fill: '#718096',
    opacity: 0.25,
  }));
}