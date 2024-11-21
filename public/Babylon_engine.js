const canvas = document.getElementById("renderCanvas"); // Get the canvas element
let isImageVisualisation;
let currentBehaviour;
let engine = null;
let rootMeshesByType;
let blindType;
let isModelCreated;
let defaultSize;
let scene = null;
const breakpoints = {'desktop': 1280, 'full-hd': 1980, 'l-desktop': 1400, 'phone': 599, 'small-phone': 375, 'tablet-landscape': 992, 'tablet-portrait': 600, 'xl-desktop': 1530};
let upperRadius = 2.5;
let cameraRadii = {
    outdoor: {
        upper: 5.5,
    },
    interior: {
        upper: 4.5,
    },
};
let upperCameraOffset = -0.7;
let zoomRadius;
let lowerRadius = 1.5;
let zoomCameraOffsets;
let lowerCameraOffset = -0.15;
let cameraRotation = BABYLON.Tools.ToRadians(270);
let camera;
let blindId;
const blindOutdoor = 'outdoor.glb';
const blindInterior = 'interior-final.glb';
const baseUrl = './assets/model/';
const GLOBAL_HIDDEN_PELMET = [
	'TRADITIONAL_PELMET_CENTER',
	'TRADITIONAL_PELMET_LEFT',
	'TRADITIONAL_PELMET_RIGHT',
	'CAST_BRACKET_BACK_FLASHING',
	'CAST_BRACKET_LEFT',
	'CAST_BRACKET_RIGHT',
	'LARGE_WEATHER_STRIP',
	'CUSTOM_MADE_SKIRT',
	'REVERSE_HANDLE',
	'FACE_FIX_CHANNEL_RIGHT',
	'FACE_FIX_CHANNEL_LEFT',
];
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
const INTERIOR_MESHES_IDS = {
	109: 'BOTTOM BAR GUIDE 1',
	111: 'BOTTOM BAR GUIDE 2',
	113: 'BOTTOM BAR',
	116: 'END CAP 1',
	118: 'END CAP 2',
	124: 'FACE FIX CHANNEL 1',
	126: 'FACE FIX CHANNEL 2',
	128: 'FACE FIX STOPPER 2',
	129: 'FACE FIX STOPPER 1',
	132: 'FRONT PELMET FOAM',
	134: 'MATERIAL-1',
	135: 'MATERIAL-2',
	137: 'PELMET FRONT',
	139: 'PELMET TOP',
	140: 'REVEAL CHANNEL 1',
	141: 'REVEAL CHANNEL 2',
	156: 'TRACK ALUMINIUM 1',
	157: 'TRACK ALUMINIUM 2',
	159: 'WEATHER STRIP',
	160: 'PELMET END TRIM 1',
	151: 'PELMET END TRIM 2',
	152: 'BOTTOM CHANNEL REVEAL FIX',
	153: 'BOTTOM CHANNEL FACE FIX 1',
	154: 'BOTTOM CHANNEL FACE FIX 2',
	155: 'BOTTOM CHANNEL FACE FIX 3',
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
const INTERIOR_SCALING_MESHES = {
	134: 'MATERIAL-1',
	135: 'MATERIAL-2',
	113: 'BOTTOM BAR',
	132: 'FRONT PELMET FOAM',
	137: 'PELMET FRONT',
	139: 'PELMET TOP',
	159: 'WEATHER STRIP',
	156: 'TRACK ALUMINIUM 1',
	157: 'TRACK ALUMINIUM 2',
	141: 'REVEAL CHANNEL 2',
	140: 'REVEAL CHANNEL 1',
	124: 'FACE FIX CHANNEL 1',
	126: 'FACE FIX CHANNEL 2',
	152: 'BOTTOM CHANNEL REVEAL FIX',
	154: 'BOTTOM CHANNEL FACE FIX 2',
};
let meshPosition = {};
let meshScaling = {};
let boundingBoxRotation;
let boundingBoxScale;
let boundingBoxAbsoluteScale;
let rootMeshScale;
let rootMeshAbsoluteScale;
let rootStartMeshScale;
let rootMeshPosition;
let light;

let modelLoadedResolve;
const modelLoadedPromise = new Promise((resolve) => {
    modelLoadedResolve = resolve; // This is called when the model is loaded
});

init(canvas);

function init(canvas) {
    // const sessionBlindType = this.sessionStorageService.getModelSize(STORAGE_NAMES.zip_blind_type);
    // const viewType = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_view_type);
    // const currentBlindId = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_current_blind_id);
    // const lastOpenBlindId = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_last_opened_blind_id);
    const sessionBlindType = 'outdoor';
    const currentBlindId = '';
    const lastOpenBlindId = '';

    //this.isImageVisualisation = viewType === VIEW_TYPES.image_visualisation;
    isImageVisualisation = false;
    // this.selectedGizmoId = '';
    rootMeshesByType = { outdoor: null, interior: null };
    currentBehaviour = 'rotate';
    // this.canvas = canvas.nativeElement;
    engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
    });
    createScene(sessionBlindType || 'outdoor', currentBlindId || lastOpenBlindId || '');
}

function createScene(type, id = '', afterViewChange = false) {
    const visibleStatus = isImageVisualisation ? this.getCurrentRootMesh()?.isEnabled() : false;
    
    // this.setGizmoZoomModelBehavior(false); // as false is passed and IV = false removes gizmoZoomModelBehavior which is never set anyway and then returns
    // this.setModelAndBoundingBoxSettings(); // If IV = false will return and createScene is never call if IV = true (in my case anyway)
    getCurrentRootMesh()?.setEnabled(visibleStatus); // returns undefined
    blindId = id;

    if (!isImageVisualisation && scene?.meshes?.length) { // apparently 50 meshes added before second call which happens when blind type selected. Requires createScene to have been run before for scene to be initilised
        setIdForSceneMeshes(id); // const id = Math.floor(1000 + Math.random() * 9000); this.engineService.createScene(type, id.toString());
    }

    // if (this.isImageVisualisation) { // inaccessible due to createScene not being called if IV = true (in my case)
    //     this.selectedGizmoId = id;
    //     this.IVSceneHandler(id, type);
    //     return;
    // }

    if (blindType === type && isModelCreated && !afterViewChange) { // not sure what to do about this yet
        // this.setModelDefaultPosition(); // only seems to set stuff for if IV = false so going to ignore for now
        // this.setDefaultView(); // for visuals might just ignore for now and replicate later
        // this.setGizmoScaleControlVisibleDYB(); // seems to be for IV = false so going to ignore for now
        //this.shareDataService.getModelLoaded.pipe(first()).subscribe(this.setSceneAndModelViewCreated.bind(this, type)); // Can't be stuffed making this work

        modelLoadedPromise.then(() => {
            setSceneAndModelViewCreated(type); // may have to create a flag for scene created later
        });

        return;
    }

    // const defaultSizeData = this.sessionStorageService.getModelSize(STORAGE_NAMES.default_model_size);
    const defaultSizeData = {interior: {width: 0, height: 0}, outdoor: {width: 1.15, height: 0.7}} // doesn't seem to change from this
    // this.removeScenePointerEvents(); // doesn't have any events yet
    rootMeshesByType = { outdoor: null, interior: null };

    blindType = type;
    isModelCreated = false;
    defaultSize = defaultSizeData || defaultSize;
    scene = new BABYLON.Scene(engine);
    // this.scene.clearColor = new Color4(0.76953125, 0.7421875, 0.71875, 1);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.collisionsEnabled = true;
    setZoomSettings(type);
    createCamera();

    modelLoaderHandler();
    // this.createSceneEventsHandler(); // ignoring controls for now
    // this.createSceneSubscriptionsHandler(); // may need to implement this for the sizing stuff
    // this.touchHandler(this.lowerRadius);
}

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

function modelLoaderHandler() {
    const nBlindType = blindType === 'outdoor' ? blindOutdoor : blindInterior;

    loadModelWithRetry(baseUrl, nBlindType, scene)
        .then((container) => setupSceneHandler(container))
        .then(() => {
            // this.setDefaultView(); // for visuals might just ignore for now
            lightGeneralSetupHandler(false);
            // this.showAxis(1, this.scene);
            // this.groundGeneralSetupHandler(); // dont want ground

            if (isImageVisualisation) {
                this.changeViewType(true); // need to implement
            }

            isModelCreated = true;
            modelLoadedResolve(); // is this needed as next functional line does the same thing ???
            // this.setCameraOffset(); // ignore as when IV = true returns
            setSceneAndModelViewCreated(blindType);
            // setTimeout(this.setGizmoControl.bind(this, true)); // not worrying about gizmo
            
            const id  = Math.floor(1000 + Math.random() * 9000);
            createScene('outdoor', id.toString());
        });
};

function setupSceneHandler(container) {
    const getBlindType = 'outdoor'; // Warning: hardcoded !!!

    container.addAllToScene();
    console.log(scene.meshes);
    container.meshes[0]['blind_type'] = blindType;
    container.meshes.forEach((mesh) => {
        mesh.checkCollisions = true;

        if (blindId) {
            mesh.name = `${blindId}${mesh.id}`;
        }
    });

    // this.setDYBCameraSettings(); // should all be overwritten by IVCameraSettings

    const color = new BABYLON.StandardMaterial('', scene);
    color.diffuseColor = BABYLON.Color3.FromHexString('#818181');

    for (const meshId of GLOBAL_HIDDEN_PELMET) {
        scene.getMeshByName(blindId + meshId)?.setEnabled(false);
    }

    rootMeshesByType[blindType] = container.meshes[0];

    getGlobalMeshPositionAndScale(getBlindType);

    boundingBoxRotation = null;
    boundingBoxScale = null;
    boundingBoxAbsoluteScale = null;

    rootMeshScale = null;
    rootMeshAbsoluteScale = null;
    rootStartMeshScale = null;
    rootMeshPosition = null;

    // TODO: Need to be finished LOADING model
    // this.boxMaskHandler();

    return scene;
}

function getGlobalMeshPositionAndScale(type, nBlindId = null) {
    const MESH_TYPE = type === 'outdoor' ? MESHES_IDS : INTERIOR_MESHES_IDS;
    const SCALING_TYPE = type === 'outdoor' ? SCALING_MESHES : INTERIOR_SCALING_MESHES;
    nBlindId ||= blindId;

    for (const id in MESH_TYPE) {
        if (id) {
            meshPosition[id] = {
                x: scene.getMeshByName(nBlindId + MESH_TYPE[id])?.position.x,
                y: scene.getMeshByName(nBlindId + MESH_TYPE[id])?.position.y,
                z: scene.getMeshByName(nBlindId + MESH_TYPE[id])?.position.z,
            };

            if (scene.getMeshByName(nBlindId + MESH_TYPE[id])?.material?.name.includes('aluminum')) {
                const material = scene.getMeshByName(nBlindId + MESH_TYPE[id])?.material;

                // @ts-ignore
                material._albedoColor = BABYLON.Color3.FromHexString('#919092').toLinearSpace();
            }
        }
    }

    for (const id in SCALING_TYPE) {
        if (id) {
            meshScaling[id] = {
                x: scene.getMeshByName(nBlindId + MESH_TYPE[id])?.scaling.x,
                y: scene.getMeshByName(nBlindId + MESH_TYPE[id])?.scaling.y,
                z: scene.getMeshByName(nBlindId + MESH_TYPE[id])?.scaling.z,
            };
        }
    }
}

function lightGeneralSetupHandler(IVstatus) {
    const lightPositions = {
        front: IVstatus ? new BABYLON.Vector3(1, -1, 0) : new BABYLON.Vector3(0, -1, 1),
        back: IVstatus ? new BABYLON.Vector3(-1, 0, 0) : new BABYLON.Vector3(0, 1, -5),
        right: IVstatus ? new BABYLON.Vector3(-1, 1, -5) : new BABYLON.Vector3(-5, 1, -1),
        left: IVstatus ? new BABYLON.Vector3(1, 1, 5) : new BABYLON.Vector3(5, 1, 1),
    };

    light?.dispose();
    scene.getLightByName('HemiLight')?.dispose();
    scene.getLightByName('backDirectLight')?.dispose();
    scene.getLightByName('pointLight')?.dispose();
    scene.getLightByName('leftLight')?.dispose();

    const hemiLight = new BABYLON.HemisphericLight('HemiLight', new BABYLON.Vector3(0, 0, 0), scene);
    hemiLight.specular = new BABYLON.Color3(0, 0, 0);
    hemiLight.intensity = 1.4;

    light = new BABYLON.DirectionalLight('frontDirectLight', lightPositions.front, scene);
    light.intensity = 1.5;

    const backLight = new BABYLON.DirectionalLight('backDirectLight', lightPositions.back, scene);
    backLight.intensity = 0.3;
    backLight.specular = new BABYLON.Color3(0, 0, 0);

    const rightLight = new BABYLON.PointLight('pointLight', lightPositions.right, scene);
    rightLight.intensity = 0.1;

    const leftLight = new BABYLON.PointLight('leftLight', lightPositions.left, scene);
    leftLight.intensity = 0.1;
}

function setIdForSceneMeshes(id) {
    scene.meshes[0].name = id + scene.meshes[0].id;
    scene.meshes[0]
        .getChildMeshes()
        .forEach((mesh) => (mesh.name = id ? `${id}${mesh.id}` : removeIdFromName(mesh.name)));
}

function removeIdFromName(name) {
    return name.replace(/\d{4}/g, '');
}

function setZoomSettings(blindType) {
    if (window.innerWidth >= breakpoints['tablet-portrait']) {
        upperRadius = cameraRadii[blindType].upper;
        const addCameraOffset =
            window.innerWidth > breakpoints['full-hd'] ? (window.innerWidth - breakpoints['full-hd']) / 1750 : 0;
        upperCameraOffset = blindType === 'outdoor' ? -1.2 + addCameraOffset : -0.9;
    }

    zoomRadius = [upperRadius, (upperRadius + lowerRadius) / 2, lowerRadius];
    zoomCameraOffsets = [upperCameraOffset, (upperCameraOffset + lowerCameraOffset) / 2, lowerCameraOffset];
}

function createCamera() {
    camera = new BABYLON.ArcRotateCamera('camera', cameraRotation, Math.PI / 2, upperRadius, BABYLON.Vector3.Zero(), scene);
}

function getCurrentRootMesh() {
    const rootMesh = getRootMeshById(blindId);
    const defaultRootMesh = getRootMeshById('');

    return rootMesh || defaultRootMesh;
}

function getRootMeshById(id) {
    return scene?.meshes.filter((mesh) => mesh.name === `${id}__root__`)[0];
}

function setSceneAndModelViewCreated(type) {
    console.log(`Scene and Model View Created for Type: ${type}`);
    getCurrentRootMesh()?.setEnabled(true); // sets false first time then true after type select // seems to be about the only part i need to worry about
}

engine.runRenderLoop(function () {
    scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
    engine.resize();
});