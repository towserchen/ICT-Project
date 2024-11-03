# Ziptrak Opening Detector

Used to detect any blind openings present in images or videos, providing the corner coordinates of the detected quadrilateral.

## Author

Matthew Freak (fremk005@mymail.unisa.edu.au)

Towser Chen (towserchen@gmail.com)


## Install

`npm install ziptrak-opening-detector`
latest version 1.2.5

## Usage

### Auto Detect
```javascript
import { autoDetectBlindOpenings } from ziptrak-opening-detector;

let cornorCoordinates = await autoDetectBlindOpenings('blob:https://iv.logissoftware.com/da26a161-a81f-493a-a1c2-27f2790c8d5f', true, 'renderCanvas');
```

### Manual Detect

```javascript
import { manualDetectBlindOpenings } from ziptrak-opening-detector;


let cornorCoordinates = await manualDetectBlindOpenings();
```


## Documentation

For more detail please click [Documentation](docs/docs.md).