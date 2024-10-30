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
     * Detect opinings of an image
     * 
     * @param {HTMLElement} image - The image element to detect openings from
     * @param {String} canvas - The ID of the main render canvas. Default 'renderCanvas' 
     * @return {Promise<Array<number>>} - A promise that resolves to an array that represents the four corner coordinates of a quad in the form [x1, y1, x2, y2, x3, y3, x4, y4] (clockwise)
     */
    export function autoDetectBlindOpenings(image: HTMLImageElement, canvas?: String = 'renderCanvas'): Promise<number>;
  
    /**
     * Detect openings of an image based on user input
     *
     * @param {Array<number>} userCoordinates - An array of form [x1, y1, x2, y2, x3, y3, x4, y4] representing the coordinates of the quad
     * @return {Array<number>} An array of form [x1, y1, x2, y2, x3, y3, x4, y4] representing the corner coordinates of the detected quad
     */
    export function manualDetectBlindOpenings(userCoordinates: Array<number>): Array<number>;

    export function autoDetectBlindOpeningsByAI(file: File, isWindowDetected: number, saveProcessedImages: number): Promise<any>;
}