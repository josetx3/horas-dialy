import { Component } from '@angular/core';
import {MainComponent} from "./resources/main/pages/main/main.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ MainComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'daily-wposs';
}
