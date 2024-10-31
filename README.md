# Ziptrak Opening Detector

Used to detect any blind openings present in images or videos, providing the corner coordinates of the detected quadrilateral.

## Author

Matthew Freak (fremk005@mymail.unisa.edu.au)

Towser Chen (towserchen@gmail.com)


## Install

`npm install ziptrak-opening-detector`

## Usage

### Auto Detect
```javascript
import { autoDetectBlindOpenings } from ziptrak-opening-detector;

let cornerCoordinates;
let image = new Image();
image.src = "path/to/user/image";
image.onload = function () {
  // [[x1, y1, x2, y2, x3, y3, x4, y4]], Represents the coordinates of the four corners of the detected opening
    cornerCoordinates = autoDetectBlindOpenings(image);
};
```

### Manual Detect

```javascript
import { manualDetectBlindOpenings } from ziptrak-opening-detector;

let userInputCoordinates = [100, 100, 200, 200, 300, 300, 400, 400];

// [x1, y1, x2, y2, x3, y3, x4, y4], Represents the approximate coordinates of the four corners of the intended opening
let cornorCoordinates = manualDetectBlindOpenings(userInputCoordinates);
```

### Auto Detect By AI

```javascript
import { autoDetectBlindOpeningsByAI } from ziptrak-opening-detector;

const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        cornerCoordinates = detect(file);
    }
});
```

## Documentation

For more detail please click [Documentation](docs/docs.md).