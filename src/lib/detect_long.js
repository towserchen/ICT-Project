export function processImages(imgElement, step1Canvas, step2Canvas, outputCanvas) {
    const mat = cv.imread(imgElement);
    const gray = new cv.Mat();
    const edges = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    const blurred = new cv.Mat();
    const binary = new cv.Mat();

    // gray
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    cv.imshow(step1Canvas, gray);

    // gaussian blur
    //cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    const kernelSize = new cv.Size(15, 15);
    const sigmaX = 10;
    const sigmaY = 10;
    cv.GaussianBlur(gray, blurred, kernelSize, sigmaX, sigmaY);
    cv.imshow(step1Canvas, blurred);

    // binaryzation
    cv.adaptiveThreshold(blurred, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

    // canny detect
    cv.Canny(gray, edges, 50, 150);

    cv.imshow(step2Canvas, edges);

    cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    // area and edges
    let contourAreas = [];
    let boundingBoxes = [];

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        let boundingBox = cv.boundingRect(contour);
        contourAreas.push({ index: i, area: area, boundingBox: boundingBox });
    }

    // sort by areas
    contourAreas.sort((a, b) => b.area - a.area);

    // whether there are contours connected
    function areConnected(box1, box2) {
        return !(box1.x + box1.width < box2.x || 
                 box2.x + box2.width < box1.x || 
                 box1.y + box1.height < box2.y || 
                 box2.y + box2.height < box1.y);
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

    // keet the largist one
    let maxContours = [];
    for (let group of groupedContours) {
        let maxContour = group.reduce((max, curr) => curr.area > max.area ? curr : max, group[0]);
        maxContours.push(maxContour);
    }

    // retaine similar area
    let filteredContours = [];
    let maxArea = maxContours[0]?.area || 0;
    let minAreaThreshold = maxArea * 0.5;

    for (let contour of contourAreas) {
        if (contour.area >= minAreaThreshold) {
            filteredContours.push(contour);
        }
    }

    // output
    for (let contour of filteredContours) {
        let approx = new cv.Mat();
        let c = contours.get(contour.index);
        cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c, true), true);
        if (approx.rows === 4) {
            let colour = new cv.Scalar(255, 0, 0, 255);
            cv.drawContours(mat, contours, contour.index, colour, 2, cv.LINE_8, hierarchy, 0);
        }
        approx.delete();
    }

    cv.imshow(outputCanvas, mat);
    
    mat.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
}