// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Initialize Babylon engine
const engine = new BABYLON.Engine(canvas, true);

let rootMeshScale = new BABYLON.Vector3(0.9, -0.73, -3.5);
let boundingBoxAbsoluteScale = new BABYLON.Vector3(1.44, 1, 0.29);
let rootStartMeshScale = boundingBoxAbsoluteScale.divide(rootMeshScale).multiply(new BABYLON.Vector3(1, -1, -1));
let boundingBox = null;
let gizmo = null;
let rootMeshAbsoluteScale = new BABYLON.Vector3(1,-1,1);
let meshScaling = {};
let meshPosition = {};

const scaleDirection = {positive: 1, negative: 0};

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

async function loadModelWithRetry( // not needed for prod
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

const createScene = async () => { // not needed for prod
    const scene = new BABYLON.Scene(engine);
    //scene.useRightHandedSystem = true

    const camera = new BABYLON.ArcRotateCamera(
        "ArcRotateCamera",
        Math.PI,
        Math.PI / 2,
        6,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.minZ = 0.1;
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
    boundingBox.position = new BABYLON.Vector3(0, 0, 0);
    boundingBox._absolutePosition = new BABYLON.Vector3(0, 0, 0);

    // let utilityLayer = new BABYLON.UtilityLayerRenderer(scene);
	// gizmo = new BABYLON.BoundingBoxGizmo(BABYLON.Color3.FromHexString('#0984e3'), utilityLayer);
    // gizmo.fixedDragMeshScreenSize = true;
    // gizmo.attachedMesh = boundingBox;

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
    const fov = camera.fov; // get the field of view (FOV) in radians
    const aspectRatio = scene.getEngine().getAspectRatio(camera);
    
    const height = 2 * Math.tan(fov / 2) * depth; // calculate the viewport height and width at the radius depth
    const width = height * aspectRatio;
    
    return { width, height };
}

function scaleToBabylonSpace(cornerCoords, imageWidth, imageHeight, viewportWidth, viewportHeight) {
    const babylonCoords = [];
    for (let i = 0; i < cornerCoords.length; i += 2) {
        const x = cornerCoords[i];
        const y = cornerCoords[i + 1];

        // normalize coordinates and scale to Babylon space
        const babylonX = -(x / imageWidth - 0.5) * viewportWidth;
        const babylonY = -((y / imageHeight - 0.5) * viewportHeight); // invert Y for Babylon space

        babylonCoords.push({ x: 0, y: babylonY, z: babylonX }); // assuming x = 0 for a flat plane (x - > z swap)
    }
    return babylonCoords;
}

function setGlobalMeshPositionAndScale(scene) { // not needed for prod
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

// mimics the scaling perfromed by the gizmo
function scaleFromOneSide2(scene, distance, scaleAxis, direction) {
    const originalParent = scene.meshes[48].parent;
    const anchor = new BABYLON.TransformNode("anchor");
    anchor.scaling = new BABYLON.Vector3(1, 1, 1);
    anchor.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(anchor.rotation.y, anchor.rotation.x, anchor.rotation.z);
    anchor.rotationQuaternion.copyFrom(scene.meshes[48].rotationQuaternion);
    anchor.position.copyFrom(scene.meshes[48].absolutePosition);

    let modelCorners = getModelBabCorners(boundingBox.rotationQuaternion, scene); // model corners in babylon world space

    BABYLON.PivotTools._RemoveAndStorePivotPoint(scene.meshes[48]);
    const deltaScale = new BABYLON.Vector3(1, 1, 1);
    if (scaleAxis === BABYLON.Axis.X) {
        // let targetScale = scene.meshes[48].scaling.x + (distance * (3.175703287124634 / 2.9016152629628778)); // need to replace with ratio calc instead of magic numbers
        let targetScale = scene.meshes[48].scaling.x + distance; // the x scale value we are targeting
        deltaScale.x = targetScale / scene.meshes[48].scaling.x; // the actual needed change in scale adhereing to parent.scaling * child.scaling = targetScale
        if (direction === scaleDirection.positive) {             // set the point to scale from according to direction
            let midPointRight = getMidpoint(modelCorners[0], modelCorners[3]);
            anchor.position = new BABYLON.Vector3(midPointRight.x, midPointRight.y, midPointRight.z);
        } else if (direction === scaleDirection.negative) {
            let midPointLeft = getMidpoint(modelCorners[1], modelCorners[2]);
            anchor.position = new BABYLON.Vector3(midPointLeft.x, midPointLeft.y, midPointLeft.z);
        }
    } else if (scaleAxis === BABYLON.Axis.Y) {
        // let targetScale = scene.meshes[48].scaling.y + (distance * (3.175703287124634 / 2.9016152629628778)); // need to replace with ratio calc instead of magic numbers
        let targetScale = scene.meshes[48].scaling.y + distance; // the y scale value we are targeting
        deltaScale.y = targetScale / scene.meshes[48].scaling.y; // the actual needed change in scale adhereing to parent.scaling * child.scaling = targetScale
        if (direction === scaleDirection.positive) {             // set the point to scale from according to direction
            let midPoint = getMidpoint(modelCorners[2], modelCorners[3]);
            anchor.position = new BABYLON.Vector3(midPoint.x, midPoint.y, midPoint.z);
        } else if (direction === scaleDirection.negative) {
            let midPoint = getMidpoint(modelCorners[1], modelCorners[0]);
            anchor.position = new BABYLON.Vector3(midPoint.x, midPoint.y, midPoint.z);
        }
    }

    anchor.addChild(scene.meshes[48]);
    anchor.scaling = deltaScale;
    anchor.removeChild(scene.meshes[48]);
    scene.meshes[48].setParent(originalParent);
    BABYLON.PivotTools._RestorePivotPoint(scene.meshes[48]);

    scene.meshes[48].computeWorldMatrix(true);
    scene.meshes[0].computeWorldMatrix(true);
};

function setModelMeshScaling(scene) { // not needed for prod
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

function outdoorWidthSizeHandler(widthDiff, scene) { // not needed for prod
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

function outdoorHeightSizeHandler(heightDiff, scene) { // not needed for prod

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

function scaleOps(scene, babCoords) { // not needed in prod
    let boundingBoxVectors = boundingBox.getHierarchyBoundingVectors();
    let minimumBox = boundingBoxVectors.min;
    let maximumBox = boundingBoxVectors.max;

    let boxWidth = maximumBox.x - minimumBox.x;   // Size along the X-axis
    let boxHeight = maximumBox.y - minimumBox.y; // Size along the Y-axis
    let boxDepth = maximumBox.z - minimumBox.z;  // Size along the Z-axis

    console.log("Default box Dimensions:");
    console.log(`Width: ${boxWidth}, Height: ${boxHeight}, Depth: ${boxDepth}`);
    console.log("Box scaling: ", boundingBox._scaling);

    boundingBox._scaling.y = 2.5;
    boundingBox._scaling.x = 2.5;

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

function placeMarkers(scene, viewportSize) { // not needed in prod
    let corners = getModelBabCorners(boundingBox.rotationQuaternion, scene);

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

function clearMarkers(scene) { // not needed in prod
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

function getProjectedCorners(scene, rotateQuaternion = boundingBox.rotationQuaternion) {
    const corners = getModelBabCorners(rotateQuaternion, scene); // model corners in babylon world space
    const projectedCorners = []
    const viewport = new BABYLON.Viewport(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < corners.length; i++) {
        let projectedCorner = BABYLON.Vector3.Project( // projects the corners position to screen space (as the user see it)
            corners[i],
            BABYLON.Matrix.Identity(),
            scene.getTransformMatrix(),
            viewport
        );
        projectedCorners.push(projectedCorner);
    }

    return projectedCorners;
};

// works by getting the local extremes (not technically but for all intents and purposes) of the model and constructing the points of a rectangle from them then applying the model's current rotation to rectanlge points to get the model's world corner coordinates
function getModelBabCorners(rotationQuaternion, scene) {    
    const { localMin, localMax } = getDimensions(scene); // get the local dimensions / extremes
    
    const localCorners = [ // construct the points of a rectangle
        new BABYLON.Vector3(localMax.x, localMax.y, scene.meshes[48].getAbsolutePivotPoint().z), 
        new BABYLON.Vector3(localMin.x, localMax.y, scene.meshes[48].getAbsolutePivotPoint().z),
        new BABYLON.Vector3(localMin.x, localMin.y, scene.meshes[48].getAbsolutePivotPoint().z),
        new BABYLON.Vector3(localMax.x, localMin.y, scene.meshes[48].getAbsolutePivotPoint().z),
    ];

    const rotatedCorners = [];

    for (let i = 0; i < localCorners.length; i++) { // rotate rectangle points by model current rotation (or whatever rotation is passed)
        let temp = new BABYLON.Vector3();
        localCorners[i].rotateByQuaternionAroundPointToRef(rotationQuaternion, scene.meshes[48].getAbsolutePivotPoint(), temp);
        rotatedCorners.push(temp);
    }

    return rotatedCorners;
};

// gets the dimensions of the model by setting its rotation to zero then getting the model's extremes and then re-applying the original rotation
function getDimensions(scene) {
    const saveQuaternion = boundingBox.rotationQuaternion || boundingBox.rotation.toQuaternion();
    boundingBox.rotationQuaternion = BABYLON.Quaternion.Zero();
    boundingBox.computeWorldMatrix(true);
    scene.meshes[0].computeWorldMatrix(true);

    const boundingVectors = scene.meshes[0].getHierarchyBoundingVectors();
    let localMin = boundingVectors.min;
    let localMax = boundingVectors.max;

    const width = localMax.x - localMin.x;   
    const height = localMax.y - localMin.y; 
    const depth = localMax.z - localMin.z;

    console.log("Model Dimensions from func:");
    console.log(`Width: ${width}, Height: ${height}, Depth: ${depth}`);

    boundingBox.rotationQuaternion = saveQuaternion;
    boundingBox.computeWorldMatrix(true);
    scene.meshes[0].computeWorldMatrix(true);

    return { localMin, localMax };
};

function calculateAngleBetweenLines(p1, p2, q1, q2) {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y }; // calculate the direction vectors of the two lines
    const v2 = { x: q2.x - q1.x, y: q2.y - q1.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y; // calculate the dot product of the vectors
    const magnitudeV1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y); // calculate the magnitudes of the vectors
    const magnitudeV2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (magnitudeV1 === 0 || magnitudeV2 === 0) { // avoid division by zero
        throw new Error("Zero-length vector encountered.");
    }

    let cosTheta = dotProduct / (magnitudeV1 * magnitudeV2); // calculate the cosine of the angle

    cosTheta = Math.max(-1, Math.min(1, cosTheta)); // clamp the value to avoid precision issues

    const angleRadians = Math.acos(cosTheta); // calculate the angle in radians and convert to degrees
    const angleDegrees = angleRadians * (180 / Math.PI);

    return angleDegrees;
};

function getMidpoint(point1, point2) {
    return {
        x: (point1.x + point2.x) / 2,
        y: (point1.y + point2.y) / 2,
        z: (point1.z + point2.z) / 2
    };
};

function getLineLength(point1, point2) {
    return Math.sqrt(
        Math.pow(point2.x - point1.x, 2) +
        Math.pow(point2.y - point1.y, 2) +
        Math.pow(point2.z - point1.z, 2)
    );
};

function getPlaneLineIntersection(planePoint1, planePoint2, planePoint3, linePoint1, linePoint2) {
    const { x: x1, y: y1, z: z1 } = planePoint1;
    const { x: x2, y: y2, z: z2 } = planePoint2;
    const { x: x3, y: y3, z: z3 } = planePoint3;

    const v1 = { x: x2 - x1, y: y2 - y1, z: z2 - z1 }; // compute two vectors on the plane
    const v2 = { x: x3 - x1, y: y3 - y1, z: z3 - z1 };

    const A = -(v1.y * v2.z - v1.z * v2.y);  // compute the normal vector (negated cross product for left-handed system)
    const B = -(v1.z * v2.x - v1.x * v2.z);
    const C = -(v1.x * v2.y - v1.y * v2.x);
    const D = -(A * x1 + B * y1 + C * z1);

    const { x: xL1, y: yL1, z: zL1 } = linePoint1;
    const { x: xL2, y: yL2, z: zL2 } = linePoint2;

    const dx = xL2 - xL1;  // parametric line equation components
    const dy = yL2 - yL1;
    const dz = zL2 - zL1;

    const denominator = A * dx + B * dy + C * dz; // solve for t in Ax + By + Cz + D = 0

    if (denominator === 0) {
        throw new Error("The line is parallel to the plane or lies within it; no unique intersection.");
    }

    const t = -(A * xL1 + B * yL1 + C * zL1 + D) / denominator;

    return { // compute intersection point
        x: xL1 + t * dx,
        y: yL1 + t * dy,
        z: zL1 + t * dz
    };
};

function getQuadCenter(p1, p2, p3, p4) {
    function getLineIntersection(A, B, C, D) {
        const a1 = B.y - A.y;
        const b1 = A.z - B.z;
        const c1 = a1 * A.z + b1 * A.y;

        const a2 = D.y - C.y;
        const b2 = C.z - D.z;
        const c2 = a2 * C.z + b2 * C.y;

        const determinant = a1 * b2 - a2 * b1;

        if (determinant === 0) {
            throw new Error("Diagonals are parallel, no intersection.");
        }

        return {            
            x: (A.x + C.x) / 2, // Approximating z by averaging diagonal endpoints (x because of x -> z switch)
            y: (a1 * c2 - a2 * c1) / determinant,
            z: (b2 * c1 - b1 * c2) / determinant            
        };
    }

    return getLineIntersection(p1, p3, p2, p4);
};

// optimise rotation to Converge Top and Bottom angle difference (CTB)
function optimiseRotationCTB(coords, axis, clockwiseRotation, topInclination, bottomInclination, scene) {
    const MAX_ITERATIONS = 1000; // maximum number of iterations to prevent infinite loop
    
    let modelCorners = getProjectedCorners(scene); // get corners of the blind as the user sees them on screen space

    const tolerance = 0.01;  // convergence tolerance // arbitrary picked number 0.573°
    let stepFactor = 0.01; // determines magnitude size scaling // arbitrary
    const maxStep = 0.1;     // largest step size (5.73°)
    const minStep = axis === BABYLON.Axis.Z ? 0.0001 : 0.0001; // smallest step size for fine-tuning // based on axis and is either 0.0573° (3.44′) for z or 0.00573° (20.63″) for y

    let topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]); // difference between the inclination of the blind top/bottom edge and the corresponding quad sides // these are broken for some reason.
    let bottomDiff = calculateAngleBetweenLines(coords[3], coords[2], modelCorners[2], modelCorners[3]);
    let topModelInclination = calculateAngleBetweenLines(modelCorners[1], modelCorners[0], {x: 0, y: 0}, {x: 0, y: 1000});    // inclination of the top of the model as measure from the bottom left inside
    let bottomModelInclination = calculateAngleBetweenLines(modelCorners[2], modelCorners[3], {x: 0, y: 0}, {x: 0, y: 1000}); // inclination of the bottom of the model as measure from the bottom left inside

    let error = Math.abs(bottomDiff - topDiff); // difference between top and bottom diff
    let total = bottomDiff + topDiff; // total combined error of top and bottom diff
    
    let optimise = false; // used to stop convergence on a local minima
    let reverse = false; // used to reverse direction of rotation if optimal convergence is passed
    let smaller;
    let count = 0;

    optimise = setOptimise(optimise, axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination); // checks if the loop should begin optimising for convergence straight away

    while ((!optimise || error > tolerance) && count < MAX_ITERATIONS) { // rotation loop // condition for if optimsing for convergence should begin and once it has condition for convergence being found
        const magnitude = optimise ? error : total; // to speed up convergence we use total error, which is usually higher, before optimisation has begun. Once optimisation has begun we use relative error which is usually smaller and better for fine tuning
        let step = Math.max(minStep, Math.min(maxStep, magnitude * stepFactor)); // sets rotation step based on magnitude of error and clamps it within min and max step range

        if ((!clockwiseRotation && axis === BABYLON.Axis.Y) || (clockwiseRotation && axis === BABYLON.Axis.Z)) { // sets the correct direction of rotation
            step = -step
        }
        step = reverse ? -step : step; // reverses the direction of rotation if rotation has proceeded to far for correct convergence

        boundingBox.rotate(axis, step, BABYLON.Space.LOCAL);
        boundingBox.computeWorldMatrix(true); // updates boundingBox data // do we need to update the root mesh here? I'm thinking not as the root mesh itself is not being changed
        modelCorners = getProjectedCorners(scene); // gets new corner coordinates after rotation
        bottomDiff = calculateAngleBetweenLines(coords[3], coords[2], modelCorners[2], modelCorners[3]); // gets difference in angle of the corresponding side of the model and quad
        topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);
        topModelInclination = calculateAngleBetweenLines(modelCorners[1], modelCorners[0], {x: 0, y: 0}, {x: 0, y: 1000}); // gets the inclinations of the model
        bottomModelInclination = calculateAngleBetweenLines(modelCorners[2], modelCorners[3], {x: 0, y: 0}, {x: 0, y: 1000});

        optimise = setOptimise(optimise, axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination); // check if conditions are met to being convergence
        if (!reverse) {
            let result = setReverseRotationTrue(axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination); // checks if the direction of rotation needs to be reversed
            reverse = result.reverse; // sets the reverse variable
            smaller = result.smaller; // sets the smaller variable
        } else {
            reverse = setReverseRotationFalse(smaller, topDiff, bottomDiff); // checks if the direction of rotation needs to be un-reversed
        }

        error =  Math.abs(bottomDiff - topDiff) // updates errors
        total = topDiff + bottomDiff;

        count++;
    }

    if (count >= MAX_ITERATIONS) {
        throw new Error("Maximum CTB iterations reached!");
    }
};

// conditions for if convergence optimisation should begin
function setOptimise(optimise, axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination){
    if (axis === BABYLON.Axis.Z) {
        if (clockwiseRotation && (topModelInclination <= topInclination || bottomModelInclination <= bottomInclination)) {
            optimise = true;
        }
        if (!clockwiseRotation && (topModelInclination >= topInclination || bottomModelInclination >= bottomInclination)) {
            optimise = true;
        }
    } else if (axis === BABYLON.Axis.Y) {
        if (clockwiseRotation && (topModelInclination >= topInclination || bottomModelInclination <= bottomInclination)) {
            optimise = true;
        }
        if (!clockwiseRotation && (topModelInclination <= topInclination || bottomModelInclination >= bottomInclination)) {
            optimise = true;
        }
    }

    return optimise
};

// conditions for if the rotation direction should be reversed
function setReverseRotationTrue(axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination) {
    let reverse;
    
    if (axis === BABYLON.Axis.Z) {
        if (clockwiseRotation && topModelInclination < topInclination && bottomModelInclination < bottomInclination) {
            reverse = true;
        } else if (!clockwiseRotation && topModelInclination > topInclination && bottomModelInclination > bottomInclination) {
            reverse = true;
        } else {
            reverse = false;
        }
    } else if (axis === BABYLON.Axis.Y) {
        if (clockwiseRotation && topModelInclination > topInclination && bottomModelInclination < bottomInclination) {
            reverse = true;
        } else if (!clockwiseRotation && topModelInclination < topInclination && bottomModelInclination > bottomInclination) {
            reverse = true;
        } else {
            reverse = false;
        }
    }

    let smaller = null;

    if (reverse) {
        if (Math.abs(topModelInclination - topInclination) < Math.abs(bottomModelInclination - bottomInclination)) {
            smaller = "top";
        } else {
            smaller = "bottom";
        }
    }

    return { reverse, smaller };
};

function setReverseRotationFalse(smaller, topDiff, bottomDiff) {
    let reverse;
    
    if (smaller === "top") {
        if (topDiff >= bottomDiff) {
            reverse = false;
        } else {
            reverse = true;
        }
    } else if (smaller === "bottom") {
        if (bottomDiff >= topDiff) {
            reverse = false;
        } else {
            reverse = true;
        }
    }

    return reverse;
};

function finalZRotation (coords, topInclination, scene) {
    let modelCorners = getProjectedCorners(scene); // get corners of the blind as the user sees them on screen space
    
    // determine z axis rotation direction for yz fine tuning
    const topModelInclination = calculateAngleBetweenLines(modelCorners[1], modelCorners[0], {x: 0, y: 0}, {x: 0, y: 1000});
    const clockwiseZRotation = topModelInclination > topInclination;

    // rotate the model on z axis to align top and bottom
    let topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);

    while (topDiff > 0.1) { // may need to change and recheck this tolerance and make step adaptive
        if (clockwiseZRotation) {
            boundingBox.rotate(BABYLON.Axis.Z, -0.001, BABYLON.Space.LOCAL);
        } else {
            boundingBox.rotate(BABYLON.Axis.Z, 0.001, BABYLON.Space.LOCAL);
        }

        boundingBox.computeWorldMatrix(true);
        modelCorners = getProjectedCorners(scene);
        topDiff = calculateAngleBetweenLines(coords[0], coords[1], modelCorners[1], modelCorners[0]);
    }
};

// TODO: combine optimiseRotationCLR and optimiseRotationCTB into core & wrapper functions
// optimise rotation to Converge Left and Right angle difference (CLR)
function optimiseRotationCLR(coords, axis, clockwiseRotation, leftInclination, rightInclination, scene) {
    let modelCorners = getProjectedCorners(scene); // get corners of the blind as the user sees them on screen space

    const tolerance = 0.015; // convergence tolerance // arbitrary picked number 0.859° +50% on CTB
    const stepFactor = 0.01; // determines magnitude size scaling // arbitrary
    const maxStep = 0.1;     // largest step size (5.73°)
    const minStep = 0.0001; // smallest step size for fine-tuning // 0.00573° (20.63″) for x

    let leftDiff = calculateAngleBetweenLines(coords[0], coords[3], modelCorners[1], modelCorners[2]);
    let rightDiff = calculateAngleBetweenLines(coords[1], coords[2], modelCorners[0], modelCorners[3]);
    let leftModelInclination = calculateAngleBetweenLines(modelCorners[1], modelCorners[2], {x: 0, y: 0}, {x: 1000, y: 0});
    let rightModelInclination = calculateAngleBetweenLines(modelCorners[0], modelCorners[3], {x: 0, y: 0}, {x: 1000, y: 0});

    let tempRotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, 0.001);
    tempRotationQuaternion = boundingBox.rotationQuaternion.multiply(tempRotationQuaternion);
    const testCorners = getProjectedCorners(scene, tempRotationQuaternion);
    const forwardsXRotation = (calculateAngleBetweenLines(coords[0], coords[3], testCorners[1], testCorners[2]) > leftDiff);

    let error = Math.abs(leftDiff - rightDiff); // difference between top and bottom diff
    let total = leftDiff + rightDiff; // total combined error of top and bottom diff
    
    let previousError = 500; // used to store the error from the last iteration // set to 500 as the theoretical maximum is 179° + 179° = 358° then add some extra for safety
    let previousTotal = 500; // used to store the total from the last iteration // set to 500 as the theoretical maximum is 179° + 179° = 358° then add some extra for safety
    let reverse = false; // used to reverse direction of rotation if optimal convergence is passed
    let reversalDiff = total > 5 ? total : 5; // trigger for when to reverse rotation direction
    let reversalCount = 0; // used to count how many times the rotation direction has been reversed

    while (true) {
        // const magnitude = optimise ? error : total;
        const magnitude = error;
        let step = Math.max(minStep, Math.min(maxStep, magnitude * stepFactor));
        
        step = forwardsXRotation ? -step : step;
        step = reverse ? -step : step; // reverses the direction of rotation if rotation has proceeded to far for correct convergence

        boundingBox.rotate(axis, step, BABYLON.Space.LOCAL);
        boundingBox.computeWorldMatrix(true);
        modelCorners = getProjectedCorners(scene);
        leftDiff = calculateAngleBetweenLines(coords[0], coords[3], modelCorners[1], modelCorners[2]);
        rightDiff = calculateAngleBetweenLines(coords[1], coords[2], modelCorners[0], modelCorners[3]);
        leftModelInclination = calculateAngleBetweenLines(modelCorners[1], modelCorners[2], {x: 0, y: 0}, {x: 1000, y: 0});
        rightModelInclination = calculateAngleBetweenLines(modelCorners[0], modelCorners[3], {x: 0, y: 0}, {x: 1000, y: 0});

        error = Math.abs(leftDiff - rightDiff);
        total = leftDiff + rightDiff;
        
        if (error < tolerance && total > previousTotal && error > previousError) {
            boundingBox.rotate(axis, -step, BABYLON.Space.LOCAL);
            boundingBox.computeWorldMatrix(true);
            modelCorners = getProjectedCorners(scene); // need to verify if this is needed
            leftDiff = calculateAngleBetweenLines(coords[0], coords[3], modelCorners[1], modelCorners[2]);
            rightDiff = calculateAngleBetweenLines(coords[1], coords[2], modelCorners[0], modelCorners[3]);
            break;
        }
        
        if (total > reversalDiff) {
            reverse = !reverse;
            reversalCount++;
            if (reversalCount > 2) {
                throw new Error("Maximum CLR reversals reached!");
            }
        }
        if ( total > 5) {
            reversalDiff = total;
        } else {
            reversalDiff = 5;
        }

        previousError = error;
        previousTotal = total;
    }
};

function adjustYscaling (babCoords, scene) {
    // calculate the difference in height between the model and quad and adjust accordingly
    let modelBabCorners = getModelBabCorners(boundingBox.rotationQuaternion, scene); // gets the corner for the model in babylon world space
    let topMidPoint = getMidpoint(modelBabCorners[0], modelBabCorners[1]); // half way along the top of the model
    let bottomMidPoint = getMidpoint(modelBabCorners[2], modelBabCorners[3]); // half way along the bottom of the model
    let targetPoint = getPlaneLineIntersection(babCoords[0], babCoords[1], scene.cameras[0].position, topMidPoint, bottomMidPoint);
    const topHeightDiff = getLineLength(targetPoint, topMidPoint);
    scaleFromOneSide2(scene, targetPoint.y < topMidPoint.y ? -topHeightDiff : topHeightDiff, BABYLON.Axis.Y, scaleDirection.positive);

    modelBabCorners = getModelBabCorners(boundingBox.rotationQuaternion, scene); // gets the corner for the model in babylon world space
    topMidPoint = getMidpoint(modelBabCorners[0], modelBabCorners[1]); // half way along the top of the model
    bottomMidPoint = getMidpoint(modelBabCorners[2], modelBabCorners[3]); // half way along the bottom of the model
    targetPoint = getPlaneLineIntersection(babCoords[3], babCoords[2], scene.cameras[0].position, topMidPoint, bottomMidPoint);
    const bottomHeightDiff = getLineLength(targetPoint, bottomMidPoint);
    scaleFromOneSide2(scene, targetPoint.y > bottomMidPoint.y ? -bottomHeightDiff : bottomHeightDiff, BABYLON.Axis.Y, scaleDirection.negative);

    setModelMeshScaling(scene);
};

function adjustXscaling(babCoords, scene) {
    // calculate the difference in width between the model and quad and adjust accordingly
    let modelBabCorners = getModelBabCorners(boundingBox.rotationQuaternion, scene);
    let midPointRight = getMidpoint(modelBabCorners[0], modelBabCorners[3]); // mid point is used as this is which point the model is rotated around 
    let midPointLeft = getMidpoint(modelBabCorners[1], modelBabCorners[2]);
    let targetPoint = getPlaneLineIntersection(babCoords[0], babCoords[3], scene.cameras[0].position, midPointRight, midPointLeft); // gets the intersection between the line drawn through the middle of the model and a plane drawn from the camera to the left side of the quad so that model appears visually the right width.
    const leftDistanceDiff = getLineLength(midPointLeft, targetPoint);
    let offset = midPointLeft.x > midPointRight.x ? 0.05 : 0; // anecdotally this helps the far side align better. may need to remove with more testing
    scaleFromOneSide2(scene, targetPoint.z < midPointLeft.z ? -leftDistanceDiff : leftDistanceDiff + offset, BABYLON.Axis.X, scaleDirection.positive);

    modelBabCorners = getModelBabCorners(boundingBox.rotationQuaternion, scene); // something not right in here
    midPointRight = getMidpoint(modelBabCorners[0], modelBabCorners[3]);
    midPointLeft = getMidpoint(modelBabCorners[1], modelBabCorners[2]);
    targetPoint = getPlaneLineIntersection(babCoords[1], babCoords[2], scene.cameras[0].position, midPointRight, midPointLeft); // gets the intersection between the line drawn through the middle of the model and a plane drawn from the camera to the right side of the quad so that model appears visually the right width.
    const rightDistanceDiff = getLineLength(midPointRight, targetPoint);
    offset = midPointRight.x > midPointLeft.x ? 0.05 : 0; // anecdotally this helps the far side align better. may need to remove with more testing
    scaleFromOneSide2(scene, targetPoint.z > midPointRight.z ? -rightDistanceDiff : rightDistanceDiff + offset, BABYLON.Axis.X, scaleDirection.negative);

    setModelMeshScaling(scene);
};

function beginFit3(babCoords, coords, scene) {
    try {
        //position blind in the middle of the quad
        const QuadMid = getQuadCenter(babCoords[0], babCoords[1], babCoords[2], babCoords[3]);
        boundingBox.position = new BABYLON.Vector3(QuadMid.x, QuadMid.y, QuadMid.z);

        // get inclinations
        const leftInclination = calculateAngleBetweenLines(coords[0], coords[3], {x: 0, y: 0}, {x: 1000, y: 0}); // taken from the bottom left inside (-> + <180°)
        const rightInclination = calculateAngleBetweenLines(coords[1], coords[2], {x: 0, y: 0}, {x: 1000, y: 0});

        const topInclination = calculateAngleBetweenLines(coords[0], coords[1], {x: 0, y: 0}, {x: 0, y: 1000}); // taken from the bottom left inside (↑ + <180°)
        const bottomInclination = calculateAngleBetweenLines(coords[3], coords[2], {x: 0, y: 0}, {x: 0, y: 1000});

        // set rotation directions (ones that can be set now)
        const clockwiseYRotation = (topInclination - bottomInclination > 0) ? true : (topInclination - bottomInclination < 0) ? false : null;
        let clockwiseZRotation =
            ((rightInclination > 90 && leftInclination > 90) || (rightInclination > 90 && 180 - rightInclination < leftInclination)) ? true :
            ((leftInclination < 90 && rightInclination < 90) || (leftInclination < 90 && leftInclination < 180 - rightInclination)) ? false :
            null;

        // correct z rotation for if it's outside the reasonable bounds of what can be corrected with the yz (CTB) rotation algorithm
        if (clockwiseZRotation !== null && ((topInclination > 90 && bottomInclination > 90) || (topInclination < 90 && bottomInclination < 90))) {
            // rotate on z axis until top and bottom diff converge under the tolerance (assuming z -> yz -> x flow)
            optimiseRotationCTB(coords, BABYLON.Axis.Z, clockwiseZRotation, topInclination, bottomInclination, scene);
        }
        
        adjustYscaling(babCoords, scene); // adjust height of the model so it fits the quad // important to do here as the distance from centre affects inclination angle

        // rotate the model so the angle difference between the top and bottom is the same and in the same direction so that the top and bottom can be aligned by rotating on z axis
        optimiseRotationCTB(coords, BABYLON.Axis.Y, clockwiseYRotation, topInclination, bottomInclination, scene);

        finalZRotation(coords, topInclination, scene); // rotate the model on z axis to align top and bottom

        adjustXscaling(babCoords, scene); // adjust width of model to fit quad

        // rotate the model on x axis so the difference between the model left inclination and quad left inclination and the model right inclination and qaud right inclination is the same
        optimiseRotationCLR(coords, BABYLON.Axis.X, true, leftInclination, rightInclination, scene);
        adjustYscaling(babCoords, scene); // re-adjust the height of the model as the x rotation has probably made it visually to short
    } catch (e) {
        console.warn("Unable to fit model to quad: ", e);
        // call reset function here or throw an error the calling code can catch or something.
    }
};

let sceneOut = null;

(async () => {
    const scene = await createScene();
    sceneOut = scene;
    console.log(scene.meshes);
   
    setGlobalMeshPositionAndScale(scene);

    const axesViewer = new BABYLON.AxesViewer(scene);

    const camera = scene.cameras[0];
    const depth = camera.radius; // Distance from the camera
    const viewportSize = getViewportSizeAtDepth(camera, scene, depth);
    console.log(`Viewport at depth ${depth}: Width = ${viewportSize.width}, Height = ${viewportSize.height}`);
    const coords = [604, 94,  1198, 326, 1143, 687, 421, 443]; // drawn quad from 20.jpg
    // const coords = [741.2661169415292, 203.2023988005997, 1368.5944527736133, 88.6056971514243, 1352.0547226386807, 698.2128935532234, 736.54047976012, 533.9970014992504]; // drawn quad from 21.jpg
    // const coords = [276.04375000000005, 48.01875, 803.634375, 185.91875, 805.48125, 528.821875, 271.11875000000003, 629.1687499999999]; // drawn quad for 1.jpg
    // const coords = [337.2241379310345, 88.6056971514243, 965.7338830584707, 203.2023988005997, 971.6409295352324, 532.8155922038981, 356.12668665667167, 699.3943028485758]; // drawn quad for 5.jpg
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
        BABYLON.Tools.ToRadians(90),
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
        //placeMarkers(scene, viewportSize);
        beginFit3(babCoords, coordsJ, scene, viewportSize);
        //beginFit3(babCoords, coordsJ, scene, viewportSize);
        //placeMarkers(scene, viewportSize);
        //beginFit2(babCoords, coordsJ, scene, viewportSize);
        //beginFit1(coordsJ, scene);
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
})();

let isRecording = false;
let clickPositions = [];
let handleCanvasClick = null;
let handleMouseMove = null;
let testOverlay= null;
let overlayCtx = null;

function testFittingAlgo() {
    if (isRecording) {
        // Deactivate recording
        isRecording = false;
        clickPositions = [];
        if (handleCanvasClick) {
            canvas.removeEventListener('click', handleCanvasClick);
        }
        if (handleMouseMove) {
            canvas.removeEventListener('mousemove', handleMouseMove);
        }
        if (testOverlay && testOverlay.parentElement) {
            // testOverlay.parentElement.removeChild(testOverlay);
            testOverlay = null;
            overlayCtx = null;
        }
    } else {
        // Activate recording
        isRecording = true;
        clickPositions = [];

        // Create testOverlay canvas
        // testOverlay = document.createElement('canvas');
        testOverlay = document.getElementById("testCanvas");
        // testOverlay.width = canvas.width;
        // testOverlay.height = canvas.height;
        // testOverlay.style.position = 'absolute';
        // testOverlay.style.top = canvas.offsetTop + 'px';
        // testOverlay.style.left = canvas.offsetLeft + 'px';
        // testOverlay.style.pointerEvents = 'none';
        // testOverlay.style.zIndex = '10';
        // testOverlay.id = 'testOverlay';

        // canvas.parentElement?.appendChild(testOverlay);
        overlayCtx = testOverlay.getContext('2d');

        handleCanvasClick = function (event) {
            if (clickPositions.length >= 8) {
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            clickPositions.push(x, y);

            if (clickPositions.length > 2) {
                overlayCtx.strokeStyle = 'red';
                overlayCtx.lineWidth = 2;
                overlayCtx.beginPath();
                overlayCtx.moveTo(clickPositions[clickPositions.length - 4], clickPositions[clickPositions.length - 3]);
                overlayCtx.lineTo(clickPositions[clickPositions.length - 2], clickPositions[clickPositions.length - 1]);
                overlayCtx.stroke();
            }

            if (clickPositions.length === 8) {
                overlayCtx.beginPath();
                overlayCtx.moveTo(clickPositions[6], clickPositions[7]);
                overlayCtx.lineTo(clickPositions[0], clickPositions[1]);
                overlayCtx.stroke();
                fitModelToQuad(clickPositions, sceneOut);
                clickPositions = [];
            }
        };

        handleMouseMove = function (event) {
            if (!overlayCtx || clickPositions.length % 2 !== 0) {
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            if (clickPositions.length > 0) {
                overlayCtx.clearRect(0, 0, testOverlay.width, testOverlay.height);
            }

            overlayCtx.strokeStyle = 'red';
            overlayCtx.lineWidth = 2;

            overlayCtx.beginPath();
            for (let i = 0; i < clickPositions.length - 2; i += 2) {
                overlayCtx.moveTo(clickPositions[i], clickPositions[i + 1]);
                overlayCtx.lineTo(clickPositions[i + 2], clickPositions[i + 3]);
            }
            overlayCtx.stroke();

            if (clickPositions.length >= 2) {
                // Draw the dynamic line
                overlayCtx.beginPath();
                overlayCtx.moveTo(clickPositions[clickPositions.length - 2], clickPositions[clickPositions.length - 1]);
                overlayCtx.lineTo(x, y);
                overlayCtx.stroke();

                if (clickPositions.length === 6) {
                    // On the fourth click, draw from both the first and third click
                    overlayCtx.beginPath();
                    overlayCtx.moveTo(clickPositions[0], clickPositions[1]);
                    overlayCtx.lineTo(x, y);
                    overlayCtx.stroke();
                }
            }
        };

        canvas.addEventListener('click', handleCanvasClick.bind(this));
        canvas.addEventListener('mousemove', handleMouseMove.bind(this));
    }
};

// for testing
document.addEventListener('keydown', (event) => {
    if (event.key === 't') {
        testFittingAlgo();
    }
});