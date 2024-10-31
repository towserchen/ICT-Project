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
                      <li :class="{active: tabActive === 6}" @click="changeTab(6)">Upload</li>
                  </ul>
              </div>

              <div v-if="tabActive === 0" class="landing-info">
                  <p>Welcome to the Quad Detection Test System. This system will detect rectangular objects such as window openings from pictures.</p>
                  <p>Powered by Long Chen & Matthew Freak.</p>
              </div>

              <div v-if="tabActive === 6" class="upload-container">
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
                <select v-model="selectedValue">
                <option value="" disabled>Select an option</option>
                <option v-for="option in options" :key="option.value" :value="option.value">
                  {{ option.text }}
                </option>
              </select>

                <a href="javascript:void(0)" class="btn" @click="selectFile">AI Detect</a>
                
                <input type="file" ref="fileInput" @change="uploadFileChange" style="display: none" />

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

const slotCanvasList = [s1Canvas, s2Canvas, s3Canvas, s4Canvas, s5Canvas];

const options = [
  { value: '1', text: 'Indoor' },
  { value: '0', text: 'Outdoor' },
];

const selectedValue = ref('');

const file = ref(null);
const fileInput = ref(null);

const selectFile = () => {
  fileInput.value.click();
}

const uploadFileChange = async (event) => {
  const selectedFile = event.target.files[0];

  if (selectedFile) {
    file.value = selectedFile;
    console.log('Selected file:', file.value);

    //setApiUrl('http://127.0.0.1:8000/detect');
    const coordinate = await autoDetectBlindOpeningsByAI(file.value, selectedValue.value, 0);

    console.log(coordinate);

    const result = coordinate.map(innerArray => innerArray.flat());

    console.log(result);

    const reader = new FileReader();
    
    reader.onload = function(e) {
      const imgElement = document.createElement('img');
      imgElement.src = e.target.result;
      
      imgElement.onload = function() {
        drawRectangleForAI(imgElement, AIOutputCanvas.value, result);
      };
    };
    
    reader.readAsDataURL(selectedFile);

    console.log(coordinate)
  }
}

// switch the tab
function changeTab(index) {
  tabActive.value = index;

  if (index <= 5 && index >= 1) {
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
      imgElement.value.addEventListener('load', ()=>{
          let image = new Image();
          image.crossOrigin = "Anonymous";
          image.src = imgElement.value.src;
          image.onload = function () {
            let result = autoDetectBlindOpenings(image, slotCanvasList);
            console.log(result);
            result = scaleCoordinates(result, image, {width: imgElement.value.width, height: imgElement.value.height});
            
            drawRectangle(imgElement.value, outputCanvas.value, result);
          }          
      });
  }
});
</script>
