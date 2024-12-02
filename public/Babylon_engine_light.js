// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Initialize Babylon engine
const engine = new BABYLON.Engine(canvas, true);

async function loadModelWithRetry(
    rootUrl,
    sceneFilename,
    scene = null,
    onProgress = null,
    pluginExtension = null,
    attempt = 1
) {
    try {
        return await BABYLON.SceneLoader.LoadAssetContainerAsync(rootUrl, sceneFilename, scene, onProgress, pluginExtension);
    } catch (error) {
        if (attempt < 5) { // from app.config.ts
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    loadModelWithRetry(rootUrl, sceneFilename, scene, onProgress, pluginExtension, attempt + 1)
                        .then(resolve)
                        .catch(reject);
                }, 3000); // from app.config.ts
            });
        } else {
            throw error;
        }
    }
};

function getViewportSizeAtDepth(camera, scene, depth) {
    // Get the field of view (FOV) in radians
    const fov = camera.fov; // Babylon.js stores FOV in radians
    
    // Calculate the aspect ratio of the viewport
    const aspectRatio = scene.getEngine().getAspectRatio(camera);
    
    // Calculate the viewport height and width at the specified depth
    const height = 2 * Math.tan(fov / 2) * depth;
    const width = height * aspectRatio;
    
    return { width, height };
}

function calcRotation() {
    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 1, 0, 1, 1, 0, 1]);
    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [85, 78, 586, 172, 586, 452, 103, 586]);
    const homography = cv.findHomography(srcPts, dstPts);

    const cameraMatrix = cv.matFromArray(3, 3, cv.CV_32F, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const Rvecs = new cv.MatVector();
    const Tvecs = new cv.MatVector();
    const normals = new cv.MatVector();
    cv.decomposeHomographyMat(homography, cameraMatrix, Rvecs, Tvecs, normals);

    const rotationMatrix = Rvecs.get(0);
    const m = rotationMatrix.data32F;

    // Convert to Quaternion
    const r11 = m[0], r12 = m[1], r13 = m[2];
    const r21 = m[3], r22 = m[4], r23 = m[5];
    const r31 = m[6], r32 = m[7], r33 = m[8];

    const qw = Math.sqrt(1 + r11 + r22 + r33) / 2;
    const qx = (r32 - r23) / (4 * qw);
    const qy = (r13 - r31) / (4 * qw);
    const qz = (r21 - r12) / (4 * qw);

    const quaternion = new BABYLON.Quaternion(qx, qy, qz, qw);

    return quaternion;
}

function scaleToBabylonSpace(cornerCoords, imageWidth, imageHeight, viewportWidth, viewportHeight) {
    const babylonCoords = [];
    for (let i = 0; i < cornerCoords.length; i += 2) {
        const x = cornerCoords[i];
        const y = cornerCoords[i + 1];

        // Normalize coordinates and scale to Babylon space
        const babylonX = -(x / imageWidth - 0.5) * viewportWidth;
        const babylonY = -((y / imageHeight - 0.5) * viewportHeight); // Invert Y for Babylon space

        babylonCoords.push({ x: babylonX, y: babylonY, z: 0 }); // Assuming Z = 0 for a flat plane
    }
    return babylonCoords;
}

const createScene = async () => {
    const scene = new BABYLON.Scene(engine);
    scene.useRightHandedSystem = true

    const camera = new BABYLON.ArcRotateCamera(
        "ArcRotateCamera",
        Math.PI / 2,
        Math.PI / 2,
        10,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);

    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 0.7;

    try {
        const assetContainer = await loadModelWithRetry(
            "./assets/model/", // Replace with your model path
            "outdoor.glb",          // Replace with your model name
            scene
        );

        // Add the loaded models to the scene
        assetContainer.addAllToScene();

        console.log("Model loaded successfully!");
    } catch (error) {
        console.error("Model loading failed:", error);
    }

    scene.clearColor = null;

    // Add a grid material
    const gridMaterial = new BABYLON.GridMaterial("gridMaterial", scene);
    gridMaterial.majorUnitFrequency = 2; // Distance between major grid lines
    gridMaterial.minorUnitVisibility = 0.5; // Visibility of minor lines
    gridMaterial.gridRatio = 0.5; // Size of each grid cell
    gridMaterial.backFaceCulling = false; // Make grid visible from both sides
    gridMaterial.mainColor = new BABYLON.Color4(1, 1, 1, 1); // Grid line color
    gridMaterial.lineColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Secondary line color

    //gridMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND; // Enable alpha blending
    //gridMaterial.alpha = 0.5; // Set transparency to 50%
    gridMaterial.opacity = 0.8;

    // Create the ground plane
    const gridPlane = BABYLON.MeshBuilder.CreateGround("gridPlane", {
        width: 20, // Width of the grid
        height: 20, // Height of the grid
        subdivisions: 20 // Number of subdivisions
    }, scene);

    // Apply the grid material to the ground plane
    gridPlane.material = gridMaterial;

    return scene;
};

(async () => {
    const scene = await createScene();
    console.log(scene.meshes);

    const axesViewer = new BABYLON.AxesViewer(scene);

    const camera = scene.cameras[0];
    const depth = camera.radius; // Distance from the camera
    const viewportSize = getViewportSizeAtDepth(camera, scene, depth);
    console.log(`Viewport at depth ${depth}: Width = ${viewportSize.width}, Height = ${viewportSize.height}`);

    const coords = [363.2151424287856, 92.14992503748127, 955.1011994002998, 203.2023988005997, 955.1011994002998, 533.9970014992504, 384.48050974512745, 692.3058470764618];
    const babCoords = scaleToBabylonSpace(coords, canvas.width, canvas.height, viewportSize.width, viewportSize.height);

    console.log("Quad bab coords: ", babCoords);

    babCoords.forEach(coord => {
        const sphere = BABYLON.MeshBuilder.CreateSphere("point", { diameter: 0.2 }, scene);
        sphere.position = new BABYLON.Vector3(coord.x, coord.y, coord.z);
    });

    const boundingVectors = scene.meshes[0].getHierarchyBoundingVectors();

    // Get the minimum and maximum bounds of the entire hierarchy
    const minimum = boundingVectors.min;
    const maximum = boundingVectors.max;

    // Calculate the size of the model
    const modWidth = maximum.x - minimum.x;   // Size along the X-axis
    const modHeight = maximum.y - minimum.y; // Size along the Y-axis
    const modDepth = maximum.z - minimum.z;  // Size along the Z-axis

    console.log("Model Dimensions:");
    console.log(`Width: ${modWidth}, Height: ${modHeight}, Depth: ${modDepth}`);


    //scene.meshes[0].rotationQuaternion = calcRotation();

    
    const quaternion =  new BABYLON.Quaternion.FromEulerAngles(
        BABYLON.Tools.ToRadians(-46),
        BABYLON.Tools.ToRadians(-38),
        BABYLON.Tools.ToRadians(-75)
    );

    console.log(quaternion);
    scene.meshes.rotationQuaternion = quaternion;

    console.log(scene.meshes[0].rotationQuaternion);

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
})();