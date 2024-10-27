import { Component, ViewChild, ElementRef } from '@angular/core';
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

  @ViewChild('testImg') imageElement!: ElementRef<HTMLImageElement>;

  ngAfterViewInit(): void {
    this.checkOpenCVLoaded().then(() => {
      console.log('OpenCV.js is loaded');
      const imageElement = this.imageElement.nativeElement;
      this.imageLoaded = true;
      this.testAutoDetection(imageElement);
    }).catch(() => {
      console.error('OpenCV.js is not loaded');
    });
  }


  private checkOpenCVLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (typeof cv !== 'undefined' && cv.getBuildInformation) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);  // 100ms

      setTimeout(() => {
        clearInterval(checkInterval);
        reject();
      }, 30000);  //Timeout after 30 seconds
    });
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
    
  }
}