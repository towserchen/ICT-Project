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

    let cornerContourImg = cv.imread(imgElement);
    let contourCornerSpecs = [];
    let cornerFilteredContours = new cv.MatVector();
    for (let i = 0; i < sizeFilteredContours.size(); i++) {
        if((approx.get(i).rows === 5 || approx.get(i).rows === 4) && approxPrecise.get(i).rows < 10) {

            // let poly = approxPrecise.get(i);
            // //console.log(poly);
            // let corners = extractQuadrilateralCorners(poly);
            
            // for (let j = 0; j < corners.length; j++) {
            //     let colour = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
            //     let thickness = 1;  // Thickness of the circle
            //     let radius = 4;  // Radius of the circle

            //     // Draw a circle at (x, y) on the image
            //     cv.circle(cornerContourImg, new cv.Point(corners[j].x, corners[j].y), radius, colour, thickness);
            // }

            // for (let j = 0; j < poly.rows; j++) {
            //     let colour = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
            //     let thickness = 1;  // Thickness of the circle
            //     let radius = 4;  // Radius of the circle

            //     // Draw a circle at (x, y) on the image
            //     cv.circle(cornerContourImg, new cv.Point(poly.data32S[j * 2], poly.data32S[(j * 2) + 1]), radius, colour, thickness);
            // }

            contourCornerSpecs.push(contourSizeSpecs[i]);
            cornerFilteredContours.push_back(sizeFilteredContours.get(i));
        }
    }

    function extractQuadrilateralCorners(contour, angleThreshold = 30, distanceThreshold = 25) { // NOTE: currently will return outer bound because of find extreme method
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
            console.log(angle);
            if (angle > angleThreshold) {
                corners.push(B);
            }
        }

        console.log("corners", corners);
    
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

        console.log("corner clusters", clusteredCorners);
    
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

        console.log("extreme points from index 2", findExtremePoint(clusteredCorners[2], 'bottom-left'));
    
        clusteredCorners.forEach(cluster => {
            const center = cluster.reduce(
                (acc, point) => ({
                    x: acc.x + point.x / cluster.length,
                    y: acc.y + point.y / cluster.length,
                }),
                { x: 0, y: 0 }
            );

            console.log("cluster center", center);
    
            // Compare and assign the cluster with the most extreme values to the respective corners
            if (center.x <= cornerPoints['top-left'].x && center.y <= cornerPoints['top-left'].y) { // Potentially dangerous comparing center and extreme points
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

        console.log("identified corners", cornerPoints);
    
        // Filter out any undefined points in case a corner wasn't detected
        return identifiedCorners.filter(point => point !== null);
    }

    for (let i = 0; i < cornerFilteredContours.size(); i++) {
        let colour = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);        
        cv.drawContours(cornerContourImg, cornerFilteredContours, i, colour, 2, cv.LINE_8);

        let contour = cornerFilteredContours.get(i);
        let point = new cv.Point(contour.data32S[0], contour.data32S[1]);  // Get the x, y of the first point
        
        // Add text label (the index) near the contour
        cv.putText(cornerContourImg, i.toString(), point, cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(255, 255, 255, 255), 1);
    }

    //console.log(cornerFilteredContours.size());

    function drawContourSlowly(contour, canvasId, delay = 50, colour, onComplete = () => {}) {
        let numPoints = contour.data32S.length / 2;  // Number of points in the contour
        let currentIndex = 0;
    
        // Get the canvas and create a Mat to draw on
        let img = cv.imread(imgElement);  // Read the current image from the canvas
        cv.imshow(canvasId, img);
    
        // Set up the interval to draw points
        let intervalId = setInterval(() => {
            if (currentIndex >= numPoints - 1) {
                clearInterval(intervalId);  // Stop the interval when all points are drawn
                return;
            }
    
            // Get the current point and the next point to draw a segment
            let point1 = contour.data32S.slice(currentIndex * 2, currentIndex * 2 + 2);
            let point2 = contour.data32S.slice((currentIndex + 1) * 2, (currentIndex + 1) * 2 + 2);
    
            // Draw the line segment on the image
            cv.line(img, new cv.Point(point1[0], point1[1]), new cv.Point(point2[0], point2[1]), colour, 2);
    
            // Show the updated image on the canvas
            cv.imshow(canvasId, img);
    
            currentIndex++;  // Move to the next point
        }, delay);  // Delay in milliseconds between drawing each line segment
    }

    let contour1 = cornerFilteredContours.get(2);
    let contour2 = cornerFilteredContours.get(3);

    // Draw the first contour, then the second one when it's complete
    // drawContourSlowly(contour1, 'drawContourCanvas', 500, new cv.Scalar(0, 255, 0, 255), () => {
    //     // When the first contour is complete, start drawing the second one
    //     drawContourSlowly(contour2, 'drawContourCanvas', 500, new cv.Scalar(255, 0, 0, 255));
    // });

    function isContourClosed(contour, threshold = 10) {
        // Get the first and last points of the contour
        let firstPoint = contour.data32S.slice(0, 2);  // First point [x, y]
        let lastPoint = contour.data32S.slice(-2);     // Last point [x, y]
    
        // Visualise points for debugging
        //cv.circle(cornerContourImg, new cv.Point(firstPoint[0], firstPoint[1]), 3, new cv.Scalar(255, 0, 0, 255), 1);
        //cv.circle(cornerContourImg, new cv.Point(lastPoint[0], lastPoint[1]), 3, new cv.Scalar(0, 255, 0, 255), 1);
    
        // Calculate the Euclidean distance between the first and last points
        let distance = Math.sqrt(
            Math.pow(firstPoint[0] - lastPoint[0], 2) + 
            Math.pow(firstPoint[1] - lastPoint[1], 2)
        );

        // console.log("First point:", firstPoint);
        // console.log("Last point:", lastPoint);
        // console.log("Distance between first and last point:", distance);

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

    //console.log(contourClosedSpecs.length);
    //console.log(closedContours.size());

    let closedContoursImg = cv.imread(imgElement);
    for (let i = 0; i < closedContours.size(); i++) {
        let colour = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);        
        cv.drawContours(closedContoursImg, closedContours, i, colour, 2, cv.LINE_8);

        let contour = closedContours.get(i);
        let point = new cv.Point(contour.data32S[0], contour.data32S[1]);  // Get the x, y of the first point
        
        // Add text label (the index) near the contour
        cv.putText(closedContoursImg, i.toString(), point, cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(255, 255, 255, 255), 1);
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
    
    function filterContours(matVector, contourClosedSpecs) { // By overlapping
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

    console.log(finalContours.size());

    for (let i = 0; i < finalContours.size(); i++) {
        let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);        
        cv.drawContours(src, finalContours, i, colour1, 2, cv.LINE_8);

        let contour = finalContours.get(i);
        let point = new cv.Point(contour.data32S[0], contour.data32S[1]);  // Get the x, y of the first point
        
        // Add text label (the index) near the contour
        cv.putText(src, i.toString(), point, cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(255, 255, 255, 255), 1);

        console.log('index:', i, cv.contourArea(contour), cv.arcLength(contour, false), contour);

        let approxPrecise = new cv.Mat();
        let poly = new cv.MatVector();
        cv.approxPolyDP(contour, approxPrecise, 0.0008 * cv.arcLength(sizeFilteredContours.get(i), false), false);
        poly.push_back(approxPrecise);
        
        let colour2 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        cv.drawContours(src, poly, -1, colour2, 1, cv.LINE_8);
        console.log("poly:", approxPrecise);

        for (let j = 0; j < approxPrecise.rows; j++) {
            let colour = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
            let thickness = 1;  // Thickness of the circle
            let radius = 4;  // Radius of the circle

            // Draw a circle at (x, y) on the image
            //cv.circle(src, new cv.Point(approxPrecise.data32S[j * 2], approxPrecise.data32S[(j * 2) + 1]), radius, colour, thickness);
            //console.log("poly:\nx:", approxPrecise.data32S[j * 2], " y:",approxPrecise.data32S[(j * 2) + 1]);
        }

        let corners = extractQuadrilateralCorners(approxPrecise);            
        for (let j = 0; j < corners.length; j++) {
            let colour = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
            let thickness = 1;  // Thickness of the circle
            let radius = 4;  // Radius of the circle

            // Draw a circle at (x, y) on the image
            cv.circle(src, new cv.Point(corners[j].x, corners[j].y), radius, colour, thickness);
        }
        
        // let approx = new cv.Mat();
        // cv.approxPolyDP(contour, approx, 0.01 * cv.arcLength(sizeFilteredContours.get(i), false), false); // Approximate the contour with a polygon

        // for (let i = 0; i < approx.rows; i++) {
        //     let color = new cv.Scalar(0, 0, 255, 255);  // blue color for the point
        //     let thickness = 1;  // Thickness of the circle
        //     let radius = 3;  // Radius of the circle

        //     // Draw a circle at (x, y) on the image
        //     cv.circle(src, new cv.Point(approx.data32S[i * 2], approx.data32S[(i * 2) + 1]), radius, color, thickness);
        // }
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
    
    //let contoursInsideWindow = getContoursInsideWindow(sizeFilteredContours, finalContours.get(0));

    let windowContours = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    //cv.drawContours(windowContours, contoursInsideWindow, -1, new cv.Scalar(255,255,255,255), 0.5, cv.LINE_8);

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

    let sizeFilterContoursImg = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3); // 3-channel black image (RGB)
    cv.drawContours(sizeFilterContoursImg, sizeFilteredContours, -1, new cv.Scalar(255,255,255,255), 0.5, cv.LINE_8);

    cv.imshow('grayCanvas', gray); // Display the outputs
    cv.imshow('blurredCanvas', blurred);
    cv.imshow('edgesCanvas', edges);
    //cv.imshow('morphedCanvas', morphed);
    //cv.imshow('linesCanvas', lines);
    cv.imshow('contoursCanvas', allContours);
    cv.imshow('outputCanvas', src);
    cv.imshow('sizeFilteredContours', sizeFilterContoursImg);
    cv.imshow('cornerFilteredContours', cornerContourImg)
    cv.imshow('closedFilteredContours', closedContoursImg);
    cv.imshow('approxPolyCanvas', approxPolys);
    cv.imshow('windowContoursCanvas', windowContours);
}

window.Module = {
    onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
    }
};