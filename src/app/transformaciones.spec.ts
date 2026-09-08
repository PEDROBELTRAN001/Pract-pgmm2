import {
  aplicarAPunto,
  crearMatriz,
  ESTADO_TRANSFORMACION_INICIAL,
  EstadoTransformacion,
  matrizParaMostrar,
} from './transformaciones';

const TOLERANCIA = 6;

function crearEstado(
  cambios: Partial<EstadoTransformacion> = {},
): EstadoTransformacion {
  return { ...ESTADO_TRANSFORMACION_INICIAL, ...cambios };
}

function esperarMatriz(
  matriz: ReturnType<typeof crearMatriz>,
  esperada: number[][],
): void {
  const obtenida = matrizParaMostrar(matriz);

  for (let fila = 0; fila < 3; fila += 1) {
    for (let columna = 0; columna < 3; columna += 1) {
      expect(obtenida[fila][columna]).toBeCloseTo(
        esperada[fila][columna],
        TOLERANCIA,
      );
    }
  }
}

function esperarPunto(
  obtenido: { x: number; y: number },
  esperado: { x: number; y: number },
): void {
  expect(obtenido.x).toBeCloseTo(esperado.x, TOLERANCIA);
  expect(obtenido.y).toBeCloseTo(esperado.y, TOLERANCIA);
}

describe('transformaciones geometricas', () => {
  it('crea la identidad a partir del estado inicial', () => {
    esperarMatriz(crearMatriz(crearEstado()), [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it('crea una traslacion', () => {
    const matriz = crearMatriz(
      crearEstado({ traslacionX: 100, traslacionY: 50 }),
    );

    esperarMatriz(matriz, [
      [1, 0, 100],
      [0, 1, 50],
      [0, 0, 1],
    ]);
    esperarPunto(aplicarAPunto(matriz, 0, 0), { x: 100, y: 50 });
  });

  it('crea una escala', () => {
    const matriz = crearMatriz(crearEstado({ escalaX: 2, escalaY: 3 }));

    esperarMatriz(matriz, [
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, 1],
    ]);
    esperarPunto(aplicarAPunto(matriz, 10, 5), { x: 20, y: 15 });
  });

  it('crea una rotacion de 90 grados', () => {
    const matriz = crearMatriz(crearEstado({ rotacionGrados: 90 }));

    esperarMatriz(matriz, [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ]);
    esperarPunto(aplicarAPunto(matriz, 1, 0), { x: 0, y: 1 });
  });

  it('crea una reflexion horizontal mediante escala X negativa', () => {
    const matriz = crearMatriz(crearEstado({ reflejoHorizontal: true }));

    esperarMatriz(matriz, [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    esperarPunto(aplicarAPunto(matriz, 5, 3), { x: -5, y: 3 });
  });

  it('crea una reflexion vertical mediante escala Y negativa', () => {
    const matriz = crearMatriz(crearEstado({ reflejoVertical: true }));

    esperarMatriz(matriz, [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ]);
    esperarPunto(aplicarAPunto(matriz, 5, 3), { x: 5, y: -3 });
  });

  it('combina escala, rotacion y traslacion en el orden documentado', () => {
    const matriz = crearMatriz(
      crearEstado({
        traslacionX: 10,
        traslacionY: 20,
        escalaX: 2,
        escalaY: 3,
        rotacionGrados: 90,
      }),
    );

    esperarMatriz(matriz, [
      [0, -3, 10],
      [2, 0, 20],
      [0, 0, 1],
    ]);
  });
});
