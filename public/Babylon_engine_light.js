// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Initialize Babylon engine
const engine = new BABYLON.Engine(canvas, true);

let rootMeshScale = new BABYLON.Vector3(0.9, -0.73, -3.5);
let boundingBoxAbsoluteScale = new BABYLON.Vector3(1.44, 1, 0.29);
let rootStartMeshScale = boundingBoxAbsoluteScale.divide(rootMeshScale).multiply(new BABYLON.Vector3(1, -1, -1));
let boundingBox = null;
let rootMeshAbsoluteScale = new BABYLON.Vector3(1,-1,1);
let meshScaling = {};
let meshPosition = {};

const MESHES_IDS = {
	1: 'MATERIAL-1',
	2: 'MATERIAL-2',
	3: 'MATERIAL_BOTTOM',
	4: 'GUIDE_FUNNEL_LEFT',
	8: 'REVEAL_FIX_CHANNEL_LEFT',
	11: 'STREAMLINE_PELMET_CENTER',
	13: 'STREAMLINE_PELMET_LEFT',
	15: 'STREAMLINE_PELMET_RIGHT',
	18: 'GUIDE_FUNNEL_RIGHT',
	20: 'REVEAL_FIX_CHANNEL_RIGHT',
	22: 'STANDARD_WHEATER_STRIP',
	35: 'ALUMINIUM_FLAT_BAR_LEFT',
	38: 'BOTTOM_BAR_GUIDE_LEFT',
	39: 'BOTTOM_BAR_MOTORIZE_PLUG_LEFT',
	40: 'BOTTOM_BAR_TONGUE_LEFT',
	44: 'BOTTOM_BAR_GUIDE_RIGHT',
	45: 'BOTTOM_BAR_MOTORIZE_PLUG_RIGHT',
	46: 'BOTTOM_BAR_TONGUE_RIGHT',
	47: 'CENTER_LOCK_RELEASE',
	53: 'ALUMINIUM_FLAT_BAR_RIGHT',
	55: 'BOTTOM_STOP_LEFT',
	58: 'BOTTOM_STOP_RIGHT',
	65: 'LARGE_WEATHER_STRIP',
	71: 'FACE_FIX_CHANNEL_LEFT',
	74: 'TRADITIONAL_PELMET_CENTER',
	76: 'TRADITIONAL_PELMET_LEFT',
	78: 'TRADITIONAL_PELMET_RIGHT',
	82: 'TOP_STOP_LEFT',
	85: 'TOP_STOP_RIGHT',
	107: 'BOTTOM_BAR',
	110: 'CAST_BRACKET_LEFT',
	112: 'CAST_BRACKET_BACK_FLASHING',
	114: 'CAST_BRACKET_RIGHT',
	117: 'FACE_FIX_CHANNEL_RIGHT',
	123: 'CUSTOM_MADE_SKIRT',
	130: 'IDLER_COVER',
	136: 'TUBE',
	138: 'BEARING_HOUSING',
	142: 'REVERSE_HANDLE',
	143: 'SPLINE_RIGHT',
	144: 'SPLINE_LEFT',
	145: 'SPLINE_TOP_RIGHT',
	146: 'SPLINE_TOP_LEFT',
	147: 'TRACK_LEFT',
	148: 'TRACK_RIGHT',
	149: 'TRACK_BOTTOM_CAP_LEFT',
	150: 'TRACK_BOTTOM_CAP_RIGHT',
};

const SCALING_MESHES = {
	1: 'MATERIAL-1',
	2: 'MATERIAL-2',
	3: 'MATERIAL_BOTTOM',
	8: 'REVEAL_FIX_CHANNEL_LEFT',
	11: 'STREAMLINE_PELMET_CENTER',
	20: 'REVEAL_FIX_CHANNEL_RIGHT',
	22: 'STANDARD_WHEATER_STRIP',
	35: 'ALUMINIUM_FLAT_BAR_LEFT',
	53: 'ALUMINIUM_FLAT_BAR_RIGHT',
	65: 'LARGE_WEATHER_STRIP',
	71: 'FACE_FIX_CHANNEL_LEFT',
	74: 'TRADITIONAL_PELMET_CENTER',
	107: 'BOTTOM_BAR',
	112: 'CAST_BRACKET_BACK_FLASHING',
	117: 'FACE_FIX_CHANNEL_RIGHT',
	123: 'CUSTOM_MADE_SKIRT',
	136: 'TUBE',
	143: 'SPLINE_RIGHT',
	144: 'SPLINE_LEFT',
	147: 'TRACK_LEFT',
	148: 'TRACK_RIGHT',
};

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

function setGlobalMeshPositionAndScale(scene) {
    const MESH_TYPE = MESHES_IDS;
    const SCALING_TYPE = SCALING_MESHES;

    for (const id in MESH_TYPE) {
        if (id) {
            meshPosition[id] = {
                x: scene.getMeshByName(MESH_TYPE[id])?.position.x,
                y: scene.getMeshByName(MESH_TYPE[id])?.position.y,
                z: scene.getMeshByName(MESH_TYPE[id])?.position.z
            };
        }
    }

    for (const id in SCALING_TYPE) {
        if (id) {
            meshScaling[id] = {
                x: scene.getMeshByName(MESH_TYPE[id])?.scaling.x,
                y: scene.getMeshByName(MESH_TYPE[id])?.scaling.y,
                z: scene.getMeshByName(MESH_TYPE[id])?.scaling.z
            };
        }
    }
};

function setModelMeshScaling(scene) {
    const currentRootMesh = scene.meshes[0];

    const currentMeshScale = boundingBox?.scaling.divide(rootMeshScale).multiply(new BABYLON.Vector3(1, -1, -1));

    let heightCof;
	let heightDiff;
	let widthCof;
	let widthDiff;

    currentRootMesh.scaling = rootMeshAbsoluteScale.divide(boundingBox.scaling);

    heightCof = 0.36;
    heightDiff = (currentMeshScale.y - rootStartMeshScale.y) * heightCof;

    widthCof = 0.45;
    widthDiff = (currentMeshScale.x - rootStartMeshScale.x) * widthCof;

    outdoorHeightSizeHandler(heightDiff, scene);
    outdoorWidthSizeHandler(widthDiff, scene);
}

function outdoorWidthSizeHandler(widthDiff, scene) {
    scene.getMeshByName(MESHES_IDS[1]).scaling.x = meshScaling[1].x + 1.84 * widthDiff;
    scene.getMeshByName(MESHES_IDS[2]).scaling.x = meshScaling[2].x + 1.84 * widthDiff;
    scene.getMeshByName(MESHES_IDS[3]).scaling.x = meshScaling[2].x + 1.935 * widthDiff;
    scene.getMeshByName(MESHES_IDS[11]).scaling.x = meshScaling[11].x + 1.725 * widthDiff;
    scene.getMeshByName(MESHES_IDS[22]).scaling.x = meshScaling[22].x + 1.84 * widthDiff;
    scene.getMeshByName(MESHES_IDS[35]).scaling.x = (meshScaling[35].x + 1.84 * widthDiff) * 1.25;
    scene.getMeshByName(MESHES_IDS[53]).scaling.x = (meshScaling[53].x + 1.84 * widthDiff) * 1.25;
    scene.getMeshByName(MESHES_IDS[65]).scaling.x = meshScaling[65].x + 1.84 * widthDiff;
    scene.getMeshByName(MESHES_IDS[74]).scaling.x = meshScaling[74].x + 1.725 * widthDiff;
    scene.getMeshByName(MESHES_IDS[107]).scaling.x= meshScaling[107].x + 1.898 * widthDiff;
    scene.getMeshByName(MESHES_IDS[112]).scaling.x = meshScaling[112].x + 1.725 * widthDiff;
    scene.getMeshByName(MESHES_IDS[123]).scaling.x = meshScaling[123].x + 1.84 * widthDiff;
    scene.getMeshByName(MESHES_IDS[136]).scaling.x = meshScaling[136].x + 1.84 * widthDiff;

    scene.getMeshByName(MESHES_IDS[4]).position.x = meshPosition[4].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[8]).position.x = meshPosition[8].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[13]).position.x = meshPosition[13].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[15]).position.x = meshPosition[15].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[18]).position.x = meshPosition[18].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[20]).position.x = meshPosition[20].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[35]).position.x = meshPosition[35].x - widthDiff / 2;
    scene.getMeshByName(MESHES_IDS[53]).position.x = meshPosition[53].x + widthDiff / 2;
    scene.getMeshByName(MESHES_IDS[38]).position.x = meshPosition[38].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[39]).position.x = meshPosition[38].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[40]).position.x = meshPosition[38].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[44]).position.x = meshPosition[44].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[45]).position.x = meshPosition[44].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[46]).position.x = meshPosition[44].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[55]).position.x = meshPosition[55].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[58]).position.x = meshPosition[58].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[71]).position.x = meshPosition[71].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[76]).position.x = meshPosition[76].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[78]).position.x = meshPosition[78].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[82]).position.x = meshPosition[82].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[85]).position.x = meshPosition[85].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[110]).position.x = meshPosition[110].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[114]).position.x = meshPosition[114].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[117]).position.x = meshPosition[117].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[130]).position.x = meshPosition[130].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[138]).position.x = meshPosition[138].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[143]).position.x = meshPosition[143].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[144]).position.x = meshPosition[144].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[145]).position.x = meshPosition[145].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[146]).position.x = meshPosition[146].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[147]).position.x = meshPosition[147].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[148]).position.x = meshPosition[148].x + widthDiff;
    scene.getMeshByName(MESHES_IDS[149]).position.x = meshPosition[147].x - widthDiff;
    scene.getMeshByName(MESHES_IDS[150]).position.x = meshPosition[148].x + widthDiff;
};

function outdoorHeightSizeHandler(heightDiff, scene) {

    scene.getMeshByName(MESHES_IDS[2]).scaling.y = meshScaling[2].y + 4 * heightDiff;
    scene.getMeshByName(MESHES_IDS[8]).scaling.y = meshScaling[8].y + 3.55 * heightDiff;
    scene.getMeshByName(MESHES_IDS[20]).scaling.y = meshScaling[20].y + 3.55 * heightDiff;
    scene.getMeshByName(MESHES_IDS[71]).scaling.y = meshScaling[71].y + 3.54 * heightDiff;
    scene.getMeshByName(MESHES_IDS[117]).scaling.y = meshScaling[117].y + 3.54 * heightDiff;
    scene.getMeshByName(MESHES_IDS[143]).scaling.y = meshScaling[143].y + 4.1 * heightDiff;
    scene.getMeshByName(MESHES_IDS[144]).scaling.y = meshScaling[144].y + 4.1 * heightDiff;
    scene.getMeshByName(MESHES_IDS[147]).scaling.y = meshScaling[147].y + 3.55 * heightDiff;
    scene.getMeshByName(MESHES_IDS[148]).scaling.y = meshScaling[148].y + 3.55 * heightDiff;

    scene.getMeshByName(MESHES_IDS[1]).position.y = meshPosition[1].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[3]).position.y = meshPosition[3].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[4]).position.y = meshPosition[4].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[11]).position.y = meshPosition[11].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[13]).position.y = meshPosition[13].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[15]).position.y = meshPosition[15].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[18]).position.y = meshPosition[18].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[22]).position.y = meshPosition[22].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[35]).position.y = meshPosition[35].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[38]).position.y = meshPosition[38].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[39]).position.y = meshPosition[38].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[40]).position.y = meshPosition[38].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[44]).position.y = meshPosition[44].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[45]).position.y = meshPosition[44].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[46]).position.y = meshPosition[44].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[47]).position.y = meshPosition[47].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[53]).position.y = meshPosition[53].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[55]).position.y = meshPosition[55].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[58]).position.y = meshPosition[58].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[65]).position.y = meshPosition[65].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[74]).position.y = meshPosition[74].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[76]).position.y = meshPosition[76].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[78]).position.y = meshPosition[78].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[82]).position.y = meshPosition[82].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[85]).position.y = meshPosition[85].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[107]).position.y = meshPosition[107].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[110]).position.y = meshPosition[110].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[112]).position.y = meshPosition[112].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[114]).position.y = meshPosition[114].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[123]).position.y = meshPosition[123].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[130]).position.y = meshPosition[130].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[136]).position.y = meshPosition[136].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[138]).position.y = meshPosition[138].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[142]).position.y = meshPosition[142].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[145]).position.y = meshPosition[145].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[146]).position.y = meshPosition[146].y + heightDiff;
    scene.getMeshByName(MESHES_IDS[149]).position.y = meshPosition[149].y - heightDiff;
    scene.getMeshByName(MESHES_IDS[150]).position.y = meshPosition[150].y - heightDiff;

    const meshPositions = {
        3: meshPosition[3].y - heightDiff,
        22: meshPosition[22].y - heightDiff,
        35: meshPosition[35].y - heightDiff,
        38: meshPosition[38].y - heightDiff,
        39: meshPosition[39].y - heightDiff,
        40: meshPosition[40].y - heightDiff,
        44: meshPosition[44].y - heightDiff,
        45: meshPosition[45].y - heightDiff,
        46: meshPosition[46].y - heightDiff,
        47: meshPosition[47].y - heightDiff,
        53: meshPosition[53].y - heightDiff,
        65: meshPosition[65].y - heightDiff,
        107: meshPosition[107].y - heightDiff,
        123: meshPosition[123].y - heightDiff,
        142: meshPosition[142].y - heightDiff,
    };

    // shutter.outdoor.meshPositions = { ...meshPositions };
    // shutter.materialScale = (meshScaling[2].y + 3.786 * heightDiff) - shutter.outdoor.minScale;
    // shutter.meshScale = (meshScaling[143].y + 3.9 * heightDiff) - shutter.outdoor.minMeshScale;
    // shutter.materialPosition = meshPosition[1].y + heightDiff - shutter.outdoor.maxPosition;
    // shutter.outdoor.bottomChannelPosition = meshPosition[1].y + heightDiff;
    // getTopSceneHandler(shutter.modelsValue[id]);
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

function calcRotation() { // unused
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
    //scene.useRightHandedSystem = true

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

    boundingBox = BABYLON.BoundingBoxGizmo.MakeNotPickableAndWrapInBoundingBox(scene.meshes[0]);

    scene.clearColor = null;

    // Add a grid material
    const gridMaterial = new BABYLON.GridMaterial("gridMaterial", scene);
    gridMaterial.majorUnitFrequency = 2; // Distance between major grid lines
    gridMaterial.minorUnitVisibility = 0.5; // Visibility of minor lines
    gridMaterial.gridRatio = 0.5; // Size of each grid cell
    gridMaterial.backFaceCulling = false; // Make grid visible from both sides
    gridMaterial.mainColor = new BABYLON.Color4(1, 1, 1, 1); // Grid line color
    gridMaterial.lineColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Secondary line color
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

function scaleOps(scene, babCoords) {
    const openingY = Math.max(babCoords[0].y - babCoords[3].y, babCoords[1].y - babCoords[2].y);
    const openingX = Math.max(babCoords[0].x - babCoords[1].x, babCoords[3].x - babCoords[2].x);

    const boundingBoxVectors = boundingBox.getHierarchyBoundingVectors();
    const minimumBox = boundingBoxVectors.min;
    const maximumBox = boundingBoxVectors.max;

    const boxWidth = maximumBox.x - minimumBox.x;   // Size along the X-axis
    const boxHeight = maximumBox.y - minimumBox.y; // Size along the Y-axis
    const boxDepth = maximumBox.z - minimumBox.z;  // Size along the Z-axis

    console.log("Box Dimensions:");
    console.log(`Width: ${boxWidth}, Height: ${boxHeight}, Depth: ${boxDepth}`);

    boundingBox._scaling.y = openingY / 2;
    boundingBox._scaling.x = openingX / 2;

    setModelMeshScaling(scene);
};

function placeMarkers(scene, viewportSize) {
    const boundingVectors = scene.meshes[0].getHierarchyBoundingVectors();
    const min = boundingVectors.min;
    const max = boundingVectors.max;

    let center = boundingVectors.min.add(boundingVectors).scale(0.5);
    //scene.meshes[0].position.subtractInPlace(center);

    // Step 2: Define the 8 corners of the bounding box
    let corners = [
        new BABYLON.Vector3(min.x, min.y, min.z),
        new BABYLON.Vector3(max.x, min.y, max.z),
        new BABYLON.Vector3(min.x, max.y, min.z),
        new BABYLON.Vector3(max.x, max.y, max.z),
        // new BABYLON.Vector3(min.x, min.y, max.z),
        // new BABYLON.Vector3(max.x, min.y, max.z),
        // new BABYLON.Vector3(min.x, max.y, max.z),
        // new BABYLON.Vector3(max.x, max.y, max.z),
    ];

    // Step 3: Get necessary matrices
    let worldMatrix = scene.meshes[0].getWorldMatrix();
    let viewMatrix = scene.activeCamera.getViewMatrix();
    let projectionMatrix = scene.activeCamera.getProjectionMatrix();

    // Step 4: Project each corner to screen space
    const projectedCorners = []
    let viewport = new BABYLON.Viewport(0, 0, canvas.width, canvas.height);

    // corners.forEach(corner => {
    //     // Transform the point from model space to clip space
    //     //let transformedCorner = BABYLON.Vector3.TransformCoordinates(corner, worldMatrix);
    //     let clipSpace = BABYLON.Vector3.TransformCoordinates(corner, viewMatrix.multiply(projectionMatrix));

    //     // Perspective divide (convert from clip space to NDC)
    //     let ndcX = clipSpace.x / clipSpace.z;
    //     let ndcY = clipSpace.y / clipSpace.z;

    //     // Convert from normalized device coordinates (NDC) to screen space
    //     let screenX = (ndcX * 0.5 + 0.5) * viewport.width;
    //     let screenY = (1.0 - (ndcY * 0.5 + 0.5)) * viewport.height; // Invert Y for screen coordinates

    //     projectedCorners.push(new BABYLON.Vector2(screenX, screenY));
    // });

    for (let i = 0; i < corners.length; i++) {
        //let transformedCorner = BABYLON.Vector3.TransformCoordinates(corners[i], worldMatrix);
        let projectedCorner = BABYLON.Vector3.Project(
            corners[i],
            BABYLON.Matrix.Identity(),
            scene.getTransformMatrix(),
            viewport
        );
        projectedCorners.push(projectedCorner);
    }

    const overlayCanvas = document.getElementById('overlayCanvas');
    const ctx = overlayCanvas.getContext('2d');
    ctx.fillStyle = 'rgb(0, 255, 0)';

    projectedCorners.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });

    var coords = [];
    projectedCorners.forEach(coord => {
        coords.push(coord.x);
        coords.push(coord.y);
    });

    const babCoords = scaleToBabylonSpace(coords, canvas.width, canvas.height, viewportSize.width, viewportSize.height);
    babCoords.forEach(coord => {
        const sphere = BABYLON.MeshBuilder.CreateSphere("point", { diameter: 0.1 }, scene);
        sphere.position = new BABYLON.Vector3(coord.x, coord.y, coord.z);
    });

    // corners.forEach(coord => {
    //     const sphere = BABYLON.MeshBuilder.CreateSphere("point", { diameter: 0.1 }, scene);
    //     sphere.position = new BABYLON.Vector3(coord.x, coord.y, coord.z);
    // });
};

function calculateAngleBetweenLines(p1, p2, q1, q2) {
    // Calculate the direction vectors of the two lines
    let v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    let v2 = { x: q2.x - q1.x, y: q2.y - q1.y };

    console.log("line 1:", v1);
    console.log("line 2:", v2);

    // Calculate the dot product of the vectors
    let dotProduct = v1.x * v2.x + v1.y * v2.y;

    // Calculate the magnitudes of the vectors
    let magnitudeV1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    let magnitudeV2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    // Avoid division by zero
    if (magnitudeV1 === 0 || magnitudeV2 === 0) {
        throw new Error("Zero-length vector encountered.");
    }

    // Calculate the cosine of the angle
    let cosTheta = dotProduct / (magnitudeV1 * magnitudeV2);

    // Clamp the value to avoid precision issues
    cosTheta = Math.max(-1, Math.min(1, cosTheta));

    // Calculate the angle in radians and convert to degrees
    let angleRadians = Math.acos(cosTheta);
    let angleDegrees = angleRadians * (180 / Math.PI);

    return angleDegrees;
};

function beginFit(coords) {
    let areSidesPara = true; // could reverse
    let leftRightAngle = calculateAngleBetweenLines(coords[0], coords[3], coords[1], coords[2]);
    let leftInclination = calculateAngleBetweenLines(coords[0], coords[3], {x: 0, y: 0}, {x: 1000, y: 0});
    let rightInlination = calculateAngleBetweenLines(coords[1], coords[2], {x: 0, y: 0}, {x: 1000, y: 0});

    let diff = rightInlination - leftInclination;

    // if ( angle > 0.001 || angle < -0.001) {
    //     areSidesPara = false;
    // }
}

(async () => {
    const scene = await createScene();
    console.log(scene.meshes);

    setGlobalMeshPositionAndScale(scene);

    const axesViewer = new BABYLON.AxesViewer(scene);

    const camera = scene.cameras[0];
    const depth = camera.radius; // Distance from the camera
    const viewportSize = getViewportSizeAtDepth(camera, scene, depth);
    console.log(`Viewport at depth ${depth}: Width = ${viewportSize.width}, Height = ${viewportSize.height}`);

    const coords = [363.2151424287856, 92.14992503748127, 955.1011994002998, 203.2023988005997, 955.1011994002998, 533.9970014992504, 384.48050974512745, 692.3058470764618];
    const coordsJ = [];
    for (let i = 0; i < coords.length; i += 2) {
        coordsJ.push({ x: coords[i], y: coords[i + 1]});
    }
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
    
    const quaternion =  new BABYLON.Quaternion.FromEulerAngles(
        BABYLON.Tools.ToRadians(0),
        BABYLON.Tools.ToRadians(-75),
        BABYLON.Tools.ToRadians(0)
    );

    // console.log(quaternion);
    scene.meshes[48].rotationQuaternion = quaternion;

    // console.log(scene.meshes[0].rotationQuaternion);

    setTimeout(function() { scaleOps(scene, babCoords); }, 1000);
    setTimeout(function() { placeMarkers(scene, viewportSize); }, 1100);

    beginFit(coordsJ);

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
})();