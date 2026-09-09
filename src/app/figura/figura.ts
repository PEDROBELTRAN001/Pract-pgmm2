import { Component, PLATFORM_ID, afterNextRender, computed, inject, input, signal } from '@angular/core';
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
const DINO_LEG_ROW_START = 12; // rows 0-11 are the body/tail/head, 12+ are the legs
const DINO_GROUND_Y = CANVAS_HEIGHT - DINO_HEIGHT - 60;
const DINO_RUN_MIN_X = 40;
const DINO_RUN_MAX_X = CANVAS_WIDTH - DINO_WIDTH - 40;
const DINO_RUN_SPEED = 90; // px/s
const DINO_LEG_TOGGLE_MS = 160;
const DINO_JUMP_EVERY_MS = 2600;
const DINO_JUMP_DURATION_MS = 550;
const DINO_JUMP_HEIGHT = 70;

interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

/** Body/head/tail only (rows 0-11), in local coordinates relative to the dino group. */
function buildDinoBody(): PixelRect[] {
  const rects: PixelRect[] = [];
  for (let row = 0; row < DINO_LEG_ROW_START; row++) {
    const rowStr = DINO_GRID[row];
    for (let col = 0; col < rowStr.length; col++) {
      if (rowStr[col] !== '#') continue;
      rects.push({
        x: col * DINO_CELL,
        y: row * DINO_CELL,
        width: DINO_CELL,
        height: DINO_CELL,
        fill: '#535353',
      });
    }
  }
  return rects;
}

/** The two leg columns from the original grid (rows 12-17), as plain spans. */
function findLegColumns(): { start: number; end: number }[] {
  const legRow = DINO_GRID[DINO_LEG_ROW_START];
  const legs: { start: number; end: number }[] = [];
  let start = -1;
  for (let col = 0; col <= legRow.length; col++) {
    const filled = col < legRow.length && legRow[col] === '#';
    if (filled && start === -1) start = col;
    if (!filled && start !== -1) {
      legs.push({ start, end: col - 1 });
      start = -1;
    }
  }
  return legs;
}

const DINO_LEG_HEIGHT_ROWS = DINO_GRID.length - DINO_LEG_ROW_START;
const [DINO_LEG_1, DINO_LEG_2] = findLegColumns();

/** Builds the two legs for a running frame: one planted, one lifted mid-stride. */
function buildDinoLegs(liftedLeg: 0 | 1): PixelRect[] {
  const legs = [DINO_LEG_1, DINO_LEG_2];
  return legs.map((leg, index) => {
    const isLifted = index === liftedLeg;
    const rows = isLifted ? DINO_LEG_HEIGHT_ROWS - 2 : DINO_LEG_HEIGHT_ROWS;
    const strideShift = isLifted ? (index === 0 ? 1 : -1) : 0;
    return {
      x: (leg.start + strideShift) * DINO_CELL,
      y: DINO_LEG_ROW_START * DINO_CELL,
      width: (leg.end - leg.start + 1) * DINO_CELL,
      height: rows * DINO_CELL,
      fill: '#535353',
    };
  });
}

const DINO_BODY: PixelRect[] = buildDinoBody();
const DINO_LEG_FRAMES: readonly [PixelRect[], PixelRect[]] = [buildDinoLegs(0), buildDinoLegs(1)];
const DINO_EYE_RECT: PixelRect = {
  x: DINO_EYE.col * DINO_CELL,
  y: DINO_EYE.row * DINO_CELL,
  width: DINO_CELL,
  height: DINO_CELL,
  fill: '#f7f8fa',
};
// Tiny forearm hanging from the chest, below the neck.
const DINO_ARM_RECT: PixelRect = {
  x: DINO_ARM.col * DINO_CELL,
  y: DINO_ARM.row * DINO_CELL,
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

  // Running (patrols back and forth), leg-alternation, and jump state.
  private readonly dinoRunX = signal((DINO_RUN_MIN_X + DINO_RUN_MAX_X) / 2);
  private readonly dinoDirection = signal<1 | -1>(1);
  private readonly dinoLegFrame = signal<0 | 1>(0);
  private readonly dinoJumpOffset = signal(0);

  protected readonly dinoLegs = computed(() => DINO_LEG_FRAMES[this.dinoLegFrame()]);

  protected readonly dinoGroupConfig = computed(() => ({
    // Rounded to whole pixels: fractional positions leave faint seams between
    // the many adjacent 1-cell rects that make up the pixel art.
    x: Math.round(this.dinoRunX() + DINO_WIDTH / 2),
    y: Math.round(DINO_GROUND_Y - this.dinoJumpOffset()),
    offsetX: DINO_WIDTH / 2,
    scaleX: this.dinoDirection(),
  }));

  constructor() {
    afterNextRender(() => this.runDinoAnimation());
  }

  private runDinoAnimation(): void {
    let lastTime = performance.now();
    let legTimer = 0;
    let jumpTimer = 0;
    let jumpElapsed: number | null = null;

    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      // Patrol left/right across the canvas, flipping to face the way it's moving.
      let nextX = this.dinoRunX() + this.dinoDirection() * DINO_RUN_SPEED * (dt / 1000);
      if (nextX <= DINO_RUN_MIN_X) {
        nextX = DINO_RUN_MIN_X;
        this.dinoDirection.set(1);
      } else if (nextX >= DINO_RUN_MAX_X) {
        nextX = DINO_RUN_MAX_X;
        this.dinoDirection.set(-1);
      }
      this.dinoRunX.set(nextX);

      // Alternate legs while running.
      legTimer += dt;
      if (legTimer >= DINO_LEG_TOGGLE_MS) {
        legTimer = 0;
        this.dinoLegFrame.set(this.dinoLegFrame() === 0 ? 1 : 0);
      }

      // Every so often, jump in a smooth arc.
      if (jumpElapsed === null) {
        jumpTimer += dt;
        if (jumpTimer >= DINO_JUMP_EVERY_MS) {
          jumpTimer = 0;
          jumpElapsed = 0;
        }
      } else {
        jumpElapsed += dt;
        const progress = Math.min(jumpElapsed / DINO_JUMP_DURATION_MS, 1);
        this.dinoJumpOffset.set(Math.sin(progress * Math.PI) * DINO_JUMP_HEIGHT);
        if (progress >= 1) {
          jumpElapsed = null;
          this.dinoJumpOffset.set(0);
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

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