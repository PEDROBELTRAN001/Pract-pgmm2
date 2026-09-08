import { Component } from '@angular/core';
import { ControlesComponent } from './controles/controles';
import { Figura } from './figura/figura';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ControlesComponent, Figura],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  posX = 0;
  posY = 0;
  rotacionDeg = 0;
  escalaFactor = 1;
  espejoX = false;
  espejoY = false;
  colorFigura = '#2f6fed';

  procesarTransformacion(evento: any) {
    switch (evento.accion) {
      case 'mover':
        this.posX += evento.dx;
        this.posY += evento.dy;
        break;
      case 'rotar':
        this.rotacionDeg += evento.angulo;
        break;
      case 'escalar':
        this.escalaFactor *= evento.factor;
        break;
      case 'espejoX':
        this.espejoX = evento.estado;
        break;
      case 'espejoY':
        this.espejoY = evento.estado;
        break;
      case 'color':
        this.colorFigura = evento.color;
        break;
      case 'saltar':
        this.animarSalto();
        break;
      case 'orbitar':
        this.animarGiro();
        break;
      case 'reset':
        this.posX = 0;
        this.posY = 0;
        this.rotacionDeg = 0;
        this.escalaFactor = 1;
        this.espejoX = false;
        this.espejoY = false;
        this.colorFigura = '#2f6fed';
        break;
    }
  }

  private animarSalto() {
    let paso = 0;
    const intervalo = setInterval(() => {
      paso++;
      this.posY -= Math.sin((paso * Math.PI) / 20) * 8;
      if (paso >= 20) clearInterval(intervalo);
    }, 16);
  }

  private animarGiro() {
    let anguloSumado = 0;
    const intervalo = setInterval(() => {
      this.rotacionDeg += 10;
      anguloSumado += 10;
      if (anguloSumado >= 360) clearInterval(intervalo);
    }, 16);
  }
}