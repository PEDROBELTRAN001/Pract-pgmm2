import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-controles',
  standalone: true,
  imports: [],
  templateUrl: './controles.html',
  styleUrl: './controles.css'
})
export class ControlesComponent {
  @Output() transformacion = new EventEmitter<any>();

  espejoX = false;
  espejoY = false;

  mover(dx: number, dy: number) {
    this.transformacion.emit({ accion: 'mover', dx, dy });
  }

  rotar(angulo: number) {
    this.transformacion.emit({ accion: 'rotar', angulo });
  }

  escalar(factor: number) {
    this.transformacion.emit({ accion: 'escalar', factor });
  }

  toggleEspejoX() {
    this.espejoX = !this.espejoX;
    this.transformacion.emit({ accion: 'espejoX', estado: this.espejoX });
  }

  toggleEspejoY() {
    this.espejoY = !this.espejoY;
    this.transformacion.emit({ accion: 'espejoY', estado: this.espejoY });
  }

  cambiarColor(color: string) {
    this.transformacion.emit({ accion: 'color', color });
  }

  onCustomColor(event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.cambiarColor(color);
  }

  saltar() {
    this.transformacion.emit({ accion: 'saltar' });
  }

  orbitar() {
    this.transformacion.emit({ accion: 'orbitar' });
  }

  resetear() {
    this.espejoX = false;
    this.espejoY = false;
    this.transformacion.emit({ accion: 'reset' });
  }
}