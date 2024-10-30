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
  detectionResult: Array<number> = [];
  imagePath: string = '1.jpg';
  imageLoaded: boolean = false;
  
  

  ngAfterViewInit(): void {
    const imageElement: HTMLImageElement = new Image();
    imageElement.src = this.imagePath;
  
    // Wait for the image to load before drawing it
    imageElement.onload = () => { 
      // Once the image is loaded and drawn, run OpenCV detection
      this.checkOpenCVLoaded().then(() => {
        console.log('OpenCV.js is loaded');
        this.imageLoaded = true;
        this.testAutoDetection(imageElement);  // Pass the loaded image to detection function
      }).catch(() => {
        console.error('OpenCV.js is not loaded');
      });
    };
  
    // Handle error in case the image fails to load
    imageElement.onerror = (error) => {
      console.error('Failed to load the image:', error);
    };
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
      autoDetectBlindOpenings(imageElement).then(coordinates => {
        console.log('Detection Result:', coordinates);
        this.detectionResult = coordinates;
      }).catch(error => {
        console.error('Error:', error);
      });
    } else {
      console.error('Image element not found');
    }
  }
}