import cv from "@techstark/opencv-js"
import CanvasSlot from './canvasSlot'

/**
 * Detect opinings of an image
 * 
 * @param {HTMLElement} image 
 * @param {Array} canvasSlotList - A list of canvas, to show each detection step, can be []
 * @return {Array<Array<number>>} - A 2D array where each inner array represents the four corner coordinates of a quad
 */
export function autoDetectBlindOpenings(image, canvasSlotList = []) {
    let canvasSlot = null;

    if (canvasSlotList.length > 0) {
        canvasSlot = new CanvasSlot(canvasSlotList);
    }

    const imageDataToMat = (imageData) => {
        const mat = new cv.Mat(imageData.height, imageData.width, cv.CV_8UC4);
        mat.data.set(imageData.data);

        return mat;
    };

    console.log('1111');

    let src = imageDataToMat(image); // Read the image from the canvas as a cv.Mat

    console.log('2222');

    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale

    console.log('3333');

    let blurred = new cv.Mat();
    let ksize = new cv.Size(7, 7)
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise and improve edge detection

    console.log('4444');

    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 100, 250, 5, true); // Detect edges using Canny Algorithm

    console.log('5555');

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // Find contours

    console.log('66666');

    let contourSpecs = []; // area, perimeter etc.

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        let perimeter = cv.arcLength(contour, false);
        let boundingBox = cv.boundingRect(contour);
        contourSpecs.push({ index: i, area: area, boundingBox: boundingBox, perimeter: perimeter });
    }

    console.log('77777');

    // sort by area
    contourSpecs.sort((a, b) => b.area - a.area);

    let contourSizeSpecs = [];

    let sizeFilteredContours = new cv.MatVector();
    let minArea = 0;
    let minPerimeter = 300; // this should be a proportion of the photo size not a static arbitrary
    for (let i = 0; i < contourSpecs.length; i++) { // Loop over all contours
        let contour = contourSpecs[i];

        if(contour.perimeter > minPerimeter && contour.area > minArea) {
            contourSizeSpecs.push(contour);
            sizeFilteredContours.push_back(contours.get(contour.index));
        }
    }

    let approx = new cv.MatVector();
    let approxPrecise = new cv.MatVector();
    for (let i = 0; i < sizeFilteredContours.size(); i++) {
        let tmp1 = new cv.Mat();
        let tmp2 = new cv.Mat();
        cv.approxPolyDP(sizeFilteredContours.get(i), tmp1, 0.01 * cv.arcLength(sizeFilteredContours.get(i), false), false); // Approximate the contour with a polygon
        cv.approxPolyDP(sizeFilteredContours.get(i), tmp2, 0.002 * cv.arcLength(sizeFilteredContours.get(i), false), false);

        approx.push_back(tmp1);
        tmp1.delete();
        approxPrecise.push_back(tmp2);
        tmp2.delete();
    }

    let contourCornerSpecs = [];
    let cornerFilteredContours = new cv.MatVector();

    for (let i = 0; i < sizeFilteredContours.size(); i++) {
        if((approx.get(i).rows === 5 || approx.get(i).rows === 4) && approxPrecise.get(i).rows < 10) {
            contourCornerSpecs.push(contourSizeSpecs[i]);
            cornerFilteredContours.push_back(sizeFilteredContours.get(i));
        }
    }

    function isContourClosed(contour, threshold = 10) {
        // Get the first and last points of the contour
        let firstPoint = contour.data32S.slice(0, 2);  // First point [x, y]
        let lastPoint = contour.data32S.slice(-2);     // Last point [x, y]
    
        // Calculate the Euclidean distance between the first and last points
        let distance = Math.sqrt(
            Math.pow(firstPoint[0] - lastPoint[0], 2) + 
            Math.pow(firstPoint[1] - lastPoint[1], 2)
        );

        // Check if the distance is within the threshold (default 10 pixels)
        if (distance <= threshold && cv.contourArea(contour) >= cv.arcLength(contour, false)) {
            return true;  // The contour is considered closed
        }

        // If the distance is greater than the threshold, check for x or y coordinate match
        if ((firstPoint[0] === lastPoint[0] || firstPoint[1] === lastPoint[1]) && cv.contourArea(contour) >= cv.arcLength(contour, false)) {
            return true;  // The contour is considered closed if x or y coordinates match
        }

        // If neither condition is met, the contour is considered open
        return false;
    }
    
    let contourClosedSpecs = [];
    let closedContours = new cv.MatVector();
    for (let i = 0; i < cornerFilteredContours.size(); i++) {
        if(isContourClosed(cornerFilteredContours.get(i))) {
            contourClosedSpecs.push(contourCornerSpecs[i]);
            closedContours.push_back(cornerFilteredContours.get(i));
        }
    }

    function boundingBoxIntersect(rectA, rectB) {
        return !(rectA.x > rectB.x + rectB.width ||
                    rectA.x + rectA.width < rectB.x ||
                    rectA.y > rectB.y + rectB.height ||
                    rectA.y + rectA.height < rectB.y);
    }
    
    function pointProximityCheck(contourA, contourB, threshold = 1) {
        for (let i = 0; i < contourA.rows; i++) {
            let pointA = contourA.data32S.slice(i * 2, i * 2 + 2);  // Get point [x, y] from contourA
            for (let j = 0; j < contourB.rows; j++) {
                let pointB = contourB.data32S.slice(j * 2, j * 2 + 2);  // Get point [x, y] from contourB
                // Check if points are within the threshold (±1 for x or y)
                if (Math.abs(pointA[0] - pointB[0]) <= threshold && Math.abs(pointA[1] - pointB[1]) <= threshold) {
                    return true;  // Points are close enough
                }
            }
        }
        return false;  // No points are close enough
    }
    
    function filterContours(matVector, contourClosedSpecs) {
        let n = matVector.size();
        let toKeep = new cv.MatVector();
        let keptIndices = [];  // List to store the original indices of the kept contours
        let visited = new Array(n).fill(false);  // Track visited contours
    
        // Iterate over contours
        for (let i = 0; i < n; i++) {
            if (visited[i]) continue;
            
            let contourA = matVector.get(i);
            let boundingRectA = cv.boundingRect(contourA);
            visited[i] = true;
            let collisionGroup = [contourA];
            let collisionGroupIndices = [contourClosedSpecs[i].index];  // Start with the current index
    
            // Check for nearby or colliding contours
            for (let j = i + 1; j < n; j++) {
                if (visited[j]) continue;
                
                let contourB = matVector.get(j);
                let boundingRectB = cv.boundingRect(contourB);
    
                // Check if bounding boxes intersect
                if (boundingBoxIntersect(boundingRectA, boundingRectB)) {
                    // If bounding boxes intersect, check point proximity
                    if (pointProximityCheck(contourA, contourB)) {
                        collisionGroup.push(contourB);
                        collisionGroupIndices.push(contourClosedSpecs[j].index);  // Record the original index
                        visited[j] = true;
                    }
                }
            }
    
            // Keep the largest contour from the collision group
            if (collisionGroup.length > 1) {
                let largestContour = findLargestContour(collisionGroup);
                toKeep.push_back(largestContour);
    
                // Find the index of the largest contour in the collision group and store it
                let largestIndex = findLargestContourIndex(collisionGroup, collisionGroupIndices, matVector);
                keptIndices.push(largestIndex);  // Store the original index
            } else {
                toKeep.push_back(contourA);  // No collision, keep this contour
                keptIndices.push(contourClosedSpecs[i].index);  // Store the original index
            }
        }
        
        let returns = [toKeep, keptIndices];
        return returns;
    }
    
    // Helper function to find the index of the largest contour in the collision group
    function findLargestContourIndex(collisionGroup, collisionGroupIndices, matVector) {
        let largestArea = 0;
        let largestIndex = -1;
    
        for (let i = 0; i < collisionGroup.length; i++) {
            let area = cv.contourArea(collisionGroup[i]);
            if (area > largestArea) {
                largestArea = area;
                largestIndex = collisionGroupIndices[i];  // Get the corresponding original index
            }
        }
    
        return largestIndex;
    }
    
    // Helper function to find the largest contour by area
    function findLargestContour(group) {
        let largestContour = group[0];
        let largestArea = cv.contourArea(largestContour);
        
        for (let i = 1; i < group.length; i++) {
            let area = cv.contourArea(group[i]);
            if (area > largestArea) {
                largestArea = area;
                largestContour = group[i];
            }
        }
        return largestContour;
    }


    let temp = filterContours(closedContours, contourClosedSpecs);
    let finalContours = temp[0];
    let finalIndices = temp[1];

    function extractQuadrilateralCorners(contour, angleThreshold = 30, distanceThreshold = 25) {
        const points = contour.data32S;
        const corners = [];
    
        // Convert the contour points into an array of {x, y}
        const contourPoints = [];
        for (let i = 0; i < points.length; i += 2) {
            contourPoints.push({ x: points[i], y: points[i + 1] });
        }
    
        // Helper function to calculate angle between three points (A-B-C)
        function calculateAngle(A, B, C) {
            const AB = { x: B.x - A.x, y: B.y - A.y };
            const BC = { x: C.x - B.x, y: C.y - B.y };
            const dotProduct = AB.x * BC.x + AB.y * BC.y;
            const magnitudeAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
            const magnitudeBC = Math.sqrt(BC.x * BC.x + BC.y * BC.y);
            const angle = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
            return (angle * 180) / Math.PI; // Convert to degrees
        }
    
        // Detect potential corners based on the angle threshold
        for (let i = 0; i < contourPoints.length; i++) {
            const A = contourPoints[(i - 1 + contourPoints.length) % contourPoints.length];
            const B = contourPoints[i];
            const C = contourPoints[(i + 1) % contourPoints.length];
    
            const angle = calculateAngle(A, B, C);
            if (angle > angleThreshold) {
                corners.push(B);
            }
        }
    
        // Cluster nearby points using the distance threshold and classify them
        const clusteredCorners = [];
        const visited = new Array(corners.length).fill(false);
    
        function distance(point1, point2) {
            return Math.sqrt(
                Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
            );
        }
    
        for (let i = 0; i < corners.length; i++) {
            if (visited[i]) continue;
    
            const cluster = [corners[i]];
            visited[i] = true;
    
            for (let j = i + 1; j < corners.length; j++) {
                if (!visited[j] && distance(corners[i], corners[j]) < distanceThreshold) {
                    cluster.push(corners[j]);
                    visited[j] = true;
                }
            }
    
            clusteredCorners.push(cluster);
        }
    
        // Function to find the most extreme point for a given cluster and corner type
        function findExtremePoint(cluster, type) {
            if (type === 'top-left') {
                let extreme = {x: Infinity, y: Infinity};
                for (let i = 0; i < cluster.length; i++) {
                    if (cluster[i].x < extreme.x) {
                        extreme.x = cluster[i].x;
                    }
                    if (cluster[i].y < extreme.y) {
                        extreme.y = cluster[i].y;
                    }
                }
                return extreme;
            } else if (type === 'top-right') {
                let extreme = {x: -Infinity, y: Infinity};
                for (let i = 0; i < cluster.length; i++) {
                    if (cluster[i].x > extreme.x) {
                        extreme.x = cluster[i].x;
                    }
                    if (cluster[i].y < extreme.y) {
                        extreme.y = cluster[i].y;
                    }
                }
                return extreme;
            } else if (type === 'bottom-left') {
                let extreme = {x: Infinity, y: -Infinity};
                for (let i = 0; i < cluster.length; i++) {
                    if (cluster[i].x < extreme.x) {
                        extreme.x = cluster[i].x;
                    }
                    if (cluster[i].y > extreme.y) {
                        extreme.y = cluster[i].y;
                    }
                }
                return extreme;
            } else if (type === 'bottom-right') {
                let extreme = {x: -Infinity, y: -Infinity};
                for (let i = 0; i < cluster.length; i++) {
                    if (cluster[i].x > extreme.x) {
                        extreme.x = cluster[i].x;
                    }
                    if (cluster[i].y > extreme.y) {
                        extreme.y = cluster[i].y;
                    }
                }
                return extreme;
            }
        }
    
        // Classify clusters into each corner type and find the extreme point for each
        const cornerPoints = {
            'top-left': { x: Infinity, y: Infinity },
            'top-right': { x: -Infinity, y: Infinity },
            'bottom-left': { x: Infinity, y: -Infinity },
            'bottom-right': { x: -Infinity, y: -Infinity },
        };
    
        clusteredCorners.forEach(cluster => {
            const center = cluster.reduce(
                (acc, point) => ({
                    x: acc.x + point.x / cluster.length,
                    y: acc.y + point.y / cluster.length,
                }),
                { x: 0, y: 0 }
            );
    
            // Compare and assign the cluster with the most extreme values to the respective corners
            if (center.x <= cornerPoints['top-left'].x && center.y <= cornerPoints['top-left'].y) {
                cornerPoints['top-left'] = findExtremePoint(cluster, 'top-left');
            } else if (center.x + center.y < cornerPoints['top-left'].x + cornerPoints['top-left'].y) {
                cornerPoints['top-left'] = findExtremePoint(cluster, 'top-left');
            }
            if (center.x >= cornerPoints['top-right'].x && center.y <= cornerPoints['top-right'].y) {
                cornerPoints['top-right'] = findExtremePoint(cluster, 'top-right');
            } else if (center.x - center.y > cornerPoints['top-right'].x - cornerPoints['top-right'].y) {
                cornerPoints['top-right'] = findExtremePoint(cluster, 'top-right');
            }
            if (center.x <= cornerPoints['bottom-left'].x && center.y >= cornerPoints['bottom-left'].y) {
                cornerPoints['bottom-left'] = findExtremePoint(cluster, 'bottom-left');
            } else if (center.y - center.x > cornerPoints['bottom-left'].y - cornerPoints['bottom-left'].x) {
                cornerPoints['bottom-left'] = findExtremePoint(cluster, 'bottom-left');
            }
            if (center.x >= cornerPoints['bottom-right'].x && center.y >= cornerPoints['bottom-right'].y) {
                cornerPoints['bottom-right'] = findExtremePoint(cluster, 'bottom-right');
            } else if (center.x + center.y > cornerPoints['bottom-right'].x + cornerPoints['bottom-right'].y) {
                cornerPoints['bottom-right'] = findExtremePoint(cluster, 'bottom-right');
            }
        });
    
        // Extract the identified corner points
        const identifiedCorners = [
            cornerPoints['top-left'],
            cornerPoints['top-right'],
            cornerPoints['bottom-left'],
            cornerPoints['bottom-right']
        ];
    
        // Filter out any undefined points in case a corner wasn't detected
        return identifiedCorners.filter(point => point !== null);
    }

    let coordinates = []

    for (let i = 0; i < approxPrecise.size(); i++) {
        approxPrecise.get(i).delete();
    }

    approxPrecise.delete();

    for (let i = 0; i < finalContours.size(); i++) {
        let contour = finalContours.get(i);
        let anotherApproxPrecise = new cv.Mat();
        cv.approxPolyDP(contour, anotherApproxPrecise, 0.0008 * cv.arcLength(sizeFilteredContours.get(i), false), false); // Approximate the contour with a polygon
        let corners = extractQuadrilateralCorners(anotherApproxPrecise);
        temp = []
        for (let j = 0; j < corners.length; j++) {
            temp.push(corners[j].x);
            temp.push(corners[j].y);
        }

        coordinates.push(temp);

        anotherApproxPrecise.delete();
    }

    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    hierarchy.delete();
    contours.delete();
    sizeFilteredContours.delete();

    for (let i = 0; i < approx.size(); i++) {
        approx.get(i).delete();
    }

    approx.delete();

    return coordinates;
};