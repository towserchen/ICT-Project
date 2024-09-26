# Ziptrak Opening Detector

Used to detect any openings present in images or videos, providing coordinate references for placing blinds over them.

## Author

Matthew Freak (fremk005@mymail.unisa.edu.au)

Towser Chen (towserchen@gmail.com)


## Install

`npm install ziptrak-opening-detector`

## Usage

### Manual Detect

```javascript
import { manualDetectBlindOpenings } from ziptrak-opening-detector;

let userInputCoordinates = [100, 100, 200, 200, 300, 300, 400, 400];

// [[x1, y1, x2, y2, x3, y3, x4, y4]], Represents the coordinates of the four corners of the detected opening
let cornorCoordinates = manualDetectBlindOpenings(userInputCoordinates);
```


### Auto Detect
```javascript
import { autoDetectBlindOpenings } from ziptrak-opening-detector;

let image = document.getElementById('image');

// [[x1, y1, x2, y2, x3, y3, x4, y4]], Represents the coordinates of the four corners of the detected opening
let cornorCoordinates = autoDetectBlindOpenings(image);
```

## Doc

For more detail please click [Documentation](docs/index.md).