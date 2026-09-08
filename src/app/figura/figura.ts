import { Component, ElementRef, AfterViewInit, ViewChild, Input } from '@angular/core';
import Konva from 'konva';

@Component({
  selector: 'app-figura',
  standalone: true,
  templateUrl: './figura.html',
  styleUrl: './figura.css'
})
export class FiguraComponent implements AfterViewInit {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private shape!: Konva.RegularPolygon;

  ngAfterViewInit() {
    this.stage = new Konva.Stage({
      container: this.container.nativeElement,
      width: 600,
      height: 400
    });

    this.layer = new Konva.Layer();

    this.shape = new Konva.RegularPolygon({
      x: 300,
      y: 200,
      sides: 5,
      radius: 70,
      fill: '#3f51b5',
      stroke: 'black',
      strokeWidth: 2
    });

    this.layer.add(this.shape);
    this.stage.add(this.layer);
  }

  @Input() set transformMatrix(matrix: number[]) {
    if (this.shape && matrix && matrix.length >= 6) {
      // Reemplazamos la matriz de transformación del nodo directamente
      const transform = this.shape.getTransform();
      transform.m = [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]];
      
      // Forzamos a Konva a renderizar con la nueva matriz
      this.shape.transformsEnabled('position');
      this.layer.batchDraw();
    }
  }
}