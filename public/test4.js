let imgElement = document.getElementById('srcImage'); // Gets the HTML element the source image will be loaded into 
let inputElement = document.getElementById('fileInput'); // Gets the HTML element used to input files

const inputCanvas = document.getElementById("inputCanvas");
const canvasAdjust = document.getElementById("canvasAdjust");
let container = document.getElementById("container");
let colorMarker = "rgb(0,255,0)";

inputElement.addEventListener('change', (e) => { // Adds an event listener to the file input element and sets the source for the image element to the selected URL
    imgElement.src = URL.createObjectURL(e.target.files[0]);
}, false);

imgElement.onload = function() { // Function callback when the image is loaded
    let src = cv.imread(imgElement); // Load the image into a Mat object
    cv.imshow("inputCanvas", src);
    src.delete();
    document.getElementById("fg").disabled = false;
    document.getElementById("bg").disabled = false;
    document.getElementById("validate").disabled = false;
    adjustContainerAndLayer();
}

function adjustContainerAndLayer() {
    const box = inputCanvas.getBoundingClientRect();
    canvasAdjust.width = box.width;
    canvasAdjust.height = box.height;
    container.style.width = box.width + "px";
    container.style.height = box.height + "px";
}

function setGrabcut() {
    let src = cv.imread("inputCanvas");
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    let markings = cv.imread("canvasAdjust", 0);
    let mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC1, new cv.Scalar(cv.GC_PR_BGD));
    let bgdModel = new cv.Mat();
    let fgdModel = new cv.Mat();
    let dummyRect = new cv.Rect();
  
    for (let i = 0; i < markings.rows; i++) {
      for (let j = 0; j < markings.cols; j++) {
        if (markings.ucharPtr(i, j)[1] == 255) {
          // if green, tell the mask that it's foreground
          mask.ucharPtr(i, j)[0] = cv.GC_FGD;
          mask.ucharPtr(i, j)[1] = cv.GC_FGD;
          mask.ucharPtr(i, j)[2] = cv.GC_FGD;
        }
        if (markings.ucharPtr(i, j)[0] == 255) {
          // if red, tell the mask that it's background
          mask.ucharPtr(i, j)[0] = cv.GC_BGD;
          mask.ucharPtr(i, j)[1] = cv.GC_BGD;
          mask.ucharPtr(i, j)[2] = cv.GC_BGD;
        }
      }
    }
  
    cv.grabCut(src, mask, dummyRect, bgdModel, fgdModel, 5, cv.GC_INIT_WITH_MASK);
  
    // draw foreground
    for (let i = 0; i < src.rows; i++) {
      for (let j = 0; j < src.cols; j++) {
        if (mask.ucharPtr(i, j)[0] == 0 || mask.ucharPtr(i, j)[0] == 2) {
          src.ucharPtr(i, j)[0] = 0;
          src.ucharPtr(i, j)[1] = 0;
          src.ucharPtr(i, j)[2] = 0;
        }
      }
    }
    
    cv.imshow("canvasOutput", src);
    src.delete();
    mask.delete();
    bgdModel.delete();
    fgdModel.delete();
  }
  

/*{
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    
    // Initialize the mask with probable background
    let mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC1, new cv.Scalar(cv.GC_PR_BGD));
    //mask.ucharPtr(100, 100)[0] = cv.GC_FGD;
    console.log(mask);

    // Define regions that are definitely background
    // Example: Set a rectangle or specific areas to definite background
    let rect1 = new cv.Rect(0, 0, 50, src.rows); // Left edge as definite background
    let rect2 = new cv.Rect(src.cols - 50, 0, 50, src.rows); // Right edge as definite background
    let rect3 = new cv.Rect(0, 0, src.cols, 50); // Top edge as definite background
    let rect4 = new cv.Rect(0, src.rows - 50, src.cols, 50); // Bottom edge as definite background

    // Fill these areas in the mask with the definite background flag
    cv.rectangle(mask, new cv.Point(0,0), new cv.Point(50,src.rows), new cv.Scalar(cv.GC_FGD), cv.FILLED);

    // Initialize the background and foreground models
    let bgdModel = new cv.Mat();
    let fgdModel = new cv.Mat();
    let dummyRect = new cv.Rect();

    // Run the GrabCut algorithm using the mask initialization
    cv.grabCut(src, mask, dummyRect, bgdModel, fgdModel, 5, cv.GC_INIT_WITH_MASK);

    
    // draw foreground
    for (let i = 0; i < src.rows; i++) {
        for (let j = 0; j < src.cols; j++) {
            if (mask.ucharPtr(i, j)[0] == 0 || mask.ucharPtr(i, j)[0] == 2) {
                src.ucharPtr(i, j)[0] = 0;
                src.ucharPtr(i, j)[1] = 0;
                src.ucharPtr(i, j)[2] = 0;
            }
        }
    }
    
    // draw grab rect
    let color = new cv.Scalar(0, 0, 255);
    let point1 = new cv.Point(rect1.x, rect1.y);
    let point2 = new cv.Point(rect1.x + rect1.width, rect1.y + rect1.height);
    cv.rectangle(src, point1, point2, color);
    
    cv.imshow('outputCanvas', src);
    
    src.delete(); 
    mask.delete(); 
    bgdModel.delete(); 
    fgdModel.delete();

}*/

function assignMarker(option) {
    switch (option) {
    case "Foreground":
        colorMarker = "rgb(0, 255, 0)"; //Green
        break;

    case "Background":
        colorMarker = "rgb(255, 0, 0)"; //Red
        break;
    }
}

var ctx = canvasAdjust.getContext("2d");
var isDrawing;

function getMousePosition(e) {
    let box = canvasAdjust.getBoundingClientRect();
    return {
        x: e.clientX - box.left,
        y: e.clientY - box.top,
    };
}

canvasAdjust.onmousedown = function(e) {
    if (document.getElementById("fg").disabled === false) {
        let mousePos = getMousePosition(e);
        isDrawing = true;
        ctx.beginPath();
        ctx.lineWidth = 5;
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.strokeStyle = colorMarker;
        ctx.moveTo(mousePos.x, mousePos.y);
    }
};

canvasAdjust.onmousemove = function(e) {
    if (isDrawing) {
        let mousePos = getMousePosition(e);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
    }
};

canvasAdjust.onmouseup = function() {
    isDrawing = false;
};

window.assignMarker = assignMarker;
window.setGrabcut = setGrabcut;

window.Module = {
    onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
    }
};