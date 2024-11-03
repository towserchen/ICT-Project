<template>
  <h2>Image Detection</h2>

  <div>
      <div class="header">
          <div class="select-container">
              <div class="select-head">
                  <ul>
                      <li :class="{active: tabActive === 0}" @click="changeTab(0)">Home</li>
                      <li :class="{active: tabActive === 1}" @click="changeTab(1)">Sample1</li>
                      <li :class="{active: tabActive === 2}" @click="changeTab(2)">Sample2</li>
                      <li :class="{active: tabActive === 3}" @click="changeTab(3)">Sample3</li>
                      <li :class="{active: tabActive === 4}" @click="changeTab(4)">Sample4</li>
                      <li :class="{active: tabActive === 5}" @click="changeTab(5)">Sample5</li>
                      <li :class="{active: tabActive === 6}" @click="changeTab(6)">Sample6</li>
                      <li :class="{active: tabActive === 7}" @click="changeTab(7)">Sample7</li>
                      <li :class="{active: tabActive === 8}" @click="changeTab(8)">Sample8</li>
                      <!--<li :class="{active: tabActive === 6}" @click="changeTab(6)">Upload</li>-->
                  </ul>
              </div>

              <div v-if="tabActive === 0" class="landing-info">
                  <p>Welcome to the Quad Detection Test System. This system will detect rectangular objects such as window openings from pictures.</p>
                  <p>Powered by Long Chen & Matthew Freak.</p>
              </div>

              <div v-if="tabActive === 9" class="upload-container">
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
          <!--<div class="inputoutput" v-if="s5Canvas !== null">
              <div class="caption">Step 1 Canvas</div>
              <canvas ref="s1Canvas"></canvas>
          </div>

          <div class="inputoutput">
              <div class="caption">Step 2 Canvas</div>
              <canvas ref="s2Canvas"></canvas>
          </div>

          <div class="inputoutput">
              <div class="caption">Step 3 Canvas</div>
              <canvas ref="s3Canvas"></canvas>
          </div>

          <div class="inputoutput">
              <div class="caption">Step 4 Canvas</div>
              <canvas ref="s5Canvas"></canvas>
          </div>

          <div class="inputoutput">
              <div class="caption">Step 5 Canvas</div>
              <canvas ref="s6Canvas"></canvas>
          </div>-->

          <div class="inputoutput">
              <div class="caption">Output Canvas</div>
              <canvas ref="outputCanvas"></canvas>
          </div>

          <div class="inputoutput">
              <div class="caption">AI Output Canvas</div>
              <div>
                <p v-if="isDetecting">Detecing...</p>
                <canvas ref="AIOutputCanvas"></canvas>
              </div>
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

.footer{ 
  position: fixed;
  color: rgb(72, 72, 72);     
  text-align: center;
  left: 0px;    
  bottom: 0px; 
  width: 100%;
}
</style>

<script setup>
import { ref, onMounted } from 'vue';
//import { autoDetectBlindOpeningsByAI, setApiUrl } from 'ziptrak-opening-detector';
import { autoDetectBlindOpenings } from '../lib/detect';
import { autoDetectBlindOpeningsByAI, setApiUrl } from '../lib/detect';

const outputCanvas = ref(null);
const AIOutputCanvas = ref(null);
const s1Canvas = ref(null);
const s2Canvas = ref(null);
const s3Canvas = ref(null);
const s4Canvas = ref(null);
const s5Canvas = ref(null);

const tabActive = ref(0);
const showEffect = ref(false);
const imgElement = ref(null);
const isDetecting = ref(false);

const slotCanvasList = [s1Canvas, s2Canvas, s3Canvas, s4Canvas, s5Canvas];

const samplePhotoList = [
  'sample/1.jpg',
  'sample/2.jpg',
  'sample/3.jpg',
  'sample/4.jpg',
  'sample/5.jpg',
  'sample/13.jpg',
  'sample/14.jpg',
  'sample/15.jpg',
];

const isWindowDetectedOptions = [1, 1, 1, 1, 0, 0, 0, 0];


const detectByAI = async (imageURL) => {
  isDetecting.value = true;

  const response = await fetch(imageURL);
  const blob = await response.blob();
  const fileUpload = new File([blob], 'userImage.jpg', { type: blob.type });

  const coordinate = await autoDetectBlindOpeningsByAI(fileUpload, 1, 0);
  let result = coordinate.map(innerArray => innerArray.flat());

  isDetecting.value = false;

  return result;
}


// switch the tab
function changeTab(index) {
  tabActive.value = index;

  if (index <= 8 && index >= 1) {
      let imgFile = samplePhotoList[index-1];
      imgElement.value.src = imgFile;
      showEffect.value = true;
  }
  else {
      showEffect.value = false;
  }

  if (AIOutputCanvas.value != null) {
    AIOutputCanvas.value.getContext('2d').clearRect(0, 0, AIOutputCanvas.value.width, AIOutputCanvas.value.height);
  }
}

// draw an rectangle
function drawRectangle(imgElement, outputCanvas, coordinateList) {
  let mat = cv.imread(imgElement);
  console.log("Coordinate List:", coordinateList);
  
  if (coordinateList.length > 0) {
    for (let coordinate of coordinateList) {
          if (coordinate.length != 8) {
              console.error("Invalid coordinate format. Expected format: [x1, y1, x2, y2, x3, y3, x4, y4]");
              continue;
          }
          let temp = []
          temp.push(coordinate[0],coordinate[1], coordinate[2], coordinate[3], coordinate[6], coordinate[7], coordinate[4], coordinate[5]);
          coordinate = temp;

          let points = cv.matFromArray(4, 1, cv.CV_32SC2, coordinate);
          console.log("Points Matrix:", points.data32S);
          
          let contours = new cv.MatVector();
          contours.push_back(points);
          
          cv.polylines(mat, contours, true, new cv.Scalar(255, 0, 0, 255), 2);

          points.delete();
      }
      
      cv.imshow(outputCanvas, mat);
      
      mat.delete();
  } else {
    cv.imshow(outputCanvas, mat);
    console.error("Invalid coordinate format. Expected format: [x1, y1, x2, y2, x3, y3, x4, y4]");
  }
}


function drawRectangleForAI(imgElement, outputCanvas, coordinateList) {
  let mat = cv.imread(imgElement);
  console.log("Coordinate List:", coordinateList);
  
  if (coordinateList.length > 0) {
    for (let coordinate of coordinateList) {
          if (coordinate.length != 8) {
              console.error("Invalid coordinate format. Expected format: [x1, y1, x2, y2, x3, y3, x4, y4]");
              continue;
          }
          let temp = []
          temp.push(coordinate[0],coordinate[1], coordinate[2], coordinate[3], coordinate[4], coordinate[5], coordinate[6], coordinate[7]);
          coordinate = temp;

          let points = cv.matFromArray(4, 1, cv.CV_32SC2, coordinate);
          console.log("Points Matrix:", points.data32S);
          
          let contours = new cv.MatVector();
          contours.push_back(points);
          
          cv.polylines(mat, contours, true, new cv.Scalar(255, 0, 0, 255), 2);

          points.delete();
      }
      
      cv.imshow(outputCanvas, mat);
      
      mat.delete();
  } else {
    cv.imshow(outputCanvas, mat);
    console.error("Invalid coordinate format. Expected format: [x1, y1, x2, y2, x3, y3, x4, y4]");
  }
}

function scaleCoordinates(originalCoords, originalImage, renderCanvas) {
    // Calculate the scaling factors
    const scaleX = renderCanvas.width / originalImage.width;
    const scaleY = renderCanvas.height / originalImage.height;
    console.log(renderCanvas);
    console.log("orignal width:", originalImage.width, "original height:", originalImage.height);
    console.log("scaleX:", scaleX, "scaleY:", scaleY);

    // Apply the scaling to each coordinate pair
    let scaledCoords = [];
    for (let j = 0; j < originalCoords.length; j++) {
      let coords = originalCoords[j];
      console.log("coords:", coords);
      let temp = [];
      for (let i = 0; i < coords.length; i += 2) {
        let scaledX = coords[i] * scaleX;
        let scaledY = coords[i + 1] * scaleY;
        temp.push(scaledX, scaledY);
      }
      scaledCoords.push(temp);
    }   

    return scaledCoords;
};

onMounted(() => {
  if (imgElement.value) {
      imgElement.value.addEventListener('load', async ()=>{
          let image = new Image();
          image.crossOrigin = "Anonymous";
          image.src = imgElement.value.src;

          image.onload = async function () {
            const originalWidth = imgElement.value.width;
            const originalHeight = imgElement.value.height;
            let result = autoDetectBlindOpenings(image, slotCanvasList);
            result = scaleCoordinates(result, image, {width: originalWidth, height: originalHeight});
            drawRectangle(imgElement.value, outputCanvas.value, result);

            result = await detectByAI(imgElement.value.src);
            result = scaleCoordinates(result, image, {width: originalWidth, height: originalHeight});
            drawRectangleForAI(imgElement.value, AIOutputCanvas.value, result);
          }          
      });
  }
});
</script>
