let imgElement = document.getElementById('srcImage'); // Gets the HTML element the source image will be loaded into 
let inputElement = document.getElementById('fileInput'); // Gets the HTML element used to input files

inputElement.addEventListener('change', (e) => { // Adds an event listener to the file input element and sets the source for the image element to the selected URL
    imgElement.src = URL.createObjectURL(e.target.files[0]);
}, false);

imgElement.onload = function() { // Function callback when the image is loaded
    let src = cv.imread(imgElement); // Load the image into a Mat object
    let gray = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    
    cv.imshow('outputCanvas', src);
    cv.imshow('grayCanvas', gray);

}

window.Module = {
    onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
    }
};