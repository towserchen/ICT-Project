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

// direction: "n" for negative, will grow the blind towards the negative x or y direction. 
// "p" for positive, will grow the blind towards the positive x or y direction.
function scaleFromOneSide(mesh, scaleFactor, scaleAxis = "y", direction = "n", scene) {
    let boundingBoxInfo = mesh.getBoundingInfo();
    let boundingVectors = scene.meshes[0].getHierarchyBoundingVectors();
    let oMin = boundingVectors.min;
    let oMax = boundingVectors.max;

    console.log("BB o max: ", boundingBoxInfo.boundingBox.maximumWorld);
    console.log("oMax: ", oMax);

    // Calculate the size of the model
    const originalWidth = oMax.x - oMin.x;   // Size along the X-axis
    const originalHeight = oMax.y - oMin.y; // Size along the Y-axisw

    // 2. Store the original position to adjust it later
    const originalPosition = mesh.position.clone();

    const originalModelCorners = getRotatedRectangleCorners(boundingBox.rotationQuaternion, scene);

    // 3. Define scale vector (default is uniform scaling)
    let scaleVector = new BABYLON.Vector3(0, 0, 0);
    if (scaleAxis === "x") {
        scaleVector.x = scaleFactor;
    } else if (scaleAxis === "y") {
        scaleVector.y = scaleFactor;
    } else if (scaleAxis === "z") {
        scaleVector.z = scaleFactor;
    }

    // 4. Apply scaling to the mesh
    mesh.scaling.addInPlace(scaleVector);

    mesh.computeWorldMatrix(true);

    setModelMeshScaling(scene);

    scene.meshes[0].computeWorldMatrix(true);

    boundingBoxInfo = mesh.getBoundingInfo();

    boundingVectors = scene.meshes[0].getHierarchyBoundingVectors();
    let nMin = boundingVectors.min;
    let nMax = boundingVectors.max;

    console.log("BB max: ", boundingBoxInfo.boundingBox.maximumWorld);
    console.log("nMax: ", nMax);

    // Calculate the size of the model
    const newWidth = nMax.x - nMin.x;   // Size along the X-axis
    const newHeight = nMax.y - nMin.y; // Size along the Y-axisw

    // 6. Calculate the shift needed to keep one side fixed
    let shiftVector = new BABYLON.Vector3(0, 0, 0);
    if (scaleAxis === "x") {
        if (direction === "p") {
            shiftVector.x = (nMax.x - oMax.x);
        } else if (direction === "n") {
            shiftVector.x = (nMin.x - oMin.x);
        }
    } else if (scaleAxis === "y") {
        if (direction === "n") {
            shiftVector.y = (nMax.y - oMax.y);
        } else if (direction === "p") {
            shiftVector.y = Math.abs(nMin.y - oMin.y);
        }
    }

    console.log("Shift Vector: ", shiftVector);

    // 7. Move the mesh in the opposite direction of the scale expansion
    if (direction === "n") {
        mesh.position = originalPosition.subtract(shiftVector);
    } else if (direction === "p") {
        mesh.position = originalPosition.addInPlace(shiftVector);
    }

    let zOffset = scene.meshes[0]._absolutePosition.z - getZValue(originalModelCorners[0], originalModelCorners[1], originalModelCorners[2], mesh.position.x, mesh.position.y);

    mesh.computeWorldMatrix(true);
    boundingBoxInfo = mesh.getBoundingInfo();
    scene.meshes[0].computeWorldMatrix(true);
    boundingVectors = scene.meshes[0].getHierarchyBoundingVectors();
    //Min = boundingVectors.min;
    nMax = boundingVectors.max;
    console.log("BB f max: ", boundingBoxInfo.boundingBox.maximumWorld);
    console.log("fMax: ", nMax);
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

function scaleOps(scene, babCoords) {
    const openingY = Math.max(babCoords[0].y - babCoords[3].y, babCoords[1].y - babCoords[2].y);
    const openingX = Math.max(babCoords[0].x - babCoords[1].x, babCoords[3].x - babCoords[2].x);

    let boundingBoxVectors = boundingBox.getHierarchyBoundingVectors();
    let minimumBox = boundingBoxVectors.min;
    let maximumBox = boundingBoxVectors.max;

    let boxWidth = maximumBox.x - minimumBox.x;   // Size along the X-axis
    let boxHeight = maximumBox.y - minimumBox.y; // Size along the Y-axis
    let boxDepth = maximumBox.z - minimumBox.z;  // Size along the Z-axis

    console.log("Box Dimensions:");
    console.log(`Width: ${boxWidth}, Height: ${boxHeight}, Depth: ${boxDepth}`);
    console.log("Box scaling: ", boundingBox._scaling);

    boundingBox._scaling.y = openingY / 4;
    boundingBox._scaling.x = openingX / 2;

    setModelMeshScaling(scene);

    boundingBoxVectors = boundingBox.getHierarchyBoundingVectors();
    minimumBox = boundingBoxVectors.min;
    maximumBox = boundingBoxVectors.max;

    boxWidth = maximumBox.x - minimumBox.x;   // Size along the X-axis
    boxHeight = maximumBox.y - minimumBox.y; // Size along the Y-axis
    boxDepth = maximumBox.z - minimumBox.z;  // Size along the Z-axis

    console.log("Box Dimensions:");
    console.log(`Width: ${boxWidth}, Height: ${boxHeight}, Depth: ${boxDepth}`);
    console.log("Box scaling: ", boundingBox._scaling);
};

function placeMarkers(scene, viewportSize) {
    let corners = getRotatedRectangleCorners(boundingBox.rotationQuaternion, scene);

    const projectedCorners = []
    let viewport = new BABYLON.Viewport(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < corners.length; i++) {
        let projectedCorner = BABYLON.Vector3.Project(
            corners[i],
            BABYLON.Matrix.Identity(),
            scene.getTransformMatrix(),
            viewport
        );
        projectedCorners.push(projectedCorner);
    }

    const testCanvas = document.getElementById('testCanvas');
    const ctx = testCanvas.getContext('2d');
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

    corners.forEach(coord => {
        const sphere = BABYLON.MeshBuilder.CreateSphere("point", { diameter: 0.1 }, scene);
        sphere.position = new BABYLON.Vector3(coord.x, coord.y, coord.z);
    });
};

function clearMarkers(scene) {
    // Get all meshes named "point"
    let pointMeshes = scene.meshes.filter(mesh => mesh.name === "point");

    // Remove the last 8 meshes
    for (let i = pointMeshes.length - 8; i < pointMeshes.length; i++) {
        if (i >= 0) {
            pointMeshes[i].dispose();
        }
    }

    const testCanvas = document.getElementById('testCanvas');
    const ctx = testCanvas.getContext('2d');
    ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
};

function getProjectedCorners(scene) {
    let corners = getRotatedRectangleCorners(boundingBox.rotationQuaternion, scene);
    const projectedCorners = []
    let viewport = new BABYLON.Viewport(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < corners.length; i++) {
        let projectedCorner = BABYLON.Vector3.Project(
            corners[i],
            BABYLON.Matrix.Identity(),
            scene.getTransformMatrix(),
            viewport
        );
        projectedCorners.push(projectedCorner);
    }

    return projectedCorners;
};

function getDimensions(scene) {
    const saveQuaternion = boundingBox.rotationQuaternion || boundingBox.rotation.toQuaternion();
    boundingBox.rotationQuaternion = BABYLON.Quaternion.Zero();
    boundingBox.computeWorldMatrix(true);
    scene.meshes[0].computeWorldMatrix(true);

    const boundingVectors = scene.meshes[0].getHierarchyBoundingVectors();
    let localMin = boundingVectors.min;
    let localMax = boundingVectors.max;

    // Calculate the size of the model
    const width = localMax.x - localMin.x;   // Size along the X-axis
    const height = localMax.y - localMin.y; // Size along the Y-axis
    const depth = localMax.z - localMin.z;  // Size along the Z-axis
    const dimensions = localMax.subtract(localMin);

    console.log("Model Dimensions from func:");
    console.log(`Width: ${width}, Height: ${height}, Depth: ${depth}`);

    boundingBox.rotationQuaternion = saveQuaternion;
    boundingBox.computeWorldMatrix(true);
    scene.meshes[0].computeWorldMatrix(true);

    return { dimensions, localMin, localMax };
};

function getRotatedRectangleCorners(rotationQuaternion, scene) {
    // Step 1: Define the rectangle in local space (assuming it's in the XY plane)
    
    let { _, localMin, localMax } = getDimensions(scene);
    
    let localCorners = [
        new BABYLON.Vector3(localMax.x, localMax.y, scene.meshes[0].getAbsolutePivotPoint().z),
        new BABYLON.Vector3(localMin.x, localMax.y, scene.meshes[0].getAbsolutePivotPoint().z),
        new BABYLON.Vector3(localMin.x, localMin.y, scene.meshes[0].getAbsolutePivotPoint().z),
        new BABYLON.Vector3(localMax.x, localMin.y, scene.meshes[0].getAbsolutePivotPoint().z),
    ];

    // Step 3: Apply rotation to each corner
    let rotatedCorners = [];

    for (let i = 0; i < localCorners.length; i++) {
        let temp = new BABYLON.Vector3();
        localCorners[i].rotateByQuaternionAroundPointToRef(rotationQuaternion, scene.meshes[0].getAbsolutePivotPoint(), temp);
        rotatedCorners.push(temp);
    }

    // Step 4: Compute the bounding box of the rotated rectangle
    let minX = Math.min(...rotatedCorners.map(c => c.x));
    let maxX = Math.max(...rotatedCorners.map(c => c.x));
    let minY = Math.min(...rotatedCorners.map(c => c.y));
    let maxY = Math.max(...rotatedCorners.map(c => c.y));
    let minZ = Math.min(...rotatedCorners.map(c => c.z));
    let maxZ = Math.max(...rotatedCorners.map(c => c.z));

    // Step 5: Compute required translation to fit the given bounding box
    let translateX = localMin.x - minX + (localMax.x - maxX) / 2;
    let translateY = localMin.y - minY + (localMax.y - maxY) / 2;
    let translateZ = localMin.z - minZ + (localMax.z - maxZ) / 2;
    let translationVector = new BABYLON.Vector3(translateX, translateY, translateZ);

    // Step 6: Apply translation
    // let finalCorners = rotatedCorners.map(corner => corner.add(translationVector));

    // rotatedCorners.forEach(coord => {
    //     const sphere = BABYLON.MeshBuilder.CreateSphere("point", { diameter: 0.1 }, scene);
    //     sphere.position = new BABYLON.Vector3(coord.x, coord.y, coord.z);
    // });

    console.log("translationVector: ", translationVector);

    return rotatedCorners;
};

function calculateAngleBetweenLines(p1, p2, q1, q2) {
    // Calculate the direction vectors of the two lines
    let v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    let v2 = { x: q2.x - q1.x, y: q2.y - q1.y };

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

function getYValue(x1, y1, x2, y2, x) {
    if (x1 === x2) {
        throw new Error("The line is vertical; y cannot be determined for a given x.");
    }
    
    let m = (y2 - y1) / (x2 - x1); // Calculate slope
    let b = y1 - m * x1; // Calculate y-intercept
    
    return m * x + b; // Compute y for given x
};

function getZValue(point1, point2, point3, x, y) {
    const { x: x1, y: y1, z: z1 } = point1;
    const { x: x2, y: y2, z: z2 } = point2;
    const { x: x3, y: y3, z: z3 } = point3;

    // Compute two vectors on the plane
    const v1 = { x: x2 - x1, y: y2 - y1, z: z2 - z1 };
    const v2 = { x: x3 - x1, y: y3 - y1, z: z3 - z1 };

    // Compute the normal vector (adjusted for left-handed system)
    const A = -(v1.y * v2.z - v1.z * v2.y);
    const B = -(v1.z * v2.x - v1.x * v2.z);
    const C = -(v1.x * v2.y - v1.y * v2.x);

    if (C === 0) {
        throw new Error("The plane is vertical, z cannot be determined for a given x, y.");
    }

    // Compute D using one of the points
    const D = -(A * x1 + B * y1 + C * z1);

    // Solve for z in Ax + By + Cz + D = 0
    return (-A * x - B * y - D) / C;
};

function beginFit2(babCoords, coords, scene, viewportSize) {
    let YmaxOrign = getYValue(babCoords[0].x, babCoords[0].y, babCoords[1].x, babCoords[1].y, 0);
    let YminOrign = getYValue(babCoords[3].x, babCoords[3].y, babCoords[2].x, babCoords[2].y, 0);
    let boundingBoxInfo = scene.meshes[0].getHierarchyBoundingVectors();
    let min = boundingBoxInfo.min;
    let max = boundingBoxInfo.max;
    let yBottomDiff = YminOrign - min.y;
    let yTopDiff = YmaxOrign - max.y;

    scaleFromOneSide(boundingBox, Math.abs(yBottomDiff), "y", "n",scene);
    scaleFromOneSide(boundingBox, Math.abs(yTopDiff), "y", "p", scene);
    placeMarkers(scene, viewportSize);

    let topInclination = calculateAngleBetweenLines(coords[0], coords[1], {x: 0, y: 0}, {x: 0, y: 1000});
    let bottomInclination = calculateAngleBetweenLines(coords[3], coords[2], {x: 0, y: 0}, {x: 0, y: 1000});

    topInclination = Math.abs(topInclination - 90);
    bottomInclination = Math.abs(bottomInclination - 90);

    let topBottomDiff = Math.abs(topInclination - bottomInclination);

    let modelCorners = getProjectedCorners(scene);

    if (topBottomDiff > 0) {
        let bottomDiff = calculateAngleBetweenLines(coords[3], coords[2], modelCorners[2], modelCorners[3]);
        let topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);

        while (bottomDiff > topDiff + 0.5 || bottomDiff < topDiff - 0.5) {
            // // Create a small rotation quaternion for the x-axis
            // let smallRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -0.01); // Adjust the angle as needed
            // // Apply the small rotation to the bounding box's current rotation quaternion
            // boundingBox.rotationQuaternion = smallRotation.multiply(boundingBox.rotationQuaternion);

            boundingBox.rotate(BABYLON.Axis.Y, -0.01, BABYLON.Space.LOCAL);

            boundingBox.computeWorldMatrix(true);
            modelCorners = getProjectedCorners(scene);
            bottomDiff = calculateAngleBetweenLines(coords[3], coords[2], modelCorners[2], modelCorners[3]);
            topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);

            const camera = scene.cameras[0];
            const depth = camera.radius; // Distance from the camera
            const viewportSize = getViewportSizeAtDepth(camera, scene, depth);
            clearMarkers(scene);
            placeMarkers(scene, viewportSize);
        }

        while (topDiff > 0.1) {
            boundingBox.rotate(BABYLON.Axis.Z, 0.001, BABYLON.Space.LOCAL);
    
            boundingBox.computeWorldMatrix(true);
            modelCorners = getProjectedCorners(scene);
            topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);

            const camera = scene.cameras[0];
            const depth = camera.radius; // Distance from the camera
            const viewportSize = getViewportSizeAtDepth(camera, scene, depth);
            clearMarkers(scene);
            placeMarkers(scene, viewportSize);
        }
        
        console.log("exit");

        scene.render();
    
        boundingBoxInfo = scene.meshes[0].getHierarchyBoundingVectors();
        max = boundingBoxInfo.max;
        min = boundingBoxInfo.min;
        let xLeftDiff = Math.max(...babCoords.map(obj => obj.x)) - max.x;
        let xRightDiff = Math.min(...babCoords.map(obj => obj.x)) - min.x;

        //scaleFromOneSide(boundingBox, Math.abs(xLeftDiff), "x", "p", scene);
        // scaleFromOneSide(boundingBox, Math.abs(xRightDiff), "x", "n", scene);
    }

};

function beginFit1(coords, scene) {
    let areSidesPara = true; // could reverse
    let leftRightAngle = calculateAngleBetweenLines(coords[0], coords[3], coords[1], coords[2]);
    let leftInclination = calculateAngleBetweenLines(coords[0], coords[3], {x: 0, y: 0}, {x: 1000, y: 0});
    let rightInlination = calculateAngleBetweenLines(coords[1], coords[2], {x: 0, y: 0}, {x: 1000, y: 0});

    let diff = rightInlination - leftInclination;

    if ( leftRightAngle > 0.001 || leftRightAngle < -0.001) {
        areSidesPara = false;
    }

    let modelCorners = getProjectedCorners(scene); 

    if (!areSidesPara) {
        let leftSideDiff = calculateAngleBetweenLines(coords[0], coords[3], modelCorners[1], modelCorners[2]); // TODO: fix this as the corners are in a differnt order
        if (diff > 0) {
            while (leftSideDiff > (diff / 2)) {
                // // Create a small rotation quaternion for the x-axis
                // let smallRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, 0.01); // Adjust the angle as needed
                // // Apply the small rotation to the bounding box's current rotation quaternion
                // boundingBox.rotationQuaternion = smallRotation.multiply(boundingBox.rotationQuaternion);

                boundingBox.rotate(BABYLON.Axis.X, -0.01, BABYLON.Space.LOCAL);

                boundingBox.computeWorldMatrix(true);
                modelCorners = getProjectedCorners(scene);
                leftSideDiff = calculateAngleBetweenLines(coords[0], coords[3], modelCorners[1], modelCorners[2]);
                
                const camera = scene.cameras[0];
                const depth = camera.radius; // Distance from the camera
                const viewportSize = getViewportSizeAtDepth(camera, scene, depth);
                clearMarkers(scene);
                placeMarkers(scene, viewportSize);
            }

            if (leftInclination < 90) {
                while (leftSideDiff > 0.1) {
                    // // Create a small rotation quaternion for the x-axis
                    // let smallRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z, -0.001); // Adjust the angle as needed
                    // // Apply the small rotation to the bounding box's current rotation quaternion
                    // boundingBox.rotationQuaternion = smallRotation.multiply(boundingBox.rotationQuaternion);

                    boundingBox.rotate(BABYLON.Axis.Z, 0.001, BABYLON.Space.LOCAL);
    
                    boundingBox.computeWorldMatrix(true);
                    modelCorners = getProjectedCorners(scene);
                    leftSideDiff = calculateAngleBetweenLines(coords[0], coords[3], modelCorners[1], modelCorners[2]);
    
                    const camera = scene.cameras[0];
                    const depth = camera.radius; // Distance from the camera
                    const viewportSize = getViewportSizeAtDepth(camera, scene, depth);
                    clearMarkers(scene);
                    placeMarkers(scene, viewportSize);
                }
            }

            let topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);

            // while (topDiff > 1) {
            //     // // Create a small rotation quaternion for the x-axis
            //     // let smallRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -0.01); // Adjust the angle as needed
            //     // // Apply the small rotation to the bounding box's current rotation quaternion
            //     // boundingBox.rotationQuaternion = smallRotation.multiply(boundingBox.rotationQuaternion);

            //     boundingBox.rotate(BABYLON.Axis.Y, -0.01, BABYLON.Space.LOCAL);

            //     boundingBox.computeWorldMatrix(true);
            //     modelCorners = getProjectedCorners(scene);
            //     topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);
            //     console.log("top diff: ", topDiff);

            //     const camera = scene.cameras[0];
            //     const depth = camera.radius; // Distance from the camera
            //     const viewportSize = getViewportSizeAtDepth(camera, scene, depth);
            //     clearMarkers(scene);
            //     placeMarkers(scene, viewportSize);
            // }
        }
    }

    let modelrightInlination = calculateAngleBetweenLines(modelCorners[0], modelCorners[3], {x: 0, y: 0}, {x: 1000, y: 0});
    let modelLeftInclination = calculateAngleBetweenLines(modelCorners[1], modelCorners[2], {x: 0, y: 0}, {x: 1000, y: 0});
    let fTopDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);
    console.log("here");
}

function begin3DTransformFit(coords, scene) {
    let recP = getRotatedRectangleCorners(boundingBox.rotationQuaternion, scene);

    const rectanglePoints = [
        new BABYLON.Vector2(recP[1].x, recP[1].y),  // Bottom-left
        new BABYLON.Vector2(recP[0].x, recP[0].y),  // Bottom-right
        new BABYLON.Vector2(recP[3].x, recP[3].y),  // Top-right
        new BABYLON.Vector2(recP[2].x, recP[2].y)   // Top-left
    ];
    
    // Step 2: Define quadrilateral target points (After transformation)
    const quadPoints = [
        new BABYLON.Vector2(coords[0].x, coords[0].y), // Corresponds to rect[0]
        new BABYLON.Vector2(coords[1].x, coords[1].y), // Corresponds to rect[1]
        new BABYLON.Vector2(coords[2].x, coords[2].y), // Corresponds to rect[2]
        new BABYLON.Vector2(coords[3].x, coords[3].y)   // Corresponds to rect[3]
    ];
    
    function computeBestFit3DTransform(reference, target) {
        let A = [];
        let B = [];
    
        for (let i = 0; i < reference.length; i++) {
            A.push([reference[i].x, reference[i].y, 1]);
            B.push([target[i].x, target[i].y, 1]);
        }
    
        // Compute A^T * B
        let AT = numeric.transpose(A);
        let M = numeric.dot(AT, B);
    
        // Compute Singular Value Decomposition (SVD)
        let { U, S, V } = numeric.svd(M);
    
        // Compute Rotation Matrix: R = V * U^T
        let R = numeric.dot(V, numeric.transpose(U));
    
        // Extract Scaling Factors (Non-Uniform Scaling)
        // let scaleX = numeric.norm2(numeric.sub(target[1], target[0])) / numeric.norm2(numeric.sub(reference[1], reference[0]));
        // let scaleY = numeric.norm2(numeric.sub(target[2], target[1])) / numeric.norm2(numeric.sub(reference[2], reference[1]));
    
        return R;
    }

    let R = computeBestFit3DTransform(rectanglePoints, quadPoints);
    let rotationMatrix = BABYLON.Matrix.FromArray([
        R[0][0], R[0][1], R[0][2], 0,
        R[1][0], R[1][1], R[1][2], 0,
        R[2][0], R[2][1], R[2][2], 0,
        0, 0, 0, 1
    ]);
    let rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
    boundingBox.rotationQuaternion = rotationQuaternion;
};

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
        BABYLON.Tools.ToRadians(180),
        BABYLON.Tools.ToRadians(0)
    );

    // console.log(scene.meshes[0].rotationQuaternion);
    console.log("local root pp: ", scene.meshes[0].getPivotPoint());
    console.log("absolute root pp: ", scene.meshes[0].getAbsolutePivotPoint());
    console.log("local box pp: ", scene.meshes[48].getPivotPoint());
    console.log("absolute box pp: ", scene.meshes[48].getAbsolutePivotPoint());

    engine.runRenderLoop(() => {
        scene.render();
    });

    scaleOps(scene, babCoords);
    scene.meshes[48].rotationQuaternion = quaternion;

    scene.onReadyObservable.addOnce(() => {
        placeMarkers(scene, viewportSize);
        beginFit2(babCoords, coordsJ, scene, viewportSize);
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
})();