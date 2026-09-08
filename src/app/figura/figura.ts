import { Component, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StageComponent, CoreShapeComponent } from 'ng2-konva';
import { mat2d, vec2 } from 'gl-matrix';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 650;
const CENTER: vec2 = [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20];

// Edge length and isometric projection offsets (30° cube).
const EDGE = 60;
const EX = EDGE * Math.cos(Math.PI / 6);
const EY = EDGE * Math.sin(Math.PI / 6);

// Vertices of an isometric cube in local (object) space, centered on the canvas.
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

  readonly x = input(0);
  readonly y = input(0);
  readonly rotacion = input(0); // Rotación en grados
  readonly escala = input(1);   // Escala multiplicativa
  readonly color = input('#2f6fed');

  // Matriz de transformación 2D combinada (Traslación + Rotación + Escala)
  private readonly matrix = computed<mat2d>(() => {
    const m = mat2d.create();
    
    // 1. Trasladar al centro relativo a las coordenadas X/Y ingresadas
    mat2d.translate(m, m, [CENTER[0] + this.x(), CENTER[1] + this.y()]);
    
    // 2. Aplicar rotación (convertida a radianes) desde el centro del cubo
    const rad = (this.rotacion() * Math.PI) / 180;
    mat2d.rotate(m, m, rad);
    
    // 3. Aplicar escala
    mat2d.scale(m, m, [this.escala(), this.escala()]);
    
    // 4. Trasladar de vuelta el origen local
    mat2d.translate(m, m, [-CENTER[0], -CENTER[1]]);
    
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