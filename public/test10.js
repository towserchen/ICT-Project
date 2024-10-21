document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('fileInput');
  const imgElement = document.getElementById('srcImage');
  const imageCanvas = document.getElementById('imageCanvas');
  const ctx = imageCanvas.getContext('2d');

  const blurSizeSliderX = document.getElementById('blurSizeSliderX');
  const blurSizeDisplayX = document.getElementById('blurSizeDisplayX');
  const blurSizeSliderY = document.getElementById('blurSizeSliderY');
  const blurSizeDisplayY = document.getElementById('blurSizeDisplayY');

  const cannyMinSlider = document.getElementById('cannyMinSlider');
  const cannyMinDisplay = document.getElementById('cannyMinDisplay');
  
  const cannyMaxSlider = document.getElementById('cannyMaxSlider');
  const cannyMaxDisplay = document.getElementById('cannyMaxDisplay');
  
  const sobelSizeSlider = document.getElementById('sobelSizeSlider');
  const sobelSizeDisplay = document.getElementById('sobelSizeDisplay');

  const houghThresholdSlider = document.getElementById('houghThresholdSlider');
  const houghThresholdDisplay = document.getElementById('houghThresholdDisplay');

  let clickPoints = []; // Store coordinates of clicks and box corners

  // Update the slider display text
  blurSizeSliderX.addEventListener('input', function () {
    blurSizeDisplayX.textContent = blurSizeSliderX.value;
    processImage();
  });
  
  // Update the slider display text
  blurSizeSliderY.addEventListener('input', function () {
    blurSizeDisplayY.textContent = blurSizeSliderY.value;
    processImage();
  });

  cannyMinSlider.addEventListener('input', function () {
    cannyMinDisplay.textContent = cannyMinSlider.value;
    processImage();
  });

  cannyMaxSlider.addEventListener('input', function () {
    cannyMaxDisplay.textContent = cannyMaxSlider.value;
    processImage();
  });

  sobelSizeSlider.addEventListener('input', function () {
    sobelSizeDisplay.textContent = sobelSizeSlider.value;
    processImage();
  });
  
  houghThresholdSlider.addEventListener('input', function () {
    houghThresholdDisplay.textContent = houghThresholdSlider.value;
    processImage();
  });

  fileInput.addEventListener('change', (e) => {
    imgElement.src = URL.createObjectURL(e.target.files[0]); // Load the selected image
  }, false);

  let first = true; // yuck

  imgElement.onload = function () {
    first = true;
    processImage(); // Call the function to process the image when it loads
  };

  let allLines = []; // yuck as well

  function processImage() {
    let src = cv.imread(imgElement); // Load the image into a Mat object

    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale

    let blurred = new cv.Mat();
    let ksizeValueX = parseInt(blurSizeSliderX.value); // Get the slider value for kernel size
    let ksizeValueY = parseInt(blurSizeSliderY.value); // Get the slider value for kernel size
    let ksize = new cv.Size(ksizeValueX, ksizeValueY);
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise

    if(first) {
      // Compute the median pixel intensity
      let medianValue = getMedianValue(gray);

      let sigma = 0.33;
      
      // Calculate the lower and upper thresholds based on the median value
      let lower = Math.max(0, (0.33) * medianValue);
      let upper = Math.min(255, (1.45) * medianValue);

      cannyMinSlider.value = lower;
      cannyMinDisplay.textContent = cannyMinSlider.value;
      cannyMaxSlider.value = upper;
      cannyMaxDisplay.textContent = cannyMaxSlider.value;
      first = false;
    }

    let edges = new cv.Mat();
    let sobelSize = parseInt(sobelSizeSlider.value);
    let cannyMinValue = parseInt(cannyMinSlider.value); // Get Canny min threshold
    let cannyMaxValue = parseInt(cannyMaxSlider.value); // Get Canny max threshold
    cv.Canny(blurred, edges, cannyMinValue, cannyMaxValue, sobelSize, true); // Detect edges using Canny

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // Find contours

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
    let minPerimeter = imgElement.height / 4;
    for (let i = 0; i < contourAreas.length; i++) { // Loop over all contours
      let contour = contourAreas[i];
      if(contour.perimeter > minPerimeter && contour.area > minArea) {
        filteredContours.push_back(contours.get(contour.index));
        console.log(`Contour ${contour.index} area is ${contour.area}`);
        console.log(`Contour ${contour.index} perimeter is ${contour.perimeter}`);
      }
    }

    let justFilterContours = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3); // 3-channel black image (RGB)
    cv.drawContours(justFilterContours, filteredContours, -1, new cv.Scalar(255,255,255,255), 0.5, cv.LINE_8);
    let gray2 = new cv.Mat();
    cv.cvtColor(justFilterContours, gray2, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale    

    let lines = new cv.Mat();
    let houghThresholdValue = parseInt(houghThresholdSlider.value); // Get Hough Line threshold value
    cv.HoughLines(edges, lines, 1, Math.PI / 180, houghThresholdValue); // Apply the standard Hough Line Transform

    allLines = [];
    for (let i = 0; i < lines.rows; i++) {
      let rho = lines.data32F[i * 2];       // Distance from the origin
      let theta = lines.data32F[i * 2 + 1]; // Angle in radians
      allLines.push({ rho, theta });
    }

    let lineImg = cv.imread(imgElement);
    for (let i = 0; i < lines.rows; i++) { // Draw the detected lines on the image
      let rho = lines.data32F[i * 2];       // Distance from the origin
      let theta = lines.data32F[i * 2 + 1]; // Angle in radians

      let a = Math.cos(theta);
      let b = Math.sin(theta);
      let x0 = a * rho;
      let y0 = b * rho;

      let scale = 2500; // Extend the lines across the image
      let x1 = Math.round(x0 + scale * (-b));
      let y1 = Math.round(y0 + scale * (a));
      let x2 = Math.round(x0 - scale * (-b));
      let y2 = Math.round(y0 - scale * (a));

      cv.line(lineImg, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0, 255), 2, cv.LINE_AA);
    }

    // Display initial results on canvas
    cv.imshow('grayCanvas', gray);
    cv.imshow('blurredCanvas', blurred);
    cv.imshow('edgesCanvas', edges);
    cv.imshow('gray2Canvas', gray2);
    cv.imshow('linesCanvas', lineImg);

    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    gray2.delete();
    lineImg.delete();

    // Set the image canvas size
    imageCanvas.width = imgElement.width;
    imageCanvas.height = imgElement.height;
    ctx.drawImage(imgElement, 0, 0); // Draw the image on the canvas

  };

  function getMedianValue(grayMat) {
    // Get pixel values in array
    let pixels = [];
    for (let i = 0; i < grayMat.rows; i++) {
        for (let j = 0; j < grayMat.cols; j++) {
            pixels.push(grayMat.ucharPtr(i, j)[0]);
        }
    }
    
    // Sort the pixel values
    pixels.sort((a, b) => a - b);
    
    // Return the median pixel value
    let middle = Math.floor(pixels.length / 2);
    if (pixels.length % 2 === 0) {
        return (pixels[middle - 1] + pixels[middle]) / 2.0;
    } else {
        return pixels[middle];
    }
  };

  // Function to get the bottom two boxes based on their vertical position (y-coordinate)
  function getBottomTwoBoxes(boxes) {
    // Sort boxes by the y-coordinate (bottom of the box)
    let sortedBoxes = [...boxes].sort((a, b) => b.y - a.y);
    return sortedBoxes.slice(0, 2); // Return the two boxes with the largest y values
  }

  function getTopTwoBoxes(boxes) {
    // Sort boxes by the y-coordinate (bottom of the box)
    let sortedBoxes = [...boxes].sort((a, b) => b.y - a.y);
    return sortedBoxes.slice(2, 4); // Return the two boxes with the lowest y values
  }

  // Function to process the bottom two boxes
  function processBottomBoxes(bottomBoxes) {
    let src = cv.imread(imgElement);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
    let blank = new cv.Mat(src.rows, src.cols, cv.CV_8UC1, new cv.Scalar(0, 0, 0, 255)); // Black image

    for (let i = 0; i < bottomBoxes.length; i++){
      let x1 = bottomBoxes[i].topLeft.x;
      let y1 = bottomBoxes[i].topLeft.y;
      let x2 = bottomBoxes[i].bottomRight.x;
      let y2 = bottomBoxes[i].bottomRight.y;

      console.log(`ROI Coordinates: (${x1}, ${y1}), (${x2}, ${y2})`);
      console.log(`ROI Size: Width = ${x2 - x1}, Height = ${y2 - y1}`);

      if (x2 - x1 <= 0 || y2 - y1 <= 0) {
          console.error('Invalid ROI size. Check the coordinates.');
      }

      let roi = new cv.Rect(x1, y1, x2 - x1, y2 - y1);
      let srcRoi = src.roi(roi);

      let blurred = new cv.Mat();
      let ksize = new cv.Size(7, 7)
      cv.GaussianBlur(srcRoi, srcRoi, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise and improve edge detection

      cv.Canny(srcRoi, srcRoi, 100, 250, 5, true);

      let blankRoi = blank.roi(roi); // Create the ROI on the blank image
      srcRoi.copyTo(blankRoi);       // Copy the ROI from the source to the corresponding blank region

      srcRoi.delete();
      blankRoi.delete();
    }
    
    // Perform Hough Line Transform
    let lines = new cv.Mat();
    cv.HoughLines(blank, lines, 1, Math.PI / 180, 30);

    console.log(lines);

    cv.cvtColor(blank, blank, cv.COLOR_GRAY2RGBA);

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
      cv.line(blank, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0, 255), 1);
    }

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

    // Draw the best line on the blank image
    if (bestLine) {
      let rho = bestLine.rho;
      let theta = bestLine.theta;
      let a = Math.cos(theta);
      let b = Math.sin(theta);
      let x0 = a * rho;
      let y0 = b * rho;

      let x1 = Math.round(x0 + 1000 * (-b));  // Line endpoint 1
      let y1 = Math.round(y0 + 1000 * (a));
      let x2 = Math.round(x0 - 1000 * (-b));  // Line endpoint 2
      let y2 = Math.round(y0 - 1000 * (a));

      // Draw the line on the image
      cv.line(blank, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 0, 255, 255), 2);  // Draw the best line in blue
    }

    // Display the resulting image
    cv.imshow('roi', blank);

    // Draw the filtered lines on the original image canvas
    //filteredLines.forEach((line) => drawLineOnOriginalImage(line, x1, y1, ctx));
    drawLine(bestLine, ctx, imageCanvas);

    // // Clean up OpenCV Mats
    // roi.delete();
    // grayRoi.delete();
    // edgesRoi.delete();
    // lines.delete();

    // Clean up memory
    src.delete();
    blank.delete();

    return bestLine;
  }

  // Helper function to calculate the y-coordinate for a given x on the line
  function calculateYForX(rho, theta, x) {
    let a = Math.cos(theta);
    let b = Math.sin(theta);
    let y = (rho - x * a) / b;
    return y;
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

  // Add click functionality for box drawing
  imageCanvas.addEventListener('click', function (event) {
    if (!imgElement.src) {
      console.log("Image is not yet processed. Click ignored.");
      return; // Prevent click handling if the image isn't processed
    }

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
    bottomBoxes = [...bottomBoxes].sort((a, b) => a.x - b.x);

    let topBoxes = getTopTwoBoxes(clickPoints);
    topBoxes = [...topBoxes].sort((a, b) => a.x - b.x);


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

    // Filter the lines based on box intersections
    let filteredLines = allLines.filter((line) => doesLineIntersectTwoBoxes(line, clickPoints));

    // If there are 4 boxes, process the bottom 2 boxes
    if (clickPoints.length === 4) {
      filteredLines.push(processBottomBoxes(bottomBoxes));
    }

    // Draw the filtered lines on the canvas
    filteredLines.forEach((line) => drawLine(line, ctx, imageCanvas));

    // Detect intersections between filtered lines
    let intersections = findLineIntersections(filteredLines, clickPoints);

    // // Draw circles at the intersection points
    // intersections.forEach((intersection) => {
    //   console.log("Drawing circle at: ", intersection.x, intersection.y);  // Log each point
    //   drawCircle(intersection.x, intersection.y, ctx);
    // });

    if (clickPoints.length === 4) {
      let outermostIntersections = getOutermostIntersections(intersections, topBoxes, bottomBoxes);
    
      // Create an array to store the result: [x1, y1, x2, y2, ...] for outermost intersections and bottom box centers
      let result = [];

      // Add the outermost intersections to the result array
      result.push(
        outermostIntersections.topLeft.x, outermostIntersections.topLeft.y,
        outermostIntersections.topRight.x, outermostIntersections.topRight.y,
        outermostIntersections.bottomLeft.x, outermostIntersections.bottomLeft.y,
        outermostIntersections.bottomRight.x, outermostIntersections.bottomRight.y
      );

      console.log(result);

      for (let i = 0; i < result.length; i += 2) {
        console.log("Drawing circle at: ", result[i], result[i + 1]);  // Log each point
        drawCircle(result[i], result[i + 1], ctx);
      }
    }
    
  });

  // Function to check if a point is inside a box
  function isPointInBox(point, box) {
    return (
      point.x >= box.topLeft.x &&
      point.x <= box.bottomRight.x &&
      point.y >= box.topLeft.y &&
      point.y <= box.bottomRight.y
    );
  }

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
  }

  window.Module = {
    onRuntimeInitialized() {
      document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
    },
  };
});
  