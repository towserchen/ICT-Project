declare module 'ziptrak-opening-detector' {

    /**
     * Scale coordinates from a full size image to appear correct on a canvas
     * 
     * @param {Number} originalWidth - width of the original image
     * @param {Number} originalHeight - height of the original image
     * @param {HTMLCanvasElement} canvas - canvas that the coordinates will be scaled to
     * @param {Array<Number>} originalCoords - the original coordinates from the full sized image
     * @returns {Array<Number>} - An array of form [x1, y1, x2, y2, x3, y3, x4, y4] (clockwise) representing the scaled corner coordiantes of a quad
     */
    export function scaleCoordinates(originalWidth: Number, originalHeight: Number, canvas: HTMLCanvasElement, originalCoords: Array<Number>): Array<Number>;

    /**
     * Detect blind opening from an image
     * 
     * @param {String} imageURL - the URL the uploaded image is stored at (example: blob:https://iv.logissoftware.com/da26a161-a81f-493a-a1c2-27f2790c8d5f)
     * @param {Boolean} detectWindow - Used to tell the AI model if it is trying to detect a window or an outdoor setting. Optional (Can be tricky as can't be coupled to outdoor/indoor blinds as an outdoor blind over an external window will trip the model)
     * @param {String} canvas - The ID of the main render canvas. Optional, Default 'renderCanvas'
     * @return {Promise<Array<number>>} - A promise that resolves to an array that represents the four corner coordinates of a quad in the form [x1, y1, x2, y2, x3, y3, x4, y4] (clockwise)
     */
    export function autoDetectBlindOpenings(imageURL: String, detectWindow?: String, canvas?: String): Promise<Array<number>>;
  
    /**
     * Detect openings of an image based on user input. `autoDetectBlindOpening` must be called before this function is called.
     *
     * @return {Promise<Array<number>>} - A promise that resolves to an array that represents the four corner coordinates of a quad in the form [x1, y1, x2, y2, x3, y3, x4, y4] (clockwise)
     */
    export function manualDetectBlindOpenings(): Promise<Array<number>>;

    /*
    * Reset the api url
    * 
    * @param {string} url
    * @return {void}
    */
    export function setApiUrl(url: string): void;

    /*
    * Detect opinings of an image by AI
    * 
    * @param {File} file
    * @param {int} isWindowDetected, 0/1
    * @param {int} saveProcessedImages, 0/1
    * @return {Array<Array<number>>} - A 2D array where each inner array represents the four corner coordinates of a quad
    */
    export function autoDetectBlindOpeningsByAI(file: File, isWindowDetected: number, saveProcessedImages: number): Promise<any>;
}