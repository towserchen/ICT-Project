import cv from "@techstark/opencv-js"
import CanvasSlot from './canvasSlot'

let src = null;
  
// Function to get the bottom two boxes based on their vertical position (y-coordinate)
function getBottomTwoBoxes(boxes) {
    // Sort boxes by the y-coordinate (center of the box)
    let sortedBoxes = [...boxes].sort((a, b) => b.center.y - a.center.y);
    return sortedBoxes.slice(0, 2); // Return the two boxes with the largest y values
};

// Function to get the top two boxes based on their vertical position (y-coordinate)
function getTopTwoBoxes(boxes) {
    // Sort boxes by the y-coordinate (bottom of the box)
    let sortedBoxes = [...boxes].sort((a, b) => b.y - a.y);
    return sortedBoxes.slice(2, 4); // Return the two boxes with the lowest y values
};

// Function to process the bottom two boxes
function processBottomBoxes(bottomBoxes) {
    let srcCopy = src.clone();
    cv.cvtColor(srcCopy, srcCopy, cv.COLOR_RGBA2GRAY);
    let blank = new cv.Mat(srcCopy.rows, srcCopy.cols, cv.CV_8UC1, new cv.Scalar(0, 0, 0, 255)); // Black image

    for (let i = 0; i < bottomBoxes.length; i++){
        let x1 = bottomBoxes[i].topLeft.x;
        let y1 = bottomBoxes[i].topLeft.y;
        let x2 = bottomBoxes[i].bottomRight.x;
        let y2 = bottomBoxes[i].bottomRight.y;

        let roi = new cv.Rect(x1, y1, x2 - x1, y2 - y1);
        let srcRoi = srcCopy.roi(roi);

        let ksize = new cv.Size(7, 7)
        cv.GaussianBlur(srcRoi, srcRoi, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise and improve edge detection

        cv.Canny(srcRoi, srcRoi, 100, 250, 5, true);

        let blankRoi = blank.roi(roi); // Create the ROI on the blank image
        srcRoi.copyTo(blankRoi);       // Copy the ROI from the source to the corresponding blank region

        srcRoi.delete();
        roi.delete();
        blankRoi.delete();
    }
    
    // Perform Hough Line Transform
    let lines = new cv.Mat();
    cv.HoughLines(blank, lines, 1, Math.PI / 180, 30);

    console.log(lines);

    cv.cvtColor(blank, blank, cv.COLOR_GRAY2RGBA); // Not sure this is needed anymore

    // Define the center points of both bottom boxes
    let box1Center = {
        x: (bottomBoxes[0].topLeft.x + bottomBoxes[0].bottomRight.x) / 2,
        y: (bottomBoxes[0].topLeft.y + bottomBoxes[0].bottomRight.y) / 2
    };
    let box2Center = {
        x: (bottomBoxes[1].topLeft.x + bottomBoxes[1].bottomRight.x) / 2,
        y: (bottomBoxes[1].topLeft.y + bottomBoxes[1].bottomRight.y) / 2
    };

    // Filter the lines that go through both bottom boxes
    let filteredLines = [];
    for (let i = 0; i < lines.rows; i++) {
        let rho = lines.data32F[i * 2];
        let theta = lines.data32F[i * 2 + 1];
        let line = { rho, theta };

        if (doesLineIntersectTwoBoxes(line, bottomBoxes)) {
        filteredLines.push(line);
        }
    }

    let bestLine = null;
    let minTotalDifference = Infinity;  // Start with a high value

    // Loop through each line and calculate its y-value at the x-values of the two box centers
    for (let i = 0; i < filteredLines.length; i++) {
        let rho = filteredLines[i].rho;  // Distance from the origin to the line
        let theta = filteredLines[i].theta;  // Angle of the line

        // Calculate the y-value of the line for box1's and box2's center x-coordinates
        let yAtBox1Center = calculateYForX(rho, theta, box1Center.x);
        let yAtBox2Center = calculateYForX(rho, theta, box2Center.x);

        // Calculate the total difference between the line's y-values and the box centers' y-values
        let totalDifference = Math.abs(yAtBox1Center - box1Center.y) + Math.abs(yAtBox2Center - box2Center.y);

        // If this line has a smaller total difference, it's closer to both box centers
        if (totalDifference < minTotalDifference) {
            minTotalDifference = totalDifference;
            bestLine = { rho, theta };  // Keep track of the best line
        }
    }    

    // Clean up memory
    lines.delete();
    srcCopy.delete();
    blank.delete();

    return bestLine;
};

// Helper function to calculate the y-coordinate for a given x on the line
function calculateYForX(rho, theta, x) {
    let a = Math.cos(theta);
    let b = Math.sin(theta);
    let y = (rho - x * a) / b;
    return y;
};
  
// Function to check if a line intersects two boxes
function doesLineIntersectTwoBoxes(line, boxes) {
    let intersections = 0;
    boxes.forEach((box) => {
        if (lineIntersectsBox(line, box)) {
        intersections++;
        }
    });
    return intersections >= 2; // Line must intersect at least two boxes
};
  
// Function to check if a line intersects a single box
function lineIntersectsBox(line, box) {
    // Convert line's rho and theta to two points
    let rho = line.rho;
    let theta = line.theta;
    let a = Math.cos(theta);
    let b = Math.sin(theta);
    let x0 = a * rho;
    let y0 = b * rho;
    let scale = 2500; // Scale factor to extend the lines
  
    // Line points
    let x1 = Math.round(x0 + scale * (-b));
    let y1 = Math.round(y0 + scale * a);
    let x2 = Math.round(x0 - scale * (-b));
    let y2 = Math.round(y0 - scale * a);
  
    // Check if the line intersects the box
    return lineIntersectsRect(x1, y1, x2, y2, box.topLeft.x, box.topLeft.y, box.bottomRight.x, box.bottomRight.y);
};
  
// Function to check line-rectangle intersection
function lineIntersectsRect(x1, y1, x2, y2, left, top, right, bottom) {
    return (
      lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||  // Top edge
      lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) ||  // Bottom edge
      lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom) ||  // Left edge
      lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom)    // Right edge
    );
};
  
// Function to check if two lines intersect
function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    function ccw(px1, py1, px2, py2, px3, py3) {
      return (py3 - py1) * (px2 - px1) > (py2 - py1) * (px3 - px1);
    }
    return (
      ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
      ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
    );
};
  
// Function to find intersections between lines
function findLineIntersections(lines, boxes) {
    let intersections = [];
    for (let i = 0; i < lines.length - 1; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            let intersection = getLineIntersection(lines[i], lines[j]);
            if (intersection && boxes.some((box) => isPointInBox(intersection, box))) {
            intersections.push(intersection);
            }
        }
    }
    return intersections;
};
  
// Function to get the intersection of two lines (if exists)
function getLineIntersection(line1, line2) {
    let rho1 = line1.rho, theta1 = line1.theta;
    let rho2 = line2.rho, theta2 = line2.theta;
  
    let a1 = Math.cos(theta1), b1 = Math.sin(theta1);
    let a2 = Math.cos(theta2), b2 = Math.sin(theta2);
  
    let determinant = a1 * b2 - a2 * b1;
  
    if (Math.abs(determinant) < 1e-10) {
      return null; // Lines are parallel, no intersection
    }
  
    let x = (b2 * rho1 - b1 * rho2) / determinant;
    let y = (a1 * rho2 - a2 * rho1) / determinant;
  
    return { x, y };
};
  
// Function to check if a point is inside a box
function isPointInBox(point, box) {
    return (
        point.x >= box.topLeft.x &&
        point.x <= box.bottomRight.x &&
        point.y >= box.topLeft.y &&
        point.y <= box.bottomRight.y
    );
};

// Function to find the outermost intersections
function getOutermostIntersections(intersections, topBoxes, bottomBoxes) {
    if (intersections.length === 0) {
        return {
            topLeft: { x: 0, y: 0 },
            topRight: { x: 0, y: 0 },
            bottomLeft: { x: 0, y: 0 },
            bottomRight: { x: 0, y: 0 }
        };
    }

    let outermostIntersections = {
        topLeft: null,
        topRight: null,
        bottomLeft: null,
        bottomRight: null
    };

    intersections.forEach((point) => {
        if (isPointInBox(point, topBoxes[0])) {
            if (!outermostIntersections.topLeft || 
                (point.x <= outermostIntersections.topLeft.x && point.y <= outermostIntersections.topLeft.y)) {
            outermostIntersections.topLeft = point;
            }
        }
    
        if (isPointInBox(point, topBoxes[1])) {
            console.log(point);
            if (!outermostIntersections.topRight || 
                (point.x >= outermostIntersections.topRight.x - 1 && point.y <= outermostIntersections.topRight.y)) {
            outermostIntersections.topRight = point;
            }
        }
        
        if (isPointInBox(point, bottomBoxes[0])) {
            if (!outermostIntersections.bottomLeft || 
                (point.x <= outermostIntersections.bottomLeft.x && point.y >= outermostIntersections.bottomLeft.y)) {
            outermostIntersections.bottomLeft = point;
            }
        }
        
        if (isPointInBox(point, bottomBoxes[1])) {
            if (!outermostIntersections.bottomRight || 
                (point.x >= outermostIntersections.bottomRight.x && point.y >= outermostIntersections.bottomRight.y)) {
            outermostIntersections.bottomRight = point;
            }
        }
    });

    // If no valid intersection is found for any quadrant, set it to default {x: 0, y: 0}
    Object.keys(outermostIntersections).forEach(key => {
        if (!outermostIntersections[key]) {
            outermostIntersections[key] = { x: 0, y: 0 }; // Default if no intersection is found
        }
    });

    return outermostIntersections;
};


/**
 * Detect openings of an image based on user input
 * 
 * @param {userCoordinates} userCoordinates should be an array of form [x1, y1, x2, y2, x3, y3, x4, y4]
 * @return {Array} an array of form [x1, y1, x2, y2, x3, y3, x4, y4] representing the corner coordinates of a detected quad
 */
export function manualDetectBlindOpenings(userCoordinates) {
    let clickPoints = []; // Store coordinates of the 4 boxes
  
    // Parse user input to create boxes based on coordinates
    for (let i = 0; i < userCoordinates.length; i += 2) {
        let x = userCoordinates[i];
        let y = userCoordinates[i + 1];
    
        const boxSize = 50;
        const halfBox = boxSize / 2;
    
        // Store the click point and box boundaries
        let box = {
            x: x - halfBox,
            y: y - halfBox,
            width: boxSize,
            height: boxSize,
            topLeft: { x: x - halfBox, y: y - halfBox },
            bottomRight: { x: x + halfBox, y: y + halfBox },
            center: { x, y }
        };
    
        clickPoints.push(box);
    }
  
    // Detect edges and lines in the global src image
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert to grayscale
  
    let blurred = new cv.Mat();
    let ksize = new cv.Size(7, 7);
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur
  
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 250, 3, true); // Detect edges using Canny
  
    let lines = new cv.Mat();
    cv.HoughLines(edges, lines, 1, Math.PI / 180, 150); // Detect lines using Hough transform
  
    // Store line parameters
    let allLines = [];
    for (let i = 0; i < lines.rows; i++) {
      let rho = lines.data32F[i * 2];       // Distance from the origin
      let theta = lines.data32F[i * 2 + 1]; // Angle in radians
      allLines.push({ rho, theta });
    }

    // Identify the bottom two boxes by their y position
    let bottomBoxes = getBottomTwoBoxes(clickPoints);
    bottomBoxes = [...bottomBoxes].sort((a, b) => a.x - b.x);

    let topBoxes = getTopTwoBoxes(clickPoints);
    topBoxes = [...topBoxes].sort((a, b) => a.x - b.x);
  
    // Filter the lines based on box intersections
    let filteredLines = allLines.filter((line) => doesLineIntersectTwoBoxes(line, clickPoints));
    
    // process the bottom 2 boxes
    filteredLines.push(processBottomBoxes(bottomBoxes));

    // Detect intersections between filtered lines
    let intersections = findLineIntersections(filteredLines, clickPoints);
  
    let outermostIntersections = getOutermostIntersections(intersections, topBoxes, bottomBoxes);
      
    // Create an array to store the result: [x1, y1, x2, y2, ...]
    let result = [];

    // Add the outermost intersections to the result array
    result.push(
      outermostIntersections.topLeft.x, outermostIntersections.topLeft.y,
      outermostIntersections.topRight.x, outermostIntersections.topRight.y,
      outermostIntersections.bottomLeft.x, outermostIntersections.bottomLeft.y,
      outermostIntersections.bottomRight.x, outermostIntersections.bottomRight.y
    );
  
    // Clean up
    gray.delete();
    blurred.delete();
    edges.delete();
    lines.delete();
  
    // Return the result array
    return result;
};


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

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d'); // Draw the image onto the canvas
    ctx.drawImage(image, 0, 0);

    src = cv.imread(canvas); // Read the image from the canvas as a cv.Mat

    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale

    let blurred = new cv.Mat();
    let ksize = new cv.Size(7, 7)
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise and improve edge detection

    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 100, 250, 5, true); // Detect edges using Canny Algorithm

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // Find contours

    let contourSpecs = []; // area, perimeter etc.

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        let perimeter = cv.arcLength(contour, false);
        let boundingBox = cv.boundingRect(contour);
        contourSpecs.push({ index: i, area: area, boundingBox: boundingBox, perimeter: perimeter });
    }

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
        let distance = Math.sqrt(Math.pow(firstPoint[0] - lastPoint[0], 2) + 
                                 Math.pow(firstPoint[1] - lastPoint[1], 2));
        
        // Check if the distance is within the threshold (default 5 pixels)
        return distance <= threshold && cv.contourArea(contour) >= cv.arcLength(contour, false);
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

    let coordinates = []

    for (let i = 0; i < finalContours.size(); i++) {

        let contour = finalContours.get(i);
        
        let approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.01 * cv.arcLength(sizeFilteredContours.get(i), false), false); // Approximate the contour with a polygon

        temp = []
        for (let i = 0; i < approx.rows && i < 4; i++) {
            temp.push(approx.data32S[i * 2]);
            temp.push(approx.data32S[(i * 2) + 1])
        }

        coordinates.push(temp);
    }

    return coordinates;
};