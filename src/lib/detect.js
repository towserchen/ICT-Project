export function processImages(imgElement, outputCanvas) {

    if (!cv) {
        console.error("OpenCV.js not loaded or canvas element not found.");
        return;
    }

    let src = cv.imread(imgElement); // Load the image into a Mat object

    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale
    
    let blurred = new cv.Mat();
    let ksize = new cv.Size(7, 7)
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise and improve edge detection
    
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 250, 3, true); // Detect edges using Canny Algorithum

    let morphed = new cv.Mat();

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // Find contours

    let allContours = cv.imread(imgElement);
    for (let i = 0; i < contours.size(); i++) {
        let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        cv.drawContours(allContours, contours, i, colour1, 2, cv.LINE_8);
    }

    let filteredContours = new cv.MatVector();
    let minArea = 10;
    let minPerimeter = 150;
    for (let i = 0; i < contours.size(); i++) { // Loop over all contours
        let contour = contours.get(i);

        let firstPoint = new cv.Point(contour.data32S[0], contour.data32S[1]);
        let lastPoint = new cv.Point(contour.data32S[(contour.data32S.length - 2)], contour.data32S[(contour.data32S.length - 1)]);

        // Check if the contour is closed
        let distance = Math.sqrt(Math.pow(firstPoint.x - lastPoint.x, 2) + Math.pow(firstPoint.y - lastPoint.y, 2));
        let isClosed = distance < 1.0; // You can adjust this threshold

        if (isClosed) {
            console.log(`Contour ${i} is closed.`);
            let area = cv.contourArea(contour, false);
            console.log(`Contour ${i} area is ${area}`);
            if(area > minArea) {
                filteredContours.push_back(contour);
            }
        } else {
            console.log(`Contour ${i} is open.`);
            let perimeter = cv.arcLength(contour, false);
            console.log(`Contour ${i} perimeter is ${perimeter}`);
            if(perimeter > minPerimeter) {
                filteredContours.push_back(contour);
            }
        }

        contour.delete();
    }

    for (let i = 0; i < filteredContours.size(); i++) {
        let colour1 = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255);
        cv.drawContours(src, filteredContours, i, colour1, 2, cv.LINE_8);
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
        cv.circle(src, new cv.Point(Math.round(x0), Math.round(y0)), 5, new cv.Scalar(0, 0, 255, 255), -1); // Blue dot for the origin

        let scale = 2500; // Extend the lines across the image
        let x1 = Math.round(x0 + scale * (-b));
        let y1 = Math.round(y0 + scale * (a));
        let x2 = Math.round(x0 - scale * (-b));
        let y2 = Math.round(y0 - scale * (a));

        cv.line(src, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0, 255), 2, cv.LINE_AA);
    }



    cv.imshow(outputCanvas, src);

    src.delete(); // Clean up
}