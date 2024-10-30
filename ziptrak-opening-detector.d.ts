declare module 'ziptrak-opening-detector' {

    /**
     * Detect openings of an image
     *
     * @param {HTMLImageElement} image - The image element to detect openings from
     * @return {Array<Array<number>>} A 2D array where each inner array represents the four corner coordinates of a quad
     */
    export function autoDetectBlindOpenings(image: HTMLImageElement): Array<Array<number>>;
  
    /**
     * Detect openings of an image based on user input
     *
     * @param {Array<number>} userCoordinates - An array of form [x1, y1, x2, y2, x3, y3, x4, y4] representing the coordinates of the quad
     * @return {Array<number>} An array of form [x1, y1, x2, y2, x3, y3, x4, y4] representing the corner coordinates of the detected quad
     */
    export function manualDetectBlindOpenings(userCoordinates: Array<number>): Array<number>;

    export function autoDetectBlindOpeningsByAI(file: File, isWindowDetected: number, saveProcessedImages: number): Promise<any>;
}