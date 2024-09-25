import cv from "@techstark/opencv-js"

module.exports = {
    /**
     * Detect opinings of an image
     * 
     * @param {HTMLElement} image 
     * @return {array} rectangleList
     */
    autoDetectBlindOpenings(image) {
        const mat = cv.imread(imgElement);
        const gray = new cv.Mat();
        const edges = new cv.Mat();
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        const blurred = new cv.Mat();
        const binary = new cv.Mat();

        // gray
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);

        // gaussian blur
        const kernelSize = new cv.Size(7, 7);
        const sigmaX = 0;
        const sigmaY = 0;
        cv.GaussianBlur(gray, blurred, kernelSize, sigmaX, sigmaY);
        cv.imshow(step1Canvas, blurred);

        // binaryzation
        //cv.adaptiveThreshold(blurred, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

        // canny detect
        cv.Canny(blurred, edges, 30, 250, 5, true);
        cv.imshow(step2Canvas, edges);

        cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

        // area and edges
        let contourAreas = [];

        for (let i = 0; i < contours.size(); i++) {
            let contour = contours.get(i);
            let area = cv.contourArea(contour);
            let boundingBox = cv.boundingRect(contour);
            contourAreas.push({ index: i, area: area, boundingBox: boundingBox });
        }

        // sort by areas
        contourAreas.sort((a, b) => b.area - a.area);

        // whether there are contours connected
        function areConnected(box1, box2) {
            return !(box1.x + box1.width < box2.x || 
                    box2.x + box2.width < box1.x || 
                    box1.y + box1.height < box2.y || 
                    box2.y + box2.height < box1.y);
        }

        // whether a small contour inside a big contour
        function isInside(box1, box2) {
            let result = (
                box2.boundingBox.x >= box1.boundingBox.x &&
                box2.boundingBox.y >= box1.boundingBox.y &&
                box2.boundingBox.x + box2.boundingBox.width <= box1.boundingBox.x + box1.boundingBox.width &&
                box2.boundingBox.y + box2.boundingBox.height <= box1.boundingBox.y + box1.boundingBox.height
            );

            return result;
        }

        // merge small contours to a big contour
        let groupedContours = [];
        let used = new Array(contourAreas.length).fill(false);

        for (let i = 0; i < contourAreas.length; i++) {
            if (used[i]) continue;
            let group = [contourAreas[i]];
            used[i] = true;

            // {x: 532, y: 275, width: 120, height: 297}
            for (let j = i + 1; j < contourAreas.length; j++) {
                if (used[j]) continue;
                if (areConnected(group[0].boundingBox, contourAreas[j].boundingBox)) {
                    let largerBox = group[0].boundingBox;
                    let smallerBox = contourAreas[j].boundingBox;
                    group.push(contourAreas[j]);
                    used[j] = true;
                }
            }
            groupedContours.push(group);
        }

        console.log(groupedContours);

        // keet the largist one
        let maxContours = [];
        for (let group of groupedContours) {
            let maxContour = group.reduce((max, curr) => curr.area > max.area ? curr : max, group[0]);
            maxContours.push(maxContour);
        }

        // retaine similar area
        let filteredContours = [];
        let maxArea = maxContours[0]?.area || 0;
        let minAreaThreshold = maxArea * 0.1;


        for (let contour of contourAreas) {
            if (contour.area >= minAreaThreshold) {
                filteredContours.push(contour);
            }
        }
        
        let finalContours = [];

        for (let small of filteredContours) {
            for (let big of filteredContours) {
                if (small === big) {
                    continue;
                }

                if (!isInside(big, small)) {
                    console.log(big, small);
                    finalContours.push(small);
                }
            }
        }

        // output
        for (let contour of finalContours) {
            let approx = new cv.Mat();
            let c = contours.get(contour.index);
            cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c, true), true);

            if (approx.rows === 4) {
                let colour = new cv.Scalar(255, 0, 0, 255);
                cv.drawContours(mat, contours, contour.index, colour, 2, cv.LINE_8, hierarchy, 0);
            }

            approx.delete();
        }

        cv.imshow(outputCanvas, mat);
        
        mat.delete();
        gray.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
    },

    /**
     * Detect openings of an image based on user input
     * 
     * @param {HTMLElement} image 
     * @param {coordinate} markLT 
     * @param {coordinate} markRT 
     * @param {coordinate} markLB 
     * @param {coordinate} markRB
     * @return {array} rectangleList
     */
    manualDetectBlindOpenings(image, markLT, markRT, markLB, markRB) {

    }
}