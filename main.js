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
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 100, 200, 3, true); // Detect edges using Canny Algorithum

    let morphed = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)); // creates a rectangular structuring element to be used as a kernel
    cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel); // Preforms morphological operation

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(morphed, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // Find contours

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
    cv.imshow('contoursCanvas', allContours);
    cv.imshow('outputCanvas', src);

    src.delete(); // Clean up
    gray.delete();
    blurred.delete();
    edges.delete();
    morphed.delete();
    contours.delete();
    allContours.delete();
    hierarchy.delete();
};

window.Module = {
    onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
    }
};