declare module 'ziptrak-opening-detector' {

    /**
     * Detect openings of an image
     *
     * @param {HTMLImageElement} image - The image element to detect openings from
     * @param {Array<HTMLCanvasElement>} canvasSlotList - A list of canvas elements to show each detection step, can be an empty array
     * @return {Promise<Array<Array<number>>>} A Promise that resolves to a 2D array where each inner array represents the four corner coordinates of a detected quad
     */
    export function autoDetectBlindOpenings(image: HTMLImageElement, canvasSlotList?: Array<HTMLCanvasElement>): Promise<Array<Array<number>>>;
  
    /**
     * Detect openings of an image based on user input
     *
     * @param {Array<number>} userCoordinates - An array of form [x1, y1, x2, y2, x3, y3, x4, y4] representing the coordinates of the quad
     * @return {Array<number>} An array of form [x1, y1, x2, y2, x3, y3, x4, y4] representing the corner coordinates of the detected quad
     */
    export function manualDetectBlindOpenings(userCoordinates: Array<number>): Array<number>;
}