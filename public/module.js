function loadImageFromURL(url, callback) {
    let img = new Image();
    img.crossOrigin = "Anonymous";  // Prevent CORS issues when fetching the image

    img.onload = function () {
        callback(img);
    };

    img.src = url;
}

// Call the function after OpenCV is ready
window.onload = function() {
    cv['onRuntimeInitialized'] = () => {
        // Load the image from a URL
        let imageUrl = '/sample/1.jpg';  // Replace with your image URL
        loadImageFromURL(imageUrl, (img) => {
            // Process the image after it has been loaded
            console.log(autoDetectBlindOpenings(img));
        });
    };
};

// EVERYTHING ABOVE IS FOR TESTING ONLY

let src = undefined;

function autoDetectBlindOpenings(image) {
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

    //console.log(sizeFilteredContours.size());
    //console.log(approx.size());

    let contourCornerSpecs = [];

    let cornerFilteredContours = new cv.MatVector();

    for (let i = 0; i < sizeFilteredContours.size(); i++) {
        if((approx.get(i).rows === 5 || approx.get(i).rows === 4) && approxPrecise.get(i).rows < 10) {
            contourCornerSpecs.push(contourSizeSpecs[i]);
            cornerFilteredContours.push_back(sizeFilteredContours.get(i));
        }
    }

    //console.log(cornerFilteredContours);

    function isContourClosed(contour, threshold = 10) {
        // Get the first and last points of the contour
        let firstPoint = contour.data32S.slice(0, 2);  // First point [x, y]
        let lastPoint = contour.data32S.slice(-2);     // Last point [x, y]
        //console.log("first point", firstPoint);
        //console.log("last point", lastPoint);
        
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
        //console.log(toKeep);
        
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

    console.log(finalContours.size());

    let coordinates = []

    for (let i = 0; i < finalContours.size(); i++) {

        let contour = finalContours.get(i);

        //console.log('index:', i, cv.contourArea(contour), cv.arcLength(contour, false), contour);
        
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

function manualDetectBlindOpenings(userCoordinates) {
    // userCoordinates should be an array of form [x1, y1, x2, y2, x3, y3, x4, y4]
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
  
    // Detect edges and lines in the global src image using OpenCV
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
  
    // Filter the lines based on box intersections
    let filteredLines = allLines.filter((line) => doesLineIntersectTwoBoxes(line, clickPoints));
  
    // Detect intersections between filtered lines
    let intersections = findLineIntersections(filteredLines);
  
    // Get the top-left and top-right intersections
    let topLeft = getTopLeftIntersection(intersections);
    let topRight = getTopRightIntersection(intersections);
  
    // Get the bottom two boxes based on their vertical position (y-coordinate)
    let bottomBoxes = getBottomTwoBoxes(clickPoints);
  
    // Create an array to store the result: [x1, y1, x2, y2, ...] for intersections and bottom box centers
    let result = [];
  
    // Add the top-left and top-right intersection points to the result array
    if (topLeft) {
      result.push(topLeft.x, topLeft.y);
    }
    if (topRight) {
      result.push(topRight.x, topRight.y);
    }
  
    // Add the center points of the bottom two boxes to the result array
    bottomBoxes.forEach((box) => {
      result.push(box.center.x, box.center.y);
    });
  
    // Clean up
    gray.delete();
    blurred.delete();
    edges.delete();
    lines.delete();
  
    // Return the result array
    return result;
};
  
// Function to get the bottom two boxes based on their vertical position (y-coordinate)
function getBottomTwoBoxes(boxes) {
    // Sort boxes by the y-coordinate (center of the box)
    let sortedBoxes = [...boxes].sort((a, b) => b.center.y - a.center.y);
    return sortedBoxes.slice(0, 2); // Return the two boxes with the largest y values
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
function findLineIntersections(lines) {
    let intersections = [];
    for (let i = 0; i < lines.length - 1; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            let intersection = getLineIntersection(lines[i], lines[j]);
            if (intersection) {
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
  
// Function to get the top-left intersection (smallest x and y)
function getTopLeftIntersection(intersections) {
    if (intersections.length === 0) return null;
    return intersections.reduce((topLeft, current) => {
        if (current.x < topLeft.x && current.y < topLeft.y) {
            return current;
        }
        return topLeft;
    }, intersections[0]);
};
  
// Function to get the top-right intersection (largest x, smallest y)
function getTopRightIntersection(intersections) {
    if (intersections.length === 0) return null;
    return intersections.reduce((topRight, current) => {
        if (current.x > topRight.x && current.y < topRight.y) {
            return current;
        }
        return topRight;
    }, intersections[0]);
};
  