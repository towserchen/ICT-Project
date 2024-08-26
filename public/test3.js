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
    let ksize = new cv.Size(5, 5)
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise and improve edge detection
    //cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    //cv.bilateralFilter(src, blurred, 9, 75, 75, cv.BORDER_DEFAULT); // Apply bilateral filter to reducd noise and improve edge detection
    
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 100, 200, 3, true); // Detect edges using Canny Algorithum

    let morphed = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)); // creates a rectangular structuring element to be used as a kernel
    cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel); // Preforms morphological operation

    let lines = new cv.Mat();
    cv.HoughLines(edges, lines, 1, Math.PI / 180, 200); // Apply the standard (non-probabilistic) Hough Line Transform

    for (let i = 0; i < lines.rows; i++) { // Draw the detected lines on the image
        let rho = lines.data32F[i * 2];       // Distance from the origin
        let theta = lines.data32F[i * 2 + 1]; // Angle in radians

        let a = Math.cos(theta);
        let b = Math.sin(theta);
        let x0 = a * rho;
        let y0 = b * rho;

        let scale = 1000; // Extend the lines across the image
        let x1 = Math.round(x0 + scale * (-b));
        let y1 = Math.round(y0 + scale * (a));
        let x2 = Math.round(x0 - scale * (-b));
        let y2 = Math.round(y0 - scale * (a));

        cv.line(src, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0, 255), 2, cv.LINE_AA);
    }

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
    let colour = new cv.Scalar(255, 0, 0, 255);
    cv.drawContours(allContours, contours, -1, colour, 2, cv.LINE_8);

    for (let i = 0; i < contours.size(); i++) { // Loop over all contours
        
        let approx = new cv.Mat();
        cv.approxPolyDP(contours.get(i), approx, 0.02 * cv.arcLength(contours.get(i), true), true); // Approximate the contour with a polygon
        
        if (approx.rows === 4){ // If the polygon has 4 vertices, we assume it's a quadrilateral
            cv.drawContours(src, contours, i, colour, 2, cv.LINE_8, hierarchy, 0);
        }

        approx.delete();
    }

    cv.imshow('grayCanvas', gray); // Display the outputs
    cv.imshow('blurredCanvas', blurred);
    cv.imshow('edgesCanvas', edges);
    cv.imshow('morphedCanvas', morphed);
    //cv.imshow('linesCanvas', lines);
    cv.imshow('contoursCanvas', allContours);
    cv.imshow('outputCanvas', src);

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