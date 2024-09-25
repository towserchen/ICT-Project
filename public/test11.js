let imgElement = document.getElementById('srcImage'); // Gets the HTML element the source image will be loaded into 
let inputElement = document.getElementById('fileInput'); // Gets the HTML element used to input files

inputElement.addEventListener('change', (e) => { // Adds an event listener to the file input element and sets the source for the image element to the selected URL
    imgElement.src = URL.createObjectURL(e.target.files[0]);
}, false);

imgElement.onload = function() { // Function callback when the image is loaded
    let src = cv.imread(imgElement); // Load the image into a Mat object
    
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

    let allContours = cv.imread(imgElement);
    for (let i = 0; i < contours.size(); i++) {
        let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        cv.drawContours(allContours, contours, i, colour1, 2, cv.LINE_8);
    }

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

    console.log(sizeFilteredContours.size());
    console.log(approx.size());

    let contourCornerSpecs = [];

    let cornerFilteredContours = new cv.MatVector();

    for (let i = 0; i < sizeFilteredContours.size(); i++) {
        if((approx.get(i).rows === 5 || approx.get(i).rows === 4) && approxPrecise.get(i).rows < 10) {
            contourCornerSpecs.push(contourSizeSpecs[i]);
            cornerFilteredContours.push_back(sizeFilteredContours.get(i));
        }
    }

    console.log(cornerFilteredContours);

    function isContourClosed(contour, threshold = 10) {
        // Get the first and last points of the contour
        let firstPoint = contour.data32S.slice(0, 2);  // First point [x, y]
        let lastPoint = contour.data32S.slice(-2);     // Last point [x, y]
        console.log("first point", firstPoint);
        console.log("last point", lastPoint);
        
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
        console.log(toKeep);
        
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

    console.log(finalContours.get(0));

    for (let i = 0; i < finalContours.size(); i++) {
        let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);        
        cv.drawContours(src, finalContours, i, colour1, 2, cv.LINE_8);

        let contour = finalContours.get(i);
        let point = new cv.Point(contour.data32S[0], contour.data32S[1]);  // Get the x, y of the first point
        
        // Add text label (the index) near the contour
        cv.putText(src, i.toString(), point, cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(255, 255, 255, 255), 1);

        console.log('index:', i, cv.contourArea(contour), cv.arcLength(contour, false), contour);
        
        let approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.01 * cv.arcLength(sizeFilteredContours.get(i), false), false); // Approximate the contour with a polygon

        for (let i = 0; i < approx.rows; i++) {
            let color = new cv.Scalar(0, 0, 255, 255);  // blue color for the point
            let thickness = 1;  // Thickness of the circle
            let radius = 3;  // Radius of the circle

            // Draw a circle at (x, y) on the image
            cv.circle(src, new cv.Point(approx.data32S[i * 2], approx.data32S[(i * 2) + 1]), radius, color, thickness);
        }
    }

    function isBoundingBoxInside(boundingRectA, boundingRectB) {
        // boundingRectA should be inside boundingRectB
        return (
            boundingRectA.x >= boundingRectB.x &&
            boundingRectA.y >= boundingRectB.y &&
            boundingRectA.x + boundingRectA.width <= boundingRectB.x + boundingRectB.width &&
            boundingRectA.y + boundingRectA.height <= boundingRectB.y + boundingRectB.height
        );
    }
    
    function getContoursInsideWindow(matVector, windowContour) {
        let n = matVector.size();
        let windowBoundingRect = cv.boundingRect(windowContour);
    
        let insideContours = new cv.MatVector();  // List of contours that are inside the window
    
        // Iterate over all contours
        for (let i = 0; i < n; i++) {
    
            let contour = matVector.get(i);
            let boundingRect = cv.boundingRect(contour);

            // Skip the window contour itself
            if (cv.contourArea(contour) === cv.contourArea(windowContour)) {
                continue;  // Skip if it's the window contour
            }
    
            // Check if the current contour's bounding box is inside the window's bounding box
            if (isBoundingBoxInside(boundingRect, windowBoundingRect)) {
                insideContours.push_back(contour);  // Store the index of the contour inside the window
            }
        }
    
        return insideContours;
    }
    
    let contoursInsideWindow = getContoursInsideWindow(sizeFilteredContours, finalContours.get(0));

    let windowContours = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    cv.drawContours(windowContours, contoursInsideWindow, -1, new cv.Scalar(255,255,255,255), 0.5, cv.LINE_8);

    let gray2 = new cv.Mat();
    cv.cvtColor(windowContours, gray2, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale

    // Apply Hough Line Transform on the binary mask
    let lines = new cv.Mat();
    let rho = 1;         // Distance resolution in pixels
    let theta = Math.PI / 180; // Angle resolution in radians
    let threshold = 225;   // Minimum number of intersections to detect a line

    cv.HoughLines(gray2, lines, rho, theta, threshold);

    // Draw the detected lines
    for (let i = 0; i < lines.rows; i++) {
        let rho = lines.data32F[i * 2];  // Distance from the origin to the line
        let theta = lines.data32F[i * 2 + 1];  // Angle of the line

        // Convert polar coordinates to Cartesian coordinates to draw the line
        let a = Math.cos(theta);
        let b = Math.sin(theta);
        let x0 = a * rho;
        let y0 = b * rho;

        // Points for drawing the line
        let x1 = Math.round(x0 + 1000 * (-b));  // Line endpoint 1
        let y1 = Math.round(y0 + 1000 * (a));
        let x2 = Math.round(x0 - 1000 * (-b));  // Line endpoint 2
        let y2 = Math.round(y0 - 1000 * (a));

        // Draw the line on the image
        cv.line(windowContours, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0), 2);
    }


    let approxPolys = cv.imread(imgElement);
    for (let i = 0; i < approx.size(); ++i) {
        let colour = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        cv.drawContours(approxPolys, approx, i, colour, 1, 8, hierarchy, 0);
    }

    let justFilterContours = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3); // 3-channel black image (RGB)
    cv.drawContours(justFilterContours, sizeFilteredContours, -1, new cv.Scalar(255,255,255,255), 0.5, cv.LINE_8);

    cv.imshow('grayCanvas', gray); // Display the outputs
    cv.imshow('blurredCanvas', blurred);
    cv.imshow('edgesCanvas', edges);
    //cv.imshow('morphedCanvas', morphed);
    //cv.imshow('linesCanvas', lines);
    cv.imshow('contoursCanvas', allContours);
    cv.imshow('outputCanvas', src);
    cv.imshow('justFilteredContours', justFilterContours);
    cv.imshow('approxPolyCanvas', approxPolys);
    cv.imshow('windowContoursCanvas', windowContours);
}

window.Module = {
    onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
    }
};