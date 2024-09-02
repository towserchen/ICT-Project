# Quad Detection System

Built with Vite, Vue3, and OpenCV.js.

## Install

`npm install`

## Run

`npm run dev`

## How to update the algorithm of detect?

### Procedure

1, There is a function in src/lib/detect.js which signature is processImages(imageDom, outputCanvas).
2, Update this function and push it to the branch master.
3, Vercel will pull the branch master and deploy automatically.

### Function explain

`imageDom` is an reference of a dom <img>, you can read any attrs from this variable.

`outputCanvas` is an reference of a dom <canvas>, you can ouput your image into this variable.