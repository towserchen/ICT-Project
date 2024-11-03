import { Component, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { autoDetectBlindOpenings, manualDetectBlindOpenings } from 'ziptrak-opening-detector';

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
    this.checkOpenCVLoaded().then(() => {
      console.log('OpenCV.js is loaded');
      this.testDetection();
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

  async testDetection(): Promise<void> {
    const renderCanvas = document.getElementById('renderCanvas')!;
    
    let imageUrl = './1.jpg';    
    renderCanvas.style.backgroundImage = `url(${imageUrl})`;
    let result = await autoDetectBlindOpenings(imageUrl, false);
    console.log(result);

    imageUrl = './5.jpg';    
    renderCanvas.style.backgroundImage = `url(${imageUrl})`;
    result = await autoDetectBlindOpenings(imageUrl, false);
    console.log(result);
    result = await manualDetectBlindOpenings();
    console.log(result);

    imageUrl = './7.jpg';    
    renderCanvas.style.backgroundImage = `url(${imageUrl})`;
    result = await autoDetectBlindOpenings(imageUrl, false);
    console.log(result);
    result = await manualDetectBlindOpenings();
    console.log(result);
    
    imageUrl = './14.jpg';    
    renderCanvas.style.backgroundImage = `url(${imageUrl})`;
    result = await autoDetectBlindOpenings(imageUrl);
    console.log(result);
    result = await manualDetectBlindOpenings();
    console.log(result);

    imageUrl = './10.jpg';    
    renderCanvas.style.backgroundImage = `url(${imageUrl})`;
    result = await autoDetectBlindOpenings(imageUrl);
    console.log(result);
    
    imageUrl = './12.jpg';    
    renderCanvas.style.backgroundImage = `url(${imageUrl})`;
    result = await autoDetectBlindOpenings(imageUrl);
    console.log(result);
    
    imageUrl = './16.jpg';    
    renderCanvas.style.backgroundImage = `url(${imageUrl})`;
    result = await autoDetectBlindOpenings(imageUrl);
    console.log(result);
    result = await manualDetectBlindOpenings();
    console.log(result);
  }
}