let imgElement = document.getElementById('srcImage'); // Gets the HTML element the source image will be loaded into 
let inputElement = document.getElementById('fileInput'); // Gets the HTML element used to input files

inputElement.addEventListener('change', (e) => { // Adds an event listener to the file input element and sets the source for the image element to the selected URL
    imgElement.src = URL.createObjectURL(e.target.files[0]);
}, false);

imgElement.onload = function() { // Function callback when the image is loaded
    let src = cv.imread(imgElement); // Load the image into a Mat object
    let gray = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let blurred = new cv.Mat();

    const kernelSize = new cv.Size(15, 15);
    const sigmaX = 10;
    const sigmaY = 10;
    cv.GaussianBlur(gray, blurred, kernelSize, sigmaX, sigmaY); // completely ignored apparently

    let binary = new cv.Mat();
    cv.adaptiveThreshold(blurred, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2) // completely ignored apparently

    let edges = new cv.Mat();
    cv.Canny(gray, edges, 50, 150);

    let morphed = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(4, 4)); // creates a rectangular structuring element to be used as a kernel
    cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel); // Preforms morphological operation
    //cv.morphologyEx(edges, morphed, cv.MORPH_OPEN, kernel);

    let lines = new cv.Mat();
    cv.HoughLines(edges, lines, 1, Math.PI / 180, 350); // Apply the standard (non-probabilistic) Hough Line Transform

    for (let i = 0; i < lines.rows; i++) { // Draw the detected lines on the image
        let rho = lines.data32F[i * 2];       // Distance from the origin
        let theta = lines.data32F[i * 2 + 1]; // Angle in radians

        let a = Math.cos(theta);
        let b = Math.sin(theta);
        let x0 = a * rho;
        let y0 = b * rho;

        // Draw the origin point
        cv.circle(src, new cv.Point(Math.round(x0), Math.round(y0)), 5, new cv.Scalar(0, 0, 255, 255), -1); // Blue dot for the origin

        let scale = 2500; // Extend the lines across the image
        let x1 = Math.round(x0 + scale * (-b));
        let y1 = Math.round(y0 + scale * (a));
        let x2 = Math.round(x0 - scale * (-b));
        let y2 = Math.round(y0 - scale * (a));

        cv.line(src, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0, 255), 2, cv.LINE_AA);
    }

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    let allContours = cv.imread(imgElement);
    for (let i = 0; i < contours.size(); i++) {
        let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        cv.drawContours(allContours, contours, i, colour1, 2, cv.LINE_8);
    }

    // area and edges
    let contourAreas = [];
    let boundingBoxes = [];

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        let perimeter = cv.arcLength(contour, false);
        let boundingBox = cv.boundingRect(contour);
        contourAreas.push({ index: i, area: area, boundingBox: boundingBox, perimeter: perimeter });
    }

    // sort by areas
    contourAreas.sort((a, b) => b.area - a.area);

    console.log(contourAreas);
    
    // whether there are contours connected
    function areConnected(box1, box2) {
        return (box1.x + box1.width > box2.x && 
                 box2.x + box2.width > box1.x && 
                 box1.y + box1.height > box2.y && 
                 box2.y + box2.height > box1.y);
    }

    // merge contour
    let groupedContours = [];
    let used = new Array(contourAreas.length).fill(false);

    for (let i = 0; i < contourAreas.length; i++) {
        if (used[i]) continue;
        let group = [contourAreas[i]];
        used[i] = true;

        for (let j = i + 1; j < contourAreas.length; j++) {
            if (used[j]) continue;
            if (areConnected(group[0].boundingBox, contourAreas[j].boundingBox)) {
                group.push(contourAreas[j]);
                used[j] = true;
            }
        }
        groupedContours.push(group);
    }

    console.log(groupedContours);

    // keep the largest one
    let maxContours = [];
    for (let group of groupedContours) {
        let maxContour = group.reduce((max, curr) => curr.area > max.area ? curr : max, group[0]);
        maxContours.push(maxContour);
    }

    console.log(maxContours);

    // retain similar area
    let filteredContours = [];
    let maxArea = maxContours[0]?.area || 0;
    let minAreaThreshold = maxArea * 0.5;

    for (let contour of contourAreas) {
        if (contour.area >= minAreaThreshold) {
            filteredContours.push(contour);
        }
    }

    console.log(filteredContours);

    // output
    for (let contour of filteredContours) {
        let approx = new cv.Mat();
        let c = contours.get(contour.index);
        cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c, true), true);
        //if (approx.rows === 4) {
            let colour = new cv.Scalar(255, 0, 0, 255);
            cv.drawContours(src, contours, contour.index, colour, 2, cv.LINE_8, hierarchy, 0);
        //}
        approx.delete();
    }

    cv.imshow('contoursCanvas', allContours);
    cv.imshow('morphedCanvas', morphed);
    cv.imshow('outputCanvas', src);
    cv.imshow('edgesCanvas', edges);
    cv.imshow('binaryCanvas', binary);
    cv.imshow('grayCanvas', gray);
    cv.imshow('blurredCanvas', blurred);


}

window.Module = {
    onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
    }
};