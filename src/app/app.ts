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
export class App { // <-- Verifica que diga App (no AppComponent)
  posX = 0;
  posY = 0;
  rotacionDeg = 0;
  escalaFactor = 1;

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
      case 'saltar':
        this.posY -= 50;
        setTimeout(() => (this.posY += 50), 250);
        break;
      case 'reset':
        this.posX = 0;
        this.posY = 0;
        this.rotacionDeg = 0;
        this.escalaFactor = 1;
        break;
    }
  }
}