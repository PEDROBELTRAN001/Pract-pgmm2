import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-controles',
  standalone: true,
  imports: [],
  templateUrl: './controles.html',
  styleUrl: './controles.css'
})
export class ControlesComponent {
  @Output() transformacion = new EventEmitter<{ accion: string; dx?: number; dy?: number; angulo?: number; factor?: number }>();

  mover(dx: number, dy: number) {
    this.transformacion.emit({ accion: 'mover', dx, dy });
  }

  rotar(angulo: number) {
    this.transformacion.emit({ accion: 'rotar', angulo });
  }

  escalar(factor: number) {
    this.transformacion.emit({ accion: 'escalar', factor });
  }

  saltar() {
    this.transformacion.emit({ accion: 'saltar' });
  }

  resetear() {
    this.transformacion.emit({ accion: 'reset' });
  }
}