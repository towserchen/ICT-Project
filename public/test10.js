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
  
      let lines = new cv.Mat();
      cv.HoughLines(edges, lines, 1, Math.PI / 180, 150); // Apply the standard Hough Line Transform
  
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
  
        // Identify the bottom two boxes by their y position
        let bottomBoxes = getBottomTwoBoxes(clickPoints);
  
        // Redraw the image and all lingering boxes
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        ctx.drawImage(imgElement, 0, 0); // Redraw the image
  
        // Draw the boxes and highlight the bottom two
        clickPoints.forEach((point) => {
          ctx.strokeStyle = bottomBoxes.includes(point) ? 'blue' : 'red'; // Highlight bottom boxes in blue
          ctx.lineWidth = 2;
          ctx.strokeRect(point.x, point.y, boxSize, boxSize);
        });
  
        console.log(`Coordinates clicked: (${x}, ${y})`);
  
        // If there are 4 boxes, process the bottom 2 boxes
        if (clickPoints.length === 4) {
          processBottomBoxes(bottomBoxes);
        }
  
        // Filter the lines based on box intersections
        let filteredLines = allLines.filter((line) => doesLineIntersectTwoBoxes(line, clickPoints));
  
        // Draw the filtered lines on the canvas
        filteredLines.forEach((line) => drawLine(line, ctx, imageCanvas));
  
        // Detect intersections between filtered lines
        let intersections = findLineIntersections(filteredLines);
  
        // Draw circles at the intersection points
        intersections.forEach((intersection) => {
          drawCircle(intersection.x, intersection.y, ctx);
        });
      });
  
      // Function to get the bottom two boxes based on their vertical position (y-coordinate)
      function getBottomTwoBoxes(boxes) {
        // Sort boxes by the y-coordinate (bottom of the box)
        let sortedBoxes = [...boxes].sort((a, b) => b.y - a.y);
        return sortedBoxes.slice(0, 2); // Return the two boxes with the largest y values
      }
  
      // Function to process the bottom two boxes
      function processBottomBoxes(bottomBoxes) {
        let x1 = Math.min(bottomBoxes[0].topLeft.x, bottomBoxes[1].topLeft.x);
        let y1 = Math.min(bottomBoxes[0].topLeft.y, bottomBoxes[1].topLeft.y);
        let x2 = Math.max(bottomBoxes[0].bottomRight.x, bottomBoxes[1].bottomRight.x);
        let y2 = Math.max(bottomBoxes[0].bottomRight.y, bottomBoxes[1].bottomRight.y);
  
        // Extract the region covered by the bottom boxes
        let src = cv.imread(imgElement);
        let roi = src.roi(new cv.Rect(x1, y1, x2 - x1, y2 - y1));
  
        // Convert to grayscale
        let grayRoi = new cv.Mat();
        cv.cvtColor(roi, grayRoi, cv.COLOR_RGBA2GRAY, 0);
  
        // Apply edge detection
        let edgesRoi = new cv.Mat();
        cv.Canny(grayRoi, edgesRoi, 50, 250, 3, true);
  
        // Perform Hough Line Transform
        let linesRoi = new cv.Mat();
        cv.HoughLines(edgesRoi, linesRoi, 1, Math.PI / 180, 150);
  
        // Filter the lines that go through both bottom boxes
        let filteredLinesRoi = [];
        for (let i = 0; i < linesRoi.rows; i++) {
          let rho = linesRoi.data32F[i * 2];
          let theta = linesRoi.data32F[i * 2 + 1];
          let line = { rho, theta };
  
          if (doesLineIntersectTwoBoxes(line, bottomBoxes)) {
            filteredLinesRoi.push(line);
          }
        }
  
        // Draw the filtered lines on the original image canvas
        filteredLinesRoi.forEach((line) => drawLineOnOriginalImage(line, x1, y1, ctx));
  
        // Clean up OpenCV Mats
        roi.delete();
        grayRoi.delete();
        edgesRoi.delete();
        linesRoi.delete();
      }
  
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
  
      // Function to draw a line on the original image canvas
      function drawLineOnOriginalImage(line, offsetX, offsetY, ctx) {
        let rho = line.rho;
        let theta = line.theta;
        let a = Math.cos(theta);
        let b = Math.sin(theta);
        let x0 = a * rho;
        let y0 = b * rho;
        let scale = 2500; // Extend the lines
  
        let x1 = Math.round(x0 + scale * (-b)) + offsetX;
        let y1 = Math.round(y0 + scale * a) + offsetY;
        let x2 = Math.round(x0 - scale * (-b)) + offsetX;
        let y2 = Math.round(y0 - scale * a) + offsetY;
  
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
  
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
      }
  
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
      }
  
      // Function to draw a circle at the given point
      function drawCircle(x, y, ctx) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'blue';
        ctx.fill();
      }
    };
  
    window.Module = {
      onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
      },
    };
  });
  