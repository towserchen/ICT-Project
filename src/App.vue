<template>
    <div>
        <h1>Quad Detection System</h1>

        <div class="header">
            <div class="select-container">
                <div class="select-head">
                    <ul>
                        <li :class="{active: tabActive === 0}" @click="changeTab(0)">Home</li>
                        <li :class="{active: tabActive === 1}" @click="changeTab(1)">Sample1</li>
                        <li :class="{active: tabActive === 2}" @click="changeTab(2)">Sample2</li>
                        <li :class="{active: tabActive === 3}" @click="changeTab(3)">Sample3</li>
                        <li :class="{active: tabActive === 4}" @click="changeTab(4)">Upload</li>
                    </ul>
                </div>

                <div v-if="tabActive === 0" class="landing-info">
                    <p>Welcome to the Quad Detection Test System. This system will detect rectangular objects such as window openings from pictures.</p>
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
                <div class="caption">Grayscale Canvas</div>
                <canvas ref="grayCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">Blurred Canvas</div>
                <canvas ref="blurredCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">Canny Edge Detection Canvas</div>
                <canvas ref="edgesCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">All Contours Canvas</div>
                <canvas ref="contoursCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">Output Canvas</div>
                <canvas ref="outputCanvas"></canvas>
            </div>
            <div class="inputoutput">
                <div class="caption">JustFilteredContours Canvas</div>
                <canvas ref="justFilteredContours"></canvas>
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
import { processImages } from './lib/detect';

const grayCanvas = ref(null);
const blurredCanvas = ref(null);
const edgesCanvas = ref(null);
const justFilteredContours = ref(null);
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

onMounted(() => {
    if (imgElement.value) {
        imgElement.value.addEventListener('load', ()=>{
            processImages(imgElement.value, outputCanvas.value);
        });
    }
});
</script>
