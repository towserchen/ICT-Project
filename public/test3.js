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
    //cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    //cv.bilateralFilter(src, blurred, 9, 75, 75, cv.BORDER_DEFAULT); // Apply bilateral filter to reducd noise and improve edge detection
    
    let edges = new cv.Mat();
    //cv.Canny(blurred, edges, 50, 250, 3, true); // Detect edges using Canny Algorithum
    cv.Canny(blurred, edges, 100, 250, 5, true);

    let morphed = new cv.Mat();
    //const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)); // creates a rectangular structuring element to be used as a kernel
    //cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel); // Preforms morphological operation

    // cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 25, 100, 10); // Apply the Hough Line Transform to detect lines
    
    // for (let i = 0; i < lines.rows; i++) { // Draw the detected lines on the image
    //     let x1 = lines.data32S[i * 4];
    //     let y1 = lines.data32S[i * 4 + 1];
    //     let x2 = lines.data32S[i * 4 + 2];
    //     let y2 = lines.data32S[i * 4 + 3];
    //     cv.line(src, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0, 255), 2, cv.LINE_AA);
    // }

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // Find contours

    let allContours = cv.imread(imgElement);
    for (let i = 0; i < contours.size(); i++) {
        let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        cv.drawContours(allContours, contours, i, colour1, 2, cv.LINE_8);
    }

    // area and edges
    let contourAreas = [];

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        let perimeter = cv.arcLength(contour, false);
        let boundingBox = cv.boundingRect(contour);
        contourAreas.push({ index: i, area: area, boundingBox: boundingBox, perimeter: perimeter });
    }

    // sort by areas
    contourAreas.sort((a, b) => b.perimeter - a.perimeter);

    //console.log(contourAreas);

    let filteredContours = new cv.MatVector();
    let minArea = 0;
    let minPerimeter = 300;
    for (let i = 0; i < contourAreas.length; i++) { // Loop over all contours
        let contour = contourAreas[i];

        if(contour.perimeter > minPerimeter && contour.area > minArea) {
            filteredContours.push_back(contours.get(contour.index));
            //console.log(`Contour ${contour.index} area is ${contour.area}`);
            //console.log(`Contour ${contour.index} perimeter is ${contour.perimeter}`);
        }
    }

    let n = filteredContours.size();
    let toKeep = new cv.MatVector();  // Contours to keep in the final result
    let visited = new Array(n).fill(false);  // Track whether a contour has been processed
    
    // Function to find the largest contour from a group
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

    // whether there are contours connected
    function areConnected(box1, box2) {
        return !(box1.x + box1.width < box2.x || 
                 box2.x + box2.width < box1.x || 
                 box1.y + box1.height < box2.y || 
                 box2.y + box2.height < box1.y);
    }

    // Iterate over all contours
    for (let i = 0; i < n; i++) {
        if (visited[i]) continue;  // Skip already processed contours
        
        let contourA = filteredContours.get(i);
        let boundingRectA = cv.boundingRect(contourA);
        let collisionGroup = [contourA];
        visited[i] = true;
        
        // Check for collisions with other contours
        for (let j = i + 1; j < n; j++) {
            if (visited[j]) continue;
            
            let contourB = filteredContours.get(j);
            let boundingRectB = cv.boundingRect(contourB);
            
            // Check if contourA and contourB's bounding boxes collide
            if (areConnected(boundingRectA, boundingRectB)) {
                collisionGroup.push(contourB);
                visited[j] = true;
            }
        }

        // If there are collisions, keep the largest contour
        if (collisionGroup.length > 1) {
            let largestContour = findLargestContour(collisionGroup);
            toKeep.push_back(largestContour);
        } else {
            // No collisions, keep the contour as it is
            toKeep.push_back(contourA);
        }
    }

    let approx = new cv.MatVector();
    let approxPrecise = new cv.MatVector();
    for (let i = 0; i < toKeep.size(); i++) {
        let tmp1 = new cv.Mat();
        let tmp2 = new cv.Mat();
        cv.approxPolyDP(toKeep.get(i), tmp1, 0.01 * cv.arcLength(toKeep.get(i), false), false); // Approximate the contour with a polygon
        cv.approxPolyDP(toKeep.get(i), tmp2, 0.002 * cv.arcLength(toKeep.get(i), false), false);

        approx.push_back(tmp1);
        tmp1.delete();
        approxPrecise.push_back(tmp2);
        tmp2.delete();
    }

    console.log(toKeep.size());
    console.log(approx.size());

    for (let i = 0; i < toKeep.size(); i++) {
        let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        //console.log(approx.get(i).rows);
        if((approx.get(i).rows === 5 || approx.get(i).rows === 4) && approxPrecise.get(i).rows < 10) {
            cv.drawContours(src, toKeep, i, colour1, 2, cv.LINE_8);

            let contour = toKeep.get(i);
            let point = new cv.Point(contour.data32S[0], contour.data32S[1]);  // Get the x, y of the first point

            let approxPre = approxPrecise.get(i);
            
            // Add text label (the index) near the contour
            cv.putText(src, i.toString(), point, cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(255, 255, 255, 255), 1);

            console.log('index:', i, ' ', contour);
            console.log(approxPre);

            for (let i = 0; i < approxPre.rows; i++) {
                let color = new cv.Scalar(0, 0, 255, 255);  // blue color for the point
                let thickness = 1;  // Thickness of the circle
                let radius = 3;  // Radius of the circle

                // Draw a circle at (x, y) on the image
                cv.circle(src, new cv.Point(approxPre.data32S[i * 2], approxPre.data32S[(i * 2) + 1]), radius, color, thickness);
            }

            let corners = [];
            let threshold = 45;
            
            for (let i = 1; i < approxPre.rows - 1; i++) {
                let prev = [approxPre.data32S[(i * 2) - 2], approxPre.data32S[(i * 2) - 1]];
                let current = [approxPre.data32S[(i * 2)], approxPre.data32S[(i * 2) + 1]];
                let next = [approxPre.data32S[(i * 2) + 2], approxPre.data32S[(i * 2) + 3]];

                //console.log('p', prev, 'c', current, 'n', next);

                let angle = getAngle(prev, current, next);

                console.log(angle);

                //if (Math.abs(angle) > threshold) {
                //    corners.push(current);  // Mark this as a corner
                //}
            }

            // let stepSize = 2;

            // for (let i = 1 + stepSize; i < contour.rows - 1; i++) {
            //     let prev = [contour.data32S[(i * 2) - (stepSize + 2)], contour.data32S[(i * 2) - (stepSize + 1)]];
            //     let current = [contour.data32S[(i * 2)], contour.data32S[(i * 2)+1]];
            //     let next = [contour.data32S[(i * 2) + (stepSize + 2)], contour.data32S[(i * 2) + (stepSize + 3)]];

            //     //console.log('p', prev, 'c', current, 'n', next);

            //     let angle = getAngle(prev, current, next);

            //     //console.log(angle);

            //     //if (Math.abs(angle) > threshold) {
            //     //    corners.push(current);  // Mark this as a corner
            //     //}
            // }
        }
    }

    function getAngle(p1, p2, p3) {
        // Vector from p1 to p2
        let v1_x = p2[0] - p1[0];
        let v1_y = p2[1] - p1[1];
        
        // Vector from p2 to p3
        let v2_x = p3[0] - p2[0];
        let v2_y = p3[1] - p2[1];
        
        // Calculate dot product of v1 and v2
        let dotProduct = v1_x * v2_x + v1_y * v2_y;
        
        // Calculate magnitudes (lengths) of v1 and v2
        let magV1 = Math.sqrt(v1_x * v1_x + v1_y * v1_y);
        let magV2 = Math.sqrt(v2_x * v2_x + v2_y * v2_y);
        
        // Calculate cosine of the angle between the vectors
        let cosTheta = dotProduct / (magV1 * magV2);
        
        // Ensure cosTheta is in the range [-1, 1] to avoid errors due to floating-point precision
        cosTheta = Math.max(-1, Math.min(1, cosTheta));
        
        // Calculate the angle in radians
        let angle = Math.acos(cosTheta);

        let angleDegrees = angle * (180 / Math.PI);
        
        return angleDegrees;  // Angle in degrees
    }

    let approxPolys = cv.imread(imgElement);
    for (let i = 0; i < approx.size(); ++i) {
        let colour = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        cv.drawContours(approxPolys, approx, i, colour, 1, 8, hierarchy, 0);
    }

    let justFilterContours = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3); // 3-channel black image (RGB)
    cv.drawContours(justFilterContours, filteredContours, -1, new cv.Scalar(255,255,255,255), 0.5, cv.LINE_8);

    let gray2 = new cv.Mat();
    cv.cvtColor(justFilterContours, gray2, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale

    let edges2 = new cv.Mat();
    //cv.Canny(gray2, edges2, 50, 250, 3, true); // Detect edges using Canny Algorithum

    let lines = new cv.Mat();
    cv.HoughLines(gray2, lines, 1, Math.PI / 180, 150); // Apply the standard (non-probabilistic) Hough Line Transform

    for (let i = 0; i < lines.rows; i++) { // Draw the detected lines on the image
        let rho = lines.data32F[i * 2];       // Distance from the origin
        let theta = lines.data32F[i * 2 + 1]; // Angle in radians

        let a = Math.cos(theta);
        let b = Math.sin(theta);
        let x0 = a * rho;
        let y0 = b * rho;

        // Draw the origin point
        //cv.circle(src, new cv.Point(Math.round(x0), Math.round(y0)), 5, new cv.Scalar(0, 0, 255, 255), -1); // Blue dot for the origin

        let scale = 2500; // Extend the lines across the image
        let x1 = Math.round(x0 + scale * (-b));
        let y1 = Math.round(y0 + scale * (a));
        let x2 = Math.round(x0 - scale * (-b));
        let y2 = Math.round(y0 - scale * (a));

        //cv.line(src, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0, 255), 2, cv.LINE_AA);
    }

    cv.imshow('grayCanvas', gray); // Display the outputs
    cv.imshow('blurredCanvas', blurred);
    cv.imshow('edgesCanvas', edges);
    //cv.imshow('morphedCanvas', morphed);
    //cv.imshow('linesCanvas', lines);
    cv.imshow('contoursCanvas', allContours);
    cv.imshow('outputCanvas', src);
    cv.imshow('justFilteredContours', justFilterContours);
    cv.imshow('approxPolyCanvas', approxPolys);
    //cv.imshow('edges2canvas', edges2);

    src.delete(); // Clean up
    gray.delete();
    blurred.delete();
    edges.delete();
    morphed.delete();
    lines.delete();
    contours.delete();
    allContours.delete();
    hierarchy.delete();
};

window.Module = {
    onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
    }
};