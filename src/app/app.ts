import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Figura } from './figura/figura';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Figura],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('hackathon-transformaciones');
}
