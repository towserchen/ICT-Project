<template>
    <h2>Live Video Detection</h2>

    <div>
        <a class="btn" @click.prevent="startVideoStream">Start</a>
    </div>

    <div>
        <video ref="video" autoplay playsinline></video>

        <!--<video ref="staticVideo" id="videoInput" width="640" height="480" controls webkit-playsinline playsinline>
            <source src="/sample/1.mp4" type="video/mp4">
            Your browser does not support the video tag.
        </video>-->
    
        <canvas class="processed" ref="canvas"></canvas>

        <textarea v-model="message" width="100%" height="150px"></textarea>
    </div>
</template>

<style scoped>
.btn {
    padding: 10px 25px;
    background-color: #2a42af;
    color: #fff;
}

video {
    width: 480px;
    height: 640px;
}

canvas.processed {
    width: 480px;
    height: 640px;
}
</style>
  
<script setup>
import { ref, onMounted } from 'vue';
import { autoDetectBlindOpenings } from '../lib/detect_video';

const video = ref(null);
const staticVideo = ref(null);
const canvas = ref(null);
const streaming = ref(false);
//const detected = ref(null);
const width = 480;
const height = 640;

const message = ref('');

const drawRectangle = function(frame, coordinateList) {
    if (coordinateList.length >= 1) {
        let mat = cv.matFromImageData(frame);

        for (let coordinate of coordinateList) {
            if (coordinate.length != 8) {
                console.error("Invalid coordinate format. Expected format: [x1, y1, x2, y2, x3, y3, x4, y4]");
                continue;
            }
      
            let points = cv.matFromArray(4, 1, cv.CV_32SC2, coordinate);
            let contours = new cv.MatVector();

            contours.push_back(points);
          
            cv.polylines(mat, contours, true, new cv.Scalar(0, 0, 255), 2);

            points.delete();
            contours.delete();
        }

        let newFrame = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
        mat.delete();
        return newFrame;
    } else {
        return frame;
    }
}
  
const startVideoStream = async () => {

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: "environment", 
                width: { ideal: width },
                height: { ideal: height }
            }
        });

        video.value.srcObject = stream;

        video.value.onloadedmetadata = () => {
            canvas.value.width = width;
            canvas.value.height = height;
    
            video.value.play();
            streaming.value = true;
            captureFrames();
        };

        /*staticVideo.value.play();
        streaming.value = true;
        captureFrames();*/
    } catch (err) {
        alert(err);
        console.log(err);
    }
};
  
const captureFrames = () => {
    if (streaming.value) {
        const context = canvas.value.getContext('2d');
        
        context.drawImage(video.value, 0, 0, width, height);
        const frame = context.getImageData(0, 0, width, height);
  
        const processedFrame = detect(frame);

        if (processedFrame instanceof ImageData) {
            context.putImageData(processedFrame, 0, 0);
        }
  
        requestAnimationFrame(captureFrames);
    }
};
  
function detect(frame){
    try {
        let result = autoDetectBlindOpenings(frame);

        message.value += result.join(',') + "\r\n";

        let tempA = result[6];
        let tempB = result[7];

        result[6] = result[4];
        result[7] = result[5];

        result[4] = tempA;
        result[5] = tempB;

        message.value += result.join(',') + "\r\n";

        return drawRectangle(frame, result);
    }
    catch(e) {
        console.warn(e)
    }
};
</script>
  