import { Component, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StageComponent, CoreShapeComponent } from 'ng2-konva';
import { mat2d, vec2 } from 'gl-matrix';

const CANVAS_WIDTH = 850;
const CANVAS_HEIGHT = 600;
const CENTER: vec2 = [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20];

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