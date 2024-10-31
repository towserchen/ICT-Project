# Blind opening detection system
**Documentation**

## Contents
- [Installation](#installation)
- [Functions](#functions)  
  1. [autoDetectBlindOpenings(image)](#1-autodetectblindopeningsimage)  
  2. [manualDetectBlindOpenings(userCoordinates)](#2-manualdetectblindopeningsusercoordinates)
- [Appendices](#appendices)  
  - [Appendix A](#appendix-a)  
  - [Appendix B](#appendix-b)

---

## Installation

Our package can be installed with either of the following commands:

```bash
npm install ziptrak-opening-detector
```
or
```bash
npm install github:towserchen/ICT-Project#release
```
Our module can then be imported with:
```javascript
import { autoDetectBlindOpenings, manualDetectBlindOpenings } from "ziptrak-opening-detector";
```

---

## Functions

### 1. autoDetectBlindOpenings(image)

This function will automatically detect openings from a user-uploaded photo.  
This function is intended to be called when a user uploads a photo. `autoDetectBlindOpenings` is intended to be called immediately after the photo is uploaded. The function will return the coordinates of all detected openings. The returned coordinates will not be scaled to the `renderCanvas` (see Appendix A for more details).

#### Parameters
- **image**: The user-uploaded image file as an `Image()` object.

#### Returns
- The return value is an array of arrays, where each inner array contains the coordinates of one detected opening. The format will be:  
  `[[x1, y1, x2, y2, x3, y3, x4, y4], [x1, y1, x2, y2, x3, y3, x4, y4], ...]`  
  Each inner array represents the four corners of an individual detected opening.
- If no openings are detected, an empty array will be returned.

---

### 2. manualDetectBlindOpenings(userCoordinates)

This function detects blind openings based on user input, where the user provides the approximate locations of the corners of the opening.  
This function is designed as a fallback when `autoDetectBlindOpenings` is unable to identify the desired opening. The function is intended to be invoked by the process responsible for capturing the user's inputs and will receive the approximate corner coordinates as parameters. The function will return the coordinates of one opening. The returned coordinates will not be scaled to the `renderCanvas` (see Appendix A for more details).

#### Parameters
- **userCoordinates**: An array of coordinates representing the four corners of the selected opening.  
  The function assumes that the user input for the four corner positions has already been collected by another process. The function will therefore accept an array of coordinates representing the four corners of the selected opening. The array should be in the following format:  
  `[x1, y1, x2, y2, x3, y3, x4, y4]`  
  Each pair of coordinates corresponds to a corner of the intended blind opening.

#### Returns
- An array in the following format:  
  `[x1, y1, x2, y2, x3, y3, x4, y4]`  
  This array represents the coordinates of the four corners of the blind opening, with each pair (x, y) corresponding to one corner in sequence.
- In the case no opening is detected, an empty array will be returned.

---

### 3. autoDetectBlindOpeningsByAI(file)

This function will automatically detect openings from a user-uploaded photo.  
The file you selected will be uploaded to the remote API server and be detected by AI.

#### Parameters
- **file**: File object, The file selected from the HTML upload component (`<input type="file">`)

#### Returns
- The return value is an array of arrays, where each inner array contains the coordinates of one detected opening. The format will be:  
  `[[[x1, y1], [x2, y2], [x3, y3], [x4, y4]]...]`  
  Each inner array represents the four corners of an individual detected opening.
- The coordinate order is clockwise, top_left, top_right, bottom_right, bottom_left.

---

## Appendices

### Appendix A

Since the `renderCanvas` dynamically adjusts its size based on the screen and window dimensions, the coordinates returned by our functions will be relative to the original image. This means that the coordinates will need to be scaled appropriately to match the actual size of the `renderCanvas` whenever it is displayed.

While it is possible to perform the necessary scaling calculations within the function, we believe it’s best to avoid embedding these calculations directly in the function. The primary concern is that the `renderCanvas` can be resized dynamically as the window or screen size changes. Embedding scaling logic within the function may lead to complications in maintaining accurate rescaling after such changes. This approach allows for greater flexibility, ensuring that the scaling can be handled externally and dynamically, if necessary, without introducing complexity or potential errors into the core detection logic.

Below is an example of a function that scales an array of coordinates to fit the dimensions of the `renderCanvas`:

```javascript
function scaleCoordinates(originalCoords, originalImage, renderCanvas) {
    // Calculate the scaling factors
    const scaleX = renderCanvas.width / originalImage.width;
    const scaleY = renderCanvas.height / originalImage.height;

    // Apply the scaling to each coordinate pair
    let scaledCoords = [];
    for (let i = 0; i < originalCoords.length; i += 2) {
        let scaledX = originalCoords[i] * scaleX;
        let scaledY = originalCoords[i + 1] * scaleY;
        scaledCoords.push(scaledX, scaledY);
    }

    return scaledCoords;
}
