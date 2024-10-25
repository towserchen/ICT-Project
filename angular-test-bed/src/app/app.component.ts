import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { autoDetectBlindOpenings } from 'ziptrak-opening-detector';

declare var cv: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'angular-test-bed';
  detectionResult: Array<Array<number>> = [];
  imagePath: string = '1.jpg';
  imageLoaded: boolean = false;

  constructor() {
    this.loadOpenCV();
  }

  private loadOpenCV() {
    if (typeof (window as any).cv !== 'undefined') {
      console.log('OpenCV.js has been successfully loaded!');
    } else {
      console.error('OpenCV.js failed to load.');
    }
  }

  testAutoDetection(imageElement: HTMLImageElement): void {
    console.log('here');
    if (imageElement) {
      const result = autoDetectBlindOpenings(imageElement);
      console.log('Detection Result:', result);
      this.detectionResult = result;
    } else {
      console.error('Image element not found');
    }
  }

  onImageLoad(event: Event): void {
    console.log('here');
    const imageElement = event.target as HTMLImageElement;
    this.imageLoaded = true;
    this.testAutoDetection(imageElement);
  }
}