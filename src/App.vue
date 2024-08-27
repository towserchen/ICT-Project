<template>
    <div>
        <h1>Quad Detection Test</h1>

        <div class="header">
            <div class="select-container">
                <div class="select-head">
                    <ul>
                        <li :class="{active: tabActive === 0}" @click="changeTab(0)">Start</li>
                        <li :class="{active: tabActive === 1}" @click="changeTab(1)">Sample1</li>
                        <li :class="{active: tabActive === 2}" @click="changeTab(2)">Sample2</li>
                        <li :class="{active: tabActive === 3}" @click="changeTab(3)">Sample3</li>
                        <li :class="{active: tabActive === 4}" @click="changeTab(4)">Upload</li>
                    </ul>
                </div>

                <div v-if="tabActive === 0" class="landing-info">
                    <p>Welcome to Quad Detection Test System. This system will detect rectangular objects such as Windows or doors in the picture.</p>
                    <p>Powered by Long Chen & Matthew Freak.</p>
                </div>

                <div v-if="tabActive === 4" class="upload-container">
                    <div class="upload-tip caption">
                        <p>Please select a source image:</p>
                        <input type="file" id="fileInput" name="file" accept="image/*" @change="handleFileChange">
                    </div>
                </div>
            </div>

            <div v-show="tabActive !== 0" class="image">
                <div v-show="showEffect" class="inputoutput">
                    <div class="caption">Original Image</div>
                    <img ref="imgElement" alt="Selected Image" />
                </div>
            </div>
        </div>

        <div v-if="tabActive !== 0" v-show="showEffect" class="show-container">
            <div class="inputoutput">
                <div class="caption">Frayscale Canvas</div>
                <canvas ref="grayCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">Vlurred Canvas</div>
                <canvas ref="blurredCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">Canny edges Canvas</div>
                <canvas ref="edgesCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">Morphed Canvas</div>
                <canvas ref="morphedCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">All contours Canvas</div>
                <canvas ref="contoursCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">Output Canvas</div>
                <canvas ref="outputCanvas"></canvas>
            </div>
        </div>
  </div>
</template>

<style scoped>
#app img, #app canvas {
    max-width: 100%;
}

.landing-info {
    margin-top: 30px;
}

.select-head {
    color: #fff;
    margin-bottom: 20px;
}

.select-head ul {
    display: flex;
    justify-content: center;
    margin: 0;
    padding: 0;
}

.select-head ul li {
    width: 100px;
    border-left: 1px solid #fff;
    background-color: rgb(144 126 219);
}

.select-head ul li.active {
    background-color: #2a42af;
}

.select-head ul li:hover {
    cursor: pointer;
}

.upload-tip {
    display: flex;
    justify-content: center;
    align-items: center;
}

.upload-tip p {
    margin-right: 10px;
}

.inputoutput {
    border: 1px solid #2a42af;
    margin-bottom: 30px;
}

.inputoutput img, .inputoutput canvas {
    display: block;
    line-height: 0;
}

.inputoutput p {
    padding: 0;
    margin: 0;
}

.inputoutput .caption {
    background-color: #2a42af;
    color: #fff;
}

</style>

<script setup>
import { ref, onMounted } from 'vue';

const grayCanvas = ref(null);
const blurredCanvas = ref(null);
const edgesCanvas = ref(null);
const morphedCanvas = ref(null);
const contoursCanvas = ref(null);
const outputCanvas = ref(null);

const tabActive = ref(0);
const showEffect = ref(false);
const imgElement = ref(null);

// switch the tab
function changeTab(index) {
    tabActive.value = index;

    if (index <= 3 && index >= 1) {
        let imgFile = index + '.jpg';
        imgElement.value.src = `/sample/${imgFile}`;
        showEffect.value = true;
    }
    else {
        showEffect.value = false;
    }
}

// select a file
function handleFileChange(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        imgElement.value.src = URL.createObjectURL(file);
        showEffect.value = true;
    } else {
        console.error('Please select an image file.');
    }
}

// detect
function processImages() {

    if (!cv) {
        console.error("OpenCV.js not loaded or canvas element not found.");
        return;
    }

    let src = cv.imread(imgElement.value); // Load the image into a Mat object
    
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

    let allContours = cv.imread(imgElement.value);
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

    cv.imshow(grayCanvas.value, gray); // Display the outputs
    cv.imshow(blurredCanvas.value, blurred);
    cv.imshow(edgesCanvas.value, edges);
    cv.imshow(morphedCanvas.value, morphed);
    cv.imshow(contoursCanvas.value, allContours);
    cv.imshow(outputCanvas.value, src);

    src.delete(); // Clean up
    gray.delete();
    blurred.delete();
    edges.delete();
    morphed.delete();
    contours.delete();
    allContours.delete();
    hierarchy.delete();
}

onMounted(() => {
    if (imgElement.value) {
        imgElement.value.addEventListener('load', processImages);
    }
});
</script>
