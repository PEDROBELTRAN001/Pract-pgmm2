import { mat3, vec2 } from 'gl-matrix';

export interface EstadoTransformacion {
  traslacionX: number;
  traslacionY: number;
  escalaX: number;
  escalaY: number;
  rotacionGrados: number;
  reflejoHorizontal: boolean;
  reflejoVertical: boolean;
}

export const ESTADO_TRANSFORMACION_INICIAL: Readonly<EstadoTransformacion> = {
  traslacionX: 0,
  traslacionY: 0,
  escalaX: 1,
  escalaY: 1,
  rotacionGrados: 0,
  reflejoHorizontal: false,
  reflejoVertical: false,
};

export interface TransformacionAfin2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function gradosARadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Construye MatrizFinal = Traslacion x Rotacion x Escala/Reflexion.
 *
 * Al usar vectores columna, primero se aplica la escala/reflexion alrededor
 * del origen local de la figura, despues la rotacion y al final la traslacion.
 * El centrado u offset visual queda a cargo de la capa que dibuja la figura.
 *
 * Flujo de uso:
 * Controles -> EstadoTransformacion -> crearMatriz() -> matriz -> capa visual
 *
 * @example
 * const estado: EstadoTransformacion = {
 *   traslacionX: 100,
 *   traslacionY: 50,
 *   escalaX: 1.5,
 *   escalaY: 1.5,
 *   rotacionGrados: 45,
 *   reflejoHorizontal: false,
 *   reflejoVertical: false,
 * };
 * const matriz = crearMatriz(estado);
 */
export function crearMatriz(estado: EstadoTransformacion): mat3 {
  const factorX = estado.reflejoHorizontal ? -estado.escalaX : estado.escalaX;
  const factorY = estado.reflejoVertical ? -estado.escalaY : estado.escalaY;

  const matrizTraslacion = mat3.fromTranslation(
    mat3.create(),
    vec2.fromValues(estado.traslacionX, estado.traslacionY),
  );
  const matrizRotacion = mat3.fromRotation(
    mat3.create(),
    gradosARadianes(estado.rotacionGrados),
  );
  const matrizEscalaYReflexion = mat3.fromScaling(
    mat3.create(),
    vec2.fromValues(factorX, factorY),
  );

  const rotacionPorEscala = mat3.multiply(
    mat3.create(),
    matrizRotacion,
    matrizEscalaYReflexion,
  );

  return mat3.multiply(mat3.create(), matrizTraslacion, rotacionPorEscala);
}

export function aplicarAPunto(
  matriz: mat3,
  x: number,
  y: number,
): { x: number; y: number } {
  const puntoTransformado = vec2.transformMat3(
    vec2.create(),
    vec2.fromValues(x, y),
    matriz,
  );

  return { x: puntoTransformado[0], y: puntoTransformado[1] };
}

export function matrizParaMostrar(matriz: mat3): number[][] {
  // glMatrix almacena por columnas; aqui se ordenan los valores por filas.
  return [
    [matriz[0], matriz[3], matriz[6]],
    [matriz[1], matriz[4], matriz[7]],
    [matriz[2], matriz[5], matriz[8]],
  ];
}

export function convertirAAfin2D(matriz: mat3): TransformacionAfin2D {
  return {
    a: matriz[0],
    b: matriz[1],
    c: matriz[3],
    d: matriz[4],
    e: matriz[6],
    f: matriz[7],
  };
}
