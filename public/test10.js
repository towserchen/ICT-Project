document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const imgElement = document.getElementById('srcImage');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
  
    let clickPoints = []; // Store coordinates of clicks and box corners
  
    fileInput.addEventListener('change', (e) => {
      imgElement.src = URL.createObjectURL(e.target.files[0]); // Load the selected image
    }, false);
  
    imgElement.onload = function () {
        let src = cv.imread(imgElement); // Load the image into a Mat object
    
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale
    
        let blurred = new cv.Mat();
        let ksize = new cv.Size(7, 7);
        cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise
    
        let edges = new cv.Mat();
        cv.Canny(blurred, edges, 50, 250, 3, true); // Detect edges using Canny

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

        console.log(contourAreas);

        let filteredContours = new cv.MatVector();
        let minArea = 0;
        let minPerimeter = 300;
        for (let i = 0; i < contourAreas.length; i++) { // Loop over all contours
            let contour = contourAreas[i];

            if(contour.perimeter > minPerimeter && contour.area > minArea) {
                filteredContours.push_back(contours.get(contour.index));
                console.log(`Contour ${contour.index} area is ${contour.area}`);
                console.log(`Contour ${contour.index} perimeter is ${contour.perimeter}`);
            }
        }

        for (let i = 0; i < filteredContours.size(); i++) {
            let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
            cv.drawContours(src, filteredContours, i, colour1, 2, cv.LINE_8);
        }

        let justFilterContours = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3); // 3-channel black image (RGB)
        cv.drawContours(justFilterContours, filteredContours, -1, new cv.Scalar(255,255,255,255), 0.5, cv.LINE_8);

        let gray2 = new cv.Mat();
        cv.cvtColor(justFilterContours, gray2, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale 

        let lines = new cv.Mat();
        cv.HoughLines(gray2, lines, 1, Math.PI / 180, 150); // Apply the standard (non-probabilistic) Hough Line Transform
    
        // Store line parameters in an array
        let allLines = [];
        for (let i = 0; i < lines.rows; i++) {
            let rho = lines.data32F[i * 2];       // Distance from the origin
            let theta = lines.data32F[i * 2 + 1]; // Angle in radians
    
            allLines.push({ rho, theta });
        }
    
        // Display initial results on canvas
        cv.imshow('grayCanvas', gray);
        cv.imshow('blurredCanvas', blurred);
        cv.imshow('edgesCanvas', edges);
    
        src.delete();
        gray.delete();
        blurred.delete();
        edges.delete();
    
        // Set the image canvas size
        imageCanvas.width = imgElement.width;
        imageCanvas.height = imgElement.height;
        ctx.drawImage(imgElement, 0, 0); // Draw the image on the canvas
    
        // Add click functionality for box drawing
        imageCanvas.addEventListener('click', function (event) {
            const rect = imageCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
    
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
            };
            clickPoints.push(box);
    
            // Limit to the last 4 boxes
            if (clickPoints.length > 4) {
            clickPoints.shift(); // Remove the oldest point
            }
    
            // Redraw the image and all lingering boxes
            ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            ctx.drawImage(imgElement, 0, 0); // Redraw the image
    
            // Draw the boxes
            clickPoints.forEach((point) => {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(point.x, point.y, boxSize, boxSize);
            });
    
            // Filter the lines based on box intersections
            let filteredLines = allLines.filter((line) => doesLineIntersectTwoBoxes(line, clickPoints));
    
            // Draw the filtered lines on the canvas
            filteredLines.forEach((line) => drawLine(line, ctx, imageCanvas));
    
            console.log(`Coordinates clicked: (${x}, ${y})`);
        });
    
        // Function to check if a line intersects two boxes
        function doesLineIntersectTwoBoxes(line, boxes) {
            let intersections = 0;
            boxes.forEach((box) => {
            if (lineIntersectsBox(line, box)) {
                intersections++;
            }
            });
            return intersections >= 2; // Line must intersect at least two boxes
        }
    
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
        }
    
        // Function to check line-rectangle intersection
        function lineIntersectsRect(x1, y1, x2, y2, left, top, right, bottom) {
            // Check if the line crosses any of the four sides of the rectangle
            return (
            lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||  // Top edge
            lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) ||  // Bottom edge
            lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom) ||  // Left edge
            lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom)    // Right edge
            );
        }
    
        // Function to check if two lines intersect
        function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
            function ccw(px1, py1, px2, py2, px3, py3) {
            return (py3 - py1) * (px2 - px1) > (py2 - py1) * (px3 - px1);
            }
            return (
            ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
            ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
            );
        }
    
        // Function to draw a line on the canvas
        function drawLine(line, ctx, canvas) {
            let rho = line.rho;
            let theta = line.theta;
            let a = Math.cos(theta);
            let b = Math.sin(theta);
            let x0 = a * rho;
            let y0 = b * rho;
            let scale = 2500; // Extend the lines
    
            let x1 = Math.round(x0 + scale * (-b));
            let y1 = Math.round(y0 + scale * a);
            let x2 = Math.round(x0 - scale * (-b));
            let y2 = Math.round(y0 - scale * a);
    
            ctx.strokeStyle = "rgb(0, 255, 0)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    };
  
    window.Module = {
      onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
      },
    };
  });
  