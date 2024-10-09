<template>
    <h2>Live Video Detection</h2>

    <div>
        <a class="btn" @click.prevent="startVideoStream">Start</a>
    </div>

    <div>
      <video ref="video" autoplay playsinline></video>
      <canvas ref="canvas"></canvas>
    </div>
</template>

<style scoped>
.btn {
    padding: 10px 25px;
    background-color: #2a42af;
    color: #fff;
}
</style>
  
<script setup>
import { ref, onMounted } from 'vue';
import { autoDetectBlindOpenings } from 'ziptrak-opening-detector';

const video = ref(null);
const canvas = ref(null);
const streaming = ref(false);
const width = 640;
const height = 480;
  
const startVideoStream = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.value.srcObject = stream;
        video.value.onloadedmetadata = () => {
            video.value.play();
            streaming.value = true;
            captureFrames();
        };
    } catch (err) {
        alert(err);
        console.error("Error accessing the camera: ", err);
    }
};
  
const captureFrames = () => {
    if (streaming.value) {
        const context = canvas.value.getContext('2d');
        canvas.value.width = width;
        canvas.value.height = height;

        context.drawImage(video.value, 0, 0, width, height);
        const frame = context.getImageData(0, 0, width, height);
  
        const processedFrame = detect(frame);
        context.putImageData(processedFrame, 0, 0);
  
        requestAnimationFrame(captureFrames);
    }
};
  
const detect = (frame) => {
    frame = autoDetectBlindOpenings(frame);

    // @todo mark objects that were detected
    return frame;
};
</script>
  