# Blind opening detection system
**Documentation**

## Contents
- [Installation](#installation)
- [Functions](#functions)  
  1. [autoDetectBlindOpenings(imageURL, detectWindow, canvas)](#1-autodetectblindopeningsimageurl-detectwindow-canvas)
  2. [manualDetectBlindOpenings()](#2-manualdetectblindopenings)
  3. [autoDetectBlindOpeningsByAI(file)](#3-autodetectblindopeningsbyaifile)
  4. [setApiUrl(url)](#4-setapiurlurl)
- [Appendices](#appendices)  
  - [Appendix A](#appendix-a)

---

## Installation

The package can be installed with either of the following commands:

```bash
npm install ziptrak-opening-detector
```
latest version 1.2.1

The module can then be imported with:
```javascript
import { autoDetectBlindOpenings, manualDetectBlindOpenings } from "ziptrak-opening-detector";
```

---

## Functions

### 1. autoDetectBlindOpenings(imageURL, detectWindow, canvas)

**This function is `async`. `await` recommended** 
This function will automatically detect openings from a user-uploaded photo.  
This function is intended to be called when a user uploads a photo. `autoDetectBlindOpenings` is intended to be called once a user has uploaded a photo and the blind adjusment page has loaded. The function will return the coordinates of the opening that the user selects. The returned coordinate will not be scaled to the `renderCanvas` (see Appendix A for more details).

#### Parameters
- **imageURL**: The internal URL to the user uploaded photo as a `string`. Example: `blob:https://iv.logissoftware.com/da26a161-a81f-493a-a1c2-27f2790c8d5f`.
- **detectWindow - optional**: A `boolen` flag to tell the AI detection model if it is trying to find a opening over a window or an outdoor setting like a patio. `true` the model will look for a window. `false` the model will look for a blind opening in an outdoor setting. This parameter is optional and will default to `false` if not provided.
- **canvas - optional**: The id string of the main render `canvas` that the user's image is displayed on. Will default to `'renderCanvas'` if not provided.

#### Returns
- **`Promise<Array<number>>`**
- The return value is a promise to an `array`. 
The format of the array will be: `[x1, y1, x2, y2, x3, y3, x4, y4]`  
  Each inner array represents the four corners of an individual detected opening.
- If no openings are detected or the user exits the selection phase an empty array will be returned.

---

### 2. manualDetectBlindOpenings()

**This function is `async`. `await` recommended**
**This function is designed to be called once `autoDetectBlindOpenings` has already been called and will not work otherwise**
This function detects blind openings based on user input, where the user provides the approximate locations of the corners of the opening.  
This function is designed as a fallback when `autoDetectBlindOpenings` is unable to identify the desired opening. The function will return the coordinates of one opening. The returned coordinates will not be scaled to the `renderCanvas` (see Appendix A for more details).

#### Parameters
- **None**

#### Returns
- An array in the following format:  
  `[x1, y1, x2, y2, x3, y3, x4, y4]`  
  This array represents the coordinates of the four corners of the blind opening, with each pair (x, y) corresponding to one corner in sequence.
- In the case no opening is detected, an empty array will be returned.

---

### 3. autoDetectBlindOpeningsByAI(file)

This function will automatically detect openings from a user-uploaded photo.  
The file you selected will be uploaded to the remote API server and be detected by AI.
This function is called internally by `autoDetectBlindOpenings` so it is not necessary or intended for use.

#### Parameters
- **file**: File object, The file selected from the HTML upload component (`<input type="file">`)

#### Returns
- The return value is an array of arrays, where each inner array contains the coordinates of one detected opening. The format will be:  
  `[[[x1, y1], [x2, y2], [x3, y3], [x4, y4]]...]`  
  Each inner array represents the four corners of an individual detected opening.
- The coordinate order is clockwise, top_left, top_right, bottom_right, bottom_left.

---

### 4. setApiUrl(url)

Used to modify the AI API `URL`. Once the AI model is migrated to your internal server this will be need to set the new API `URL`. The Default API endpoint may not be available in the future.

#### Parameters
- **url**: Your API `URL`

#### Returns
- None

---

## Appendices

### Appendix A

Since the `renderCanvas` dynamically adjusts its size based on the screen and window dimensions, the coordinates returned by our functions will be relative to the original image. This means that the coordinates will need to be scaled appropriately to match the actual size of the `renderCanvas` whenever it is displayed.

While it is possible to perform the necessary scaling calculations within the function, we believe it’s best to avoid embedding these calculations directly in the function. The primary concern is that the `renderCanvas` can be resized dynamically as the window or screen size changes. Embedding scaling logic within the function may lead to complications in maintaining accurate rescaling after such changes. This approach allows for greater flexibility, ensuring that the scaling can be handled externally and dynamically, if necessary, without introducing complexity or potential errors into the core detection logic.

The package uses a function internally for scaling coordinates which has been allowed for export as well. This function may be used or you may adapt it and write your own. The code is provided below.

```javascript
/**
 * Scale coordinates from a full size image to appear correct on a canvas
 * 
 * @param {Number} originalWidth - width of the original image
 * @param {Number} originalHeight - height of the original image
 * @param {HTMLCanvasElement} canvas - canvas that the coordinates will be scaled to
 * @param {Array<Number>} originalCoords - the original coordinates from the full sized image
 * @returns {Array<Number>} - An array of form [x1, y1, x2, y2, x3, y3, x4, y4] (clockwise) representing the scaled corner coordiantes of a quad
 */
export function scaleCoordinates(originalWidth, originalHeight, canvas, originalCoords) {
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    
    const canvasAspectRatio = canvasWidth / canvasHeight;
    const imageAspectRatio = originalWidth / originalHeight;

    let scaleX, scaleY, offsetX = 0, offsetY = 0;

    if (imageAspectRatio > canvasAspectRatio) { // Image is wider than the canvas, so the height will fit, and it'll have horizontal padding
        scaleX = canvasWidth / originalWidth;
        scaleY = scaleX; // Maintain aspect ratio
        offsetY = (canvasHeight - (originalHeight * scaleY)) / 2;
    } else { // Image is taller than the canvas, so the width will fit, and it'll have vertical padding
        scaleY = canvasHeight / originalHeight;
        scaleX = scaleY; // Maintain aspect ratio
        offsetX = (canvasWidth - (originalWidth * scaleX)) / 2;
    }

    const scaledCoords = [];

    for (let i = 0; i < originalCoords.length; i += 2) {
        const x = originalCoords[i];
        const y = originalCoords[i + 1];

        const scaledX = x * scaleX + offsetX;
        const scaledY = y * scaleY + offsetY;

        scaledCoords.push(scaledX, scaledY);
    }

    return scaledCoords;
};
