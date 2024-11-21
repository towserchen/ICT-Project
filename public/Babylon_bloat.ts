import { ElementRef, Injectable, NgZone } from '@angular/core';
import {
    AbstractMesh,
    Animation,
    ArcRotateCamera,
    ArcRotateCameraMouseWheelInput,
    ArcRotateCameraPointersInput,
    AssetContainer,
    BoundingBoxGizmo,
    Color3,
    Color4,
    DirectionalLight,
    DynamicTexture,
    Engine,
    FreeCamera,
    HemisphericLight,
    ISceneLoaderProgressEvent,
    KeyboardEventTypes,
    KeyboardInfo,
    Layer,
    Matrix,
    Mesh,
    MeshBuilder,
    Nullable,
    Observer,
    PointerDragBehavior,
    PointerEventTypes,
    PointerInfo,
    PointLight,
    Quaternion,
    Ray,
    Scene,
    SceneLoader,
    ShadowGenerator,
    StandardMaterial,
    Texture,
    Tools,
    UtilityLayerRenderer,
    Vector3,
    VideoTexture,
    PickingInfo,
    RenderingManager,
    Camera,
    PBRMaterial,
    IPointerEvent,
} from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { GLTF2Export } from '@babylonjs/serializers/glTF';
import { GLTFData } from '@babylonjs/serializers';
import '@babylonjs/loaders';

import { SessionStorageService } from '@core/services/session-storage/session-storage.service';
import { ShareService } from '@core/services/share-data/share-data.service';
import { PassDataService } from '@core/services/pass-data/pass-data.service';
import { CompressModelService } from '@core/services/compress-model/compress-model.service';
import { ScreenshotToBlindService } from '@core/services/screenshot-to-blind/screenshot-to-blind.service';
import { GizmoService } from '@core/services/engine/services/gizmo.service';
import { Observable, Subject } from 'rxjs';
import {
    BlindData,
    BoundingBoxesSettings,
    BoundingBoxSettings,
    GizmoMinMaxMeshScaling,
    RootMeshesByBlindType,
    ShutterValues,
} from '@root/app.interfaces';
import {
    ATTEMPTS_DELAY_MS,
    ALUMINIUM_MESH,
    BLACK_PLASTIC_MESH,
    COLOR_FRAME_PELMET,
    CONFIG,
    CONTROL_TYPES,
    FACE_FIX,
    GLOBAL_HIDDEN_PELMET,
    GLOBAL_PELMET,
    GLOBAL_STRIP,
    INITIAL_MODEL_SIZES_IN_METERS,
    INTERIOR_COLOR_FIXTURES,
    INTERIOR_COLOR_FRAME_PELMET,
    INTERIOR_FRAME_TOP_STYLE,
    INTERIOR_HEIGHT_MESH,
    INTERIOR_HEIGHT_POSITION_MESH,
    INTERIOR_MESHES_IDS,
    INTERIOR_SCALING_MESHES,
    INTERIOR_WIDTH_MESH,
    INTERIOR_WIDTH_POSITION_MESH,
    MATERIAL_COLORS,
    MATERIAL_MESH,
    MATERIAL_TEXTURE_SCALE,
    MAX_RETRY_ATTEMPTS,
    MESHES_IDS,
    REVEAL_CHANNEL,
    REVERSE_HANDLE,
    SCALING_MESHES,
    SELECTORS,
    SPLINE_MESH,
    STORAGE_NAMES,
    VIEW_TYPES,
    REVEAL_CHANNEL_INTERIOR,
    FACE_FIX_INTERIOR,
    FACE_FIX_STOPPER_INTERIOR,
    TOP_STYLE_IDS,
    BOTTOM_BAR_IDS,
    BOTTOM_CHANNEL_HANDLE,
    SPRING_BALANCE,
    MINIMUM_MATERIAL_OPACITY,
    CLASSES,
} from '@root/app.config';

import * as _ from 'lodash';
import { delay, first } from 'rxjs/operators';
import { IndexedDBService } from '../indexed-db/indexed-db.service';

declare const $: any;

@Injectable({
    providedIn: 'root',
})
export class EngineService {
    private canvas: HTMLCanvasElement;
    public engine: Engine;
    public camera: ArcRotateCamera;
    public scene: Scene;
    public light: DirectionalLight;
    public utilityLayer: UtilityLayerRenderer;
    public gizmo: BoundingBoxGizmo;
    public boundingBox: Mesh;

    isMobile: boolean = this.passDataService.isMobileOrTablet;

    colorEvents = new Subject();
    sizeEvents = new Subject();
    boundingBoxSizeEvents = new Subject();
    modelDisplayEvents = new Subject();
    topStyleEvents = new Subject();
    bottomBarEvents = new Subject();
    operationEvents = new Subject();
    mountingEvents = new Subject();
    reverseEvents = new Subject();
    bottomChannelEvents = new Subject();
    shutterControlEvents = new Subject();

    meshPosition = {};
    meshScaling = {};
    defaultSize = {
        interior: {
            width: 0,
            height: 0,
        },
        outdoor: {
            width: 0,
            height: 0,
        },
    };
    defaultModelSize;
    materialTypes: string[];
    box;

    cameraRotation = Tools.ToRadians(270);
    cameraPosition: Vector3;
    isModelCreated = false;
    isCopyingModel = false;
    isModelMoved = false;
    isZoomedIn = false;
    isZoomedOut = false;
    zooming = false;
    zoomOutAnimationStatus = false;
    clicked = false;
    drag = false;
    modelDragging = false;
    isImageVisualisation = false;
    currentAlpha = 0.45;
    currentBeta = 0;
    modelPosition = 'front';
    currentBehaviour = 'rotate';
    lowerRadius = 1.5;
    middleRadius = 2.5;
    upperRadius = 2.5;
    lowerCameraOffset = -0.15;
    upperCameraOffset = -0.7;
    mobileCameraOffset = 0;
    currentHeight = 0;
    currentWidth = 1.349;
    fontSize = 20;
    rect;
    label;
    target;
    line;
    advancedTexture;
    ground;
    groundPositionY = -0.9;
    materialOpacity;

    pickResult;

    controlType;
    dragModelBehavior;
    rotateModelObserver;
    zoomIVModelObserver;
    keyboardIVObserver;
    gizmoControlPositionObserver: Observer<Scene>;
    startingRotationPoint;
    rotateAxis;
    draggedModel = false;
    rotatedModel = false;

    animationType;
    animationResponse;

    videoTexture: VideoTexture;
    videoStream: MediaStream;
    videoLayer: Layer;
    shadowGenerator: ShadowGenerator;

    isZoomedIVCamera = false;
    startIVCameraRadius: number;
    boundingBoxRotationQuaternion: Quaternion;
    boundingBoxRotation: Vector3;
    boundingBoxScale: Vector3;
    boundingBoxAbsoluteScale: Vector3;
    boundingBoxPosition: Vector3;
    boundingBoxesSettings: BoundingBoxesSettings;
    boundingBoxesSettingsStatus: boolean;
    rootMeshScale: Vector3;
    rootMeshAbsoluteScale: Vector3;
    rootStartMeshScale: Vector3;
    rootMeshPosition: Vector3;
    gizmoDragModelBehavior: PointerDragBehavior;
    gizmoZoomModelBehavior: Observer<Camera>;
    gizmoDragStatus: boolean;
    gizmoDragPointPicked;
    gizmoDragRayPicked;
    gizmoHoveredControl = null;
    gizmoLastHoveredControlId = null;
    gizmoTooltipPlane: Mesh;
    gizmoScaleBoxClone: Mesh;
    gizmoTooltipRectangle: GUI.Rectangle;
    gizmoScaleTooltip;
    gizmoScaleSizeTooltip;
    gizmoRotationTooltip;
    gizmoUI: GUI.AdvancedDynamicTexture;
    rootMeshRotationQuaternion: Quaternion;
    gizmoMinMaxMeshScaling: GizmoMinMaxMeshScaling;
    serverSizeData: any;
    boundingBoxPoints: any[] = [];
    boundingBoxPointSpheres: any[] = [];
    movePointSphere: Mesh;
    pointSpheresMaterial: StandardMaterial;
    hoverPointSpheresMaterial: StandardMaterial;

    commonDefaultStyles = {
        color: false,
        sizeWidth: false,
        sizeHeight: false,
        topStyle: false,
        operation: false,
        mounting: false,
    };

    defaultStyles = {
        outdoor: {
            ...this.commonDefaultStyles,
            bottomBar: false,
        },
        interior: {
            ...this.commonDefaultStyles,
            bottomChannel: false,
        },
    };
    breakpoints = CONFIG.breakpoints;

    baseUrl = '../../../../assets/model/'; // TODO change to REST API
    blindInterior = 'interior-final.glb';
    blindOutdoor = 'outdoor.glb';
    blindType = 'outdoor';

    zoomCounter = 0;
    zoomRadius: number[];
    zoomCameraOffsets: number[];
    zoomGizmoSettings;

    shutter = {
        value: 1,
        IVDefaultValue: 1,
        materialScale: 0,
        meshScale: 0,
        materialPosition: 0,
        preventShutterId: null,
        outdoor: {
            minScale: 0.08,
            minMeshScale: 0.09,
            maxPosition: 0.1,
            startPosition: 0.0445,
            startMeshPosition: 0.05,
            bottomChannelPosition: 0,
            bottomChannelMaxPosition: -0.244,
            meshPositions: {},
        },
        interior: {
            heightDiff: 0,
            minScale: 0.12,
            maxPosition: 0.06,
            startPosition: -0.05,
            meshPositions: {},
        },
        modelsValue: {},
    };

    cameraRadii = {
        outdoor: {
            upper: 5.5,
        },
        interior: {
            upper: 4.5,
        },
    };

    afterRenderCallback: Observer<Scene>;
    isSubscribersAfterCreateSceneAdded = false;
    animationAdded = false;
    sampleImage;
    sampleProjectBlinds = {};
    newCreatedBlinds = [];
    samplesProjectProperties = {
        desktop: {
            outdoorProject: [
                [
                    {
                        position: new Vector3(0.29734867811203003, -0.04501425847411156, 0.534438967704773),
                        scaling: new Vector3(4.3725642634811495, 2.8136999204124744, 0.29000002753805737),
                        rotation: new Vector3(-0.015486472192962725, 0.796776148403882, 0.03725212997674584),
                        cameraRadius: 4.5,
                    },
                    {
                        position: new Vector3(0.11482419818639755, 0.10392168164253235, -2.3475422859191895),
                        scaling: new Vector3(4.774902015603808, 2.5368573151213, 0.2899999989992623),
                        rotation: new Vector3(-0.010278477771221603, 0.7332790546194814, 0.03651309262240255),
                        cameraRadius: 7.05,
                    },
                ],
                [
                    {
                        position: new Vector3(0.001988830976188183, 0.476738840341568, -1.329516887664795),
                        scaling: new Vector3(3.434298709891111, 2.4686629287379276, 0.2899999857176397),
                        rotation: new Vector3(0.0013616632133962928, 1.5675340309838868, -0.0010019671600955513),
                        cameraRadius: 6.32,
                    },
                    {
                        position: new Vector3(0.00006295923958532512, 0.4801251292228699, 1.8977419137954712),
                        scaling: new Vector3(3.571883988765506, 2.46761027866371, 0.2900000007362086),
                        rotation: new Vector3(-0.005500711989610571, 1.5757437697934713, -0.0009907685737577244),
                        cameraRadius: 6.32,
                    },
                ],
                [
                    {
                        position: new Vector3(0.025237441062927246, 0.9392757415771484, -0.4563325345516205),
                        scaling: new Vector3(4.407837867736816, 2.1931676864624023, 0.28999999165534973),
                        rotation: new Vector3(0, 1.5707963267948963, 0),
                        cameraRadius: 6.1,
                    },
                ],
            ],
            interiorProject: [
                [
                    {
                        position: new Vector3(0.013234059326350689, 0.29622238874435425, 1.4998823404312134),
                        scaling: new Vector3(1.5465457357188026, 1.4586863803482133, 0.3000000049075083),
                        rotation: new Vector3(-0.07135006632358003, 1.2886985091003846, -0.0012048454600481005),
                        cameraRadius: 4.36,
                    },
                    {
                        position: new Vector3(-0.2955589294433594, 0.48182210326194763, 0.33598020672798157),
                        scaling: new Vector3(2.3746931633049333, 2.101308661919693, 0.2999999882178008),
                        rotation: new Vector3(-0.010699203774075709, 2.7289030846839957, -0.02496797289073399),
                        cameraRadius: 5.5,
                    },
                ],
                [
                    {
                        position: new Vector3(0.023786652833223343, 0.4302184581756592, 1.1515291929244995),
                        scaling: new Vector3(2.1364926818436922, 1.5786622747826986, 0.2999999970536883),
                        rotation: new Vector3(0.023454944608095205, 1.5757145062814308, -0.0009908979814386954),
                        cameraRadius: 2.97,
                    },
                ],
                [
                    {
                        position: new Vector3(0.1126401424407959, 0.3430352509021759, -0.6037593483924866),
                        scaling: new Vector3(1.2384625460672154, 1.58436918258667, 0.300000002652508),
                        rotation: new Vector3(-0, 2.4772261205121806, 0),
                        cameraRadius: 5.42,
                    },
                    {
                        position: new Vector3(0.07913937419652939, 0.39723071455955505, -1.4381576776504517),
                        scaling: new Vector3(1.3518696897677727, 1.798421025276184, 0.3000000451164081),
                        rotation: new Vector3(0, 2.4522309204713153, 0),
                        cameraRadius: 5.42,
                    },
                    {
                        position: new Vector3(0.036581557244062424, 0.46085816621780396, -2.5080552101135254),
                        scaling: new Vector3(1.5007994512494414, 2.035703182220459, 0.29999999840384434),
                        rotation: new Vector3(0, 2.392800965097885, 0),
                        cameraRadius: 5.42,
                    },
                ],
            ],
        },
        mobile: {
            outdoorProject: [
                [
                    {
                        position: new Vector3(0.3073790967464447, -0.06024245172739029, 0.524517297744751),
                        scaling: new Vector3(4.603622319539624, 2.9705741847824028, 0.28999999640874663),
                        rotation: new Vector3(-0.01548649958920492, 0.7967762873700717, 0.03725215307108446),
                        cameraRadius: 4.5,
                    },
                    {
                        position: new Vector3(0.1380791962146759, 0.10105345398187637, -2.3684492111206055),
                        scaling: new Vector3(5.124344720536338, 2.6682730386993367, 0.28999999896097267),
                        rotation: new Vector3(-0.010278465963750621, 0.7332790134179777, 0.036513122362767415),
                        cameraRadius: 7.05,
                    },
                ],
                [
                    {
                        position: new Vector3(0.001964823342859745, 0.47113773226737976, -1.3244880437850952),
                        scaling: new Vector3(3.6407232196276937, 2.5946556453216623, 0.28999998778814917),
                        rotation: new Vector3(0.0013616624462526258, 1.5675318499693753, -0.0010019650528611558),
                        cameraRadius: 6.32,
                    },
                    {
                        position: new Vector3(0.00013237287930678576, 0.4705876410007477, 1.9011609554290771),
                        scaling: new Vector3(3.815927844069716, 2.592134671307462, 0.2900000028499275),
                        rotation: new Vector3(-0.005500714140217273, 1.5757452488151822, -0.0009907650232528508),
                        cameraRadius: 6.32,
                    },
                ],
                [
                    {
                        position: new Vector3(0.025237441062927246, 0.9463704824447632, -0.4567435085773468),
                        scaling: new Vector3(4.620665550231934, 2.3494434356689453, 0.28999999165534973),
                        rotation: new Vector3(0, 1.5707963267948963, 0),
                        cameraRadius: 6.1,
                    },
                ],
            ],
            interiorProject: [
                [
                    {
                        position: new Vector3(0.013060279190540314, 0.30162349343299866, 1.499094843864441),
                        scaling: new Vector3(1.75324426684129, 1.6224752702378036, 0.30000000217482314),
                        rotation: new Vector3(-0.07135004122812706, 1.2886985217237084, -0.001204885495981053),
                        cameraRadius: 4.36,
                    },
                    {
                        position: new Vector3(-0.30163997411727905, 0.4603618383407593, 0.33306726813316345),
                        scaling: new Vector3(2.5466783443009846, 2.1976786694398367, 0.30000000953540396),
                        rotation: new Vector3(-0.010699200322534698, 2.7289031864655016, -0.024967957802070912),
                        cameraRadius: 5.5,
                    },
                ],
                [
                    {
                        position: new Vector3(0.02381071448326111, 0.4295254945755005, 1.1597280502319336),
                        scaling: new Vector3(2.360270433382115, 1.7089289537113823, 0.29999999703894303),
                        rotation: new Vector3(0.023454947431757685, 1.575714473656159, -0.000990926119528065),
                        cameraRadius: 2.97,
                    },
                ],
                [
                    {
                        position: new Vector3(0.08158997446298599, 0.34641650319099426, -0.6280754208564758),
                        scaling: new Vector3(1.3733985428094444, 1.7252413034439087, 0.3000000051968371),
                        rotation: new Vector3(-0, 2.4772261205121806, 0),
                        cameraRadius: 5.42,
                    },
                    {
                        position: new Vector3(0.06115056946873665, 0.39742299914360046, -1.4529855251312256),
                        scaling: new Vector3(1.479090196472247, 1.9321552515029907, 0.29999997675106127),
                        rotation: new Vector3(0, 2.4522309204713153, 0),
                        cameraRadius: 5.42,
                    },
                    {
                        position: new Vector3(0.01864555850625038, 0.44448742270469666, -2.5247254371643066),
                        scaling: new Vector3(1.6039153095247722, 2.1922459602355957, 0.300000010090377),
                        rotation: new Vector3(0, 2.392800965097885, 0),
                        cameraRadius: 5.42,
                    },
                ],
            ],
        },
        mobile_portrait: {
            outdoorProject: [
                [
                    {
                        position: new Vector3(0.8434898257255554, -0.22126126289367676, 0.37842172384262085),
                        scaling: new Vector3(5.996444562840626, 2.1743920117256637, 0.2899999843495316),
                        rotation: new Vector3(0.02750369185529973, 0.36595773259798914, -0.0004395044052314558),
                        cameraRadius: 8.6,
                    },
                    {
                        position: new Vector3(0.21891340613365173, -0.180072620511055, -1.2818952798843384),
                        scaling: new Vector3(4.755204493008996, 1.8717173003263516, 0.2899999474200487),
                        rotation: new Vector3(0.027503701104984533, 0.36595796716578277, -0.00043950600460662405),
                        cameraRadius: 11.6,
                    },
                ],
                [
                    {
                        position: new Vector3(0.0015330034075304866, 0.011995813809335232, -1.1502937078475952),
                        scaling: new Vector3(3.2307186101665355, 2.3084816542959112, 0.28999998875637206),
                        rotation: new Vector3(0.001361663104908753, 1.567530831057118, -0.0010019646563499186),
                        cameraRadius: 14.1,
                    },
                    {
                        position: new Vector3(0.0014450524467974901, 0.007597779855132103, 1.6577963829040527),
                        scaling: new Vector3(3.3783853753611597, 2.334831229136248, 0.29000000691226874),
                        rotation: new Vector3(-0.005500717844375132, 1.575748057521042, -0.000990767503435116),
                        cameraRadius: 14.1,
                    },
                ],
                [
                    {
                        position: new Vector3(0.025237441062927246, 0.8204889297485352, -0.3557344973087311),
                        scaling: new Vector3(4.620665550231934, 2.383361577987671, 0.28999999165534973),
                        rotation: new Vector3(0, 1.5707963267948963, 0),
                        cameraRadius: 12.7,
                    },
                ],
            ],
            interiorProject: [
                [
                    {
                        position: new Vector3(-0.02120126038789749, 0.3583592176437378, 0.33043164014816284),
                        scaling: new Vector3(1.4860138286023992, 1.3153811263565682, 0.30000000823959616),
                        rotation: new Vector3(-0.07149457399609663, 1.2966265093882754, 0.018000831136491882),
                        cameraRadius: 4.36,
                    },
                    {
                        position: new Vector3(-0.009930583648383617, 0.5575634241104126, -0.7075933218002319),
                        scaling: new Vector3(2.6254461470600674, 1.8328961636647896, 0.29999993660686625),
                        rotation: new Vector3(-0.01750098263825143, 3.012039336541391, -0.04834776770779547),
                        cameraRadius: 5.5,
                    },
                ],
                [
                    {
                        position: new Vector3(0.0251468513160944, 0.4034079611301422, 0.3874063491821289),
                        scaling: new Vector3(2.26290405520924, 1.6738891722869904, 0.2999999970175126),
                        rotation: new Vector3(0.02345495582089723, 1.5757144369016782, -0.0009909144589884313),
                        cameraRadius: 6.1,
                    },
                ],
                [
                    {
                        position: new Vector3(0.041471339762210846, 0.5952736735343933, 0.7385839223861694),
                        scaling: new Vector3(1.405061302249755, 1.6697165966033936, 0.30000001992331543),
                        rotation: new Vector3(-0, 2.332344171477907, 0),
                        cameraRadius: 7.32,
                    },
                    {
                        position: new Vector3(0.04927757754921913, 0.6395522952079773, -0.04168247804045677),
                        scaling: new Vector3(1.5349562741506142, 1.852447687282834, 0.3000000474835309),
                        rotation: new Vector3(0, 2.332344171477907, 0),
                        cameraRadius: 7.32,
                    },
                    {
                        position: new Vector3(-0.012976708821952343, 0.6890910267829895, -1.023228645324707),
                        scaling: new Vector3(1.8124174050969792, 2.056417465209961, 0.30000001791308356),
                        rotation: new Vector3(0, 2.332344171477907, 0),
                        cameraRadius: 7.32,
                    },
                ],
            ],
        },
    };

    sceneOrientation: string;

    blindId = '';
    selectedGizmoId: string;
    resetSelectedBlind: boolean;
    preventScalingModel: boolean;
    rootMeshesByType: RootMeshesByBlindType = {
        outdoor: null,
        interior: null,
    };
    firstCreatedEngine: Engine;

    constructor(
        private ngZone: NgZone,
        private sessionStorageService: SessionStorageService,
        private shareDataService: ShareService,
        private passDataService: PassDataService,
        private compressModelService: CompressModelService,
        private screenshotToBlindService: ScreenshotToBlindService,
        private indexedDBService: IndexedDBService,
        private gizmoService: GizmoService,
    ) {}

    async loadModelWithRetry(
        rootUrl: string,
        sceneFilename?: string,
        scene?: Nullable<Scene>,
        onProgress?: Nullable<(event: ISceneLoaderProgressEvent) => void>,
        pluginExtension?: Nullable<string>,
        attempt: number = 1,
    ): Promise<any> {
        try {
            return await SceneLoader.LoadAssetContainerAsync(rootUrl, sceneFilename, scene, onProgress, pluginExtension);
        } catch (error) {
            if (attempt < MAX_RETRY_ATTEMPTS) {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.loadModelWithRetry(rootUrl, sceneFilename, scene, onProgress, pluginExtension, attempt + 1)
                            .then(resolve)
                            .catch(reject);
                    }, ATTEMPTS_DELAY_MS);
                });
            } else {
                throw error;
            }
        }
    }

    public init(canvas: ElementRef<HTMLCanvasElement>): void {
        const sessionBlindType = this.sessionStorageService.getModelSize(STORAGE_NAMES.zip_blind_type);
        const viewType = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_view_type);
        const currentBlindId = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_current_blind_id);
        const lastOpenBlindId = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_last_opened_blind_id);

        this.isImageVisualisation = viewType === VIEW_TYPES.image_visualisation;
        this.selectedGizmoId = '';
        this.rootMeshesByType = { outdoor: null, interior: null };
        this.currentBehaviour = 'rotate';
        this.canvas = canvas.nativeElement;
        this.engine = new Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
        });
        this.createScene(sessionBlindType || 'outdoor', currentBlindId || lastOpenBlindId || '');
    }

    public createScene(type: string, id: string = '', afterViewChange = false): void {
        const visibleStatus = this.isImageVisualisation ? this.getCurrentRootMesh()?.isEnabled() : false;

        this.setGizmoZoomModelBehavior(false);
        this.setModelAndBoundingBoxSettings();
        this.getCurrentRootMesh()?.setEnabled(visibleStatus);
        this.blindId = id;

        if (!this.isImageVisualisation && this.scene?.meshes?.length) {
            this.setIdForSceneMeshes(id);
        }

        if (this.isImageVisualisation) {
            this.selectedGizmoId = id;
            this.IVSceneHandler(id, type);
            return;
        }

        if (this.blindType === type && this.isModelCreated && !afterViewChange) {
            this.setModelDefaultPosition();
            this.setDefaultView();
            this.setGizmoScaleControlVisibleDYB();
            this.shareDataService.getModelLoaded.pipe(first()).subscribe(this.setSceneAndModelViewCreated.bind(this, type));

            return;
        }

        const defaultSizeData = this.sessionStorageService.getModelSize(STORAGE_NAMES.default_model_size);
        this.removeScenePointerEvents();
        this.rootMeshesByType = { outdoor: null, interior: null };

        this.blindType = type;
        this.isModelCreated = false;
        this.defaultSize = defaultSizeData || this.defaultSize;
        this.scene = new Scene(this.engine);
        // this.scene.clearColor = new Color4(0.76953125, 0.7421875, 0.71875, 1);
        this.scene.clearColor = new Color4(0, 0, 0, 0);
        this.scene.collisionsEnabled = true;
        this.setZoomSettings(type);
        this.createCamera();

        this.modelLoaderHandler();
        this.createSceneEventsHandler();
        this.createSceneSubscriptionsHandler();
        this.touchHandler(this.lowerRadius);
    }

    modelLoaderHandler(): void {
        const blindType = this.blindType === 'outdoor' ? this.blindOutdoor : this.blindInterior;

        this.loadModelWithRetry(this.baseUrl, blindType, this.scene)
            .then((container: AssetContainer) => this.setupSceneHandler(container))
            .then(() => {
                this.setDefaultView();
                this.lightGeneralSetupHandler(false);
                // this.showAxis(1, this.scene);
                this.groundGeneralSetupHandler();

                if (this.isImageVisualisation) {
                    this.changeViewType(true);
                }

                this.isModelCreated = true;
                this.setCameraOffset();
                this.setSceneAndModelViewCreated(this.blindType);
                setTimeout(this.setGizmoControl.bind(this, true));
            });
    }

    createSceneEventsHandler(): void {
        const attribute = 'data-scene-listeners';
        const listenersAdded = this.canvas.getAttribute(attribute);

        this.scene.onPointerDown = (evt, pickResult) => this.scenePointerDownListener(evt, pickResult);
        this.scene.onPointerMove = () => {
            this.scenePointerMoveListener();
            // this.ivScenePointerMoveListener(evt, pickResult);
        };

        if (!listenersAdded) {
            this.canvas.addEventListener('wheel', this.zoomHandler.bind(this));
            this.canvas.addEventListener('pointerup', this.canvasPointerUpEventListener.bind(this));
            this.canvas.addEventListener('pointermove', this.canvasPointerMoveEventListener.bind(this));
            this.canvas.addEventListener('touchmove', this.canvasTouchEventListener.bind(this));
            this.canvas.addEventListener('touchstart', (event) => event.preventDefault());
            this.canvas.addEventListener('pointerleave', () => (this.clicked = false));
            this.canvas.addEventListener('pointerout', () => (this.clicked = false));

            this.canvas.setAttribute(attribute, 'true');
        }
    }

    createSceneSubscriptionsHandler(): void {
        if (!this.isSubscribersAfterCreateSceneAdded) {
            this.getColor().subscribe((res) => this.getColorSceneHandler(res));
            this.getSize().subscribe((res) => this.getSizeSceneHandler(res));
            this.getTopStyle().subscribe((res) => this.getTopStyleSceneHandler(res));
            this.getBottomBar().subscribe((res) => this.getBottomBarSceneHandler(res));
            this.getOperation().subscribe((res) => this.getOperationSceneHandler(res));
            this.getReverse().subscribe((res) => this.getReverseSceneHandler(res));
            this.getMounting().subscribe((res) => this.getMountingSceneHandler(res));
            this.getBottomChannel().subscribe((res) => this.getBottomChannelHandler(res));

            this.isSubscribersAfterCreateSceneAdded = true;
        }
    }

    removeScenePointerEvents(): void {
        if (this.scene) {
            this.scene.onPointerDown = () => {};
            this.scene.onPointerMove = () => {};
        }
    }

    setSceneAndModelViewCreated(type: string, displayStatus?: boolean): void {
        this.displayModelHandler(displayStatus);
        this.shareDataService.setSceneCreated(type);
    }

    displayModelHandler(displayStatus: boolean): void {
        const defaultData = !!this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_config);
        displayStatus ??= defaultData;
        this.getCurrentRootMesh()?.setEnabled(displayStatus);
        this.setGizmoScaleControlVisibleDYB();
    }

    setDefaultCursor() {
        this.shareDataService.setCursorPointer({
            cursor: this.canvas.style.cursor,
            clicked: this.clicked,
            zoomIn: this.camera.radius !== this.upperRadius,
            imageVisualisation: this.isImageVisualisation,
            reset: true,
        });
    }

    setDragCursor() {
        this.shareDataService.setCursorPointer({
            drag: true,
            dragged: this.draggedModel,
            imageVisualisation: this.isImageVisualisation,
        });
    }

    setRotateCursor() {
        this.shareDataService.setCursorPointer({
            rotate: true,
            rotated: this.rotatedModel,
            imageVisualisation: this.isImageVisualisation,
        });
    }

    scenePointerDownListener(event: IPointerEvent, pickResult: PickingInfo): void {
        let pickedMesh = pickResult.pickedMesh;

        if (this.isImageVisualisation && event) {
            const pickedMeshes = this.scene
                .multiPickWithRay(pickResult.ray, null)
                .map((pickingInfo: PickingInfo) => pickingInfo.pickedMesh)
                .sort((pickedMesh1, pickedMesh2) => pickedMesh2.renderingGroupId - pickedMesh1.renderingGroupId);

            if (pickedMeshes.length) {
                pickedMesh = pickedMeshes.find((mesh) => mesh.name === 'box') || pickedMeshes[0];
            }
        }

        this.clicked = true;
        this.canvas.style.cursor = `url(../../../../assets/icons/cursor_move_IV.svg) 11 5, grabbing`;
        this.shareDataService.setCursorGrab({
            cursor: this.canvas.style.cursor,
            clicked: this.clicked,
            imageVisualisation: this.isImageVisualisation,
        });

        if (this.isImageVisualisation && pickedMesh && pickedMesh?.name !== 'box' && !this.gizmoHoveredControl) {
            this.preventScalingModel = true;
            const id = parseInt(pickedMesh.parent.name, 10)?.toString();
            this.setModelAndBoundingBoxSettings();
            this.setGizmoControlVisible(true);
            this.shareDataService.setSelectedModel(id);
        }

        if (this.isImageVisualisation && !pickedMesh) {
            this.setGizmoControlVisible(false);
        }

        if (pickedMesh?.name === 'box') {
            this.setGizmoControlVisible(true);

            if (this.isImageVisualisation && event && !this.mobileAndTabletCheck()) {
                const pointPicked = pickResult.pickedPoint.clone();
                const currentMoveRay = Ray.CreateNewFromTo(this.camera.position, pointPicked);
                this.gizmoDragModelBehavior.startDrag(event.pointerId, currentMoveRay);
            }
        }
    }

    scenePointerMoveListener(): void {
        this.pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (!this.drag) {
            this.canvas.style.cursor = `url(../../../../assets/icons/cursor_click_IV.svg) 11 5, grab`;
        } else if (this.drag) {
            this.canvas.style.cursor = `url(../../../../assets/icons/cursor_move_IV.svg) 11 5, grabbing`;
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    canvasPointerMoveEventListener(): void {
        if (!this.clicked) {
            return;
        }

        if (!this.isModelMoved) {
            this.isModelMoved = true;
        }

        this.drag = true;
        this.modelDragging = true;

        if (this.dragModelBehavior && this.controlType === CONTROL_TYPES.move) {
            this.draggedModel = true;
        }

        if (this.rotateModelObserver && this.controlType === CONTROL_TYPES.rotate) {
            this.rotatedModel = true;
        }

        if (!this.canvas.style.cursor.includes('grabbing')) {
            this.canvas.style.cursor = `url(../../../../assets/icons/cursor_move_IV.svg) 11 5, grabbing`;
        }
    }

    canvasPointerUpEventListener(): void {
        this.shareDataService.setCursorPointer({
            cursor: this.canvas.style.cursor,
            clicked: this.clicked,
            zoomIn: this.camera.radius !== this.upperRadius,
            imageVisualisation: this.isImageVisualisation,
        });
        this.canvas.style.cursor = `url(../../../../assets/icons/cursor_click_IV.svg) 11 5, grab`;
        this.drag = false;
        this.clicked = false;
        this.calculateModelRotations();
    }

    canvasTouchEventListener(e): void {
        if (e.targetTouches.length === 2) {
            const input = this.camera.inputs.attached.pointers;
            // @ts-ignore
            input.pinchZoom = false;

            if (this.camera.radius === this.upperRadius) {
                // @ts-ignore
                input.panningSensibility = 500;
                this.zoomInHandler();
                // @ts-ignore
                input.pinchPrecision = 100;

                this.shareDataService.setCursorPointer({
                    cursor: this.canvas.style.cursor,
                    clicked: this.clicked,
                    zoomIn: true,
                    imageVisualisation: this.isImageVisualisation,
                });
            }

            if (this.camera.radius - 0.2 >= this.upperRadius) {
                this.zoomOutHandler(1500);
            }
        }
    }

    getAnimationScene() {
        switch (this.animationType) {
            case 'mounting':
                this.getMountingSceneHandler(this.animationResponse);
                break;
            case 'reverse':
                this.getReverseSceneHandler(this.animationResponse);
                break;
            case 'operation':
                this.getOperationSceneHandler(this.animationResponse);
                break;
            case 'bottomBar':
                this.getBottomBarSceneHandler(this.animationResponse);
                break;
            case 'topStyle':
                this.getTopStyleSceneHandler(this.animationResponse);
                break;
            case 'bottomChannel':
                this.getBottomChannelHandler(this.animationResponse);
                break;
        }
    }

    getMountingSceneHandler(res): void {
        this.animationResponse = res;
        this.animationType = 'mounting';

        const revealChannelMeshes = this.blindType === 'outdoor' ? REVEAL_CHANNEL : REVEAL_CHANNEL_INTERIOR;
        const faceFixChannelMeshes = this.blindType === 'outdoor' ? FACE_FIX : FACE_FIX_INTERIOR;

        for (const mesh of revealChannelMeshes) {
            if (this.scene.getMeshByName(this.blindId + mesh)) {
                this.scene.getMeshByName(this.blindId + mesh).setEnabled(+res.id !== 2);
            }
        }

        for (const mesh of faceFixChannelMeshes) {
            if (this.scene.getMeshByName(this.blindId + mesh)) {
                this.scene.getMeshByName(this.blindId + mesh).setEnabled(+res.id !== 1);
            }
        }

        if (this.defaultStyles[this.blindType].mounting && res.type === 'click' && this.checkIsDesignView()) {
            const { X, Y, Z } = this.targetModelXYZ('mounting');

            this.zoomOnSelectedMesh(Z, Y, this.cameraRotation + 1.5, X);
            this.hintDrivingHelper(res, 'mounting');
        }

        this.defaultStyles[this.blindType].mounting = true;
        this.boxStatus(!Object.values(this.defaultStyles).every((item) => item));

        if (!res.from_config) {
            this.shareDataService.setModelLoaded(Object.values(this.defaultStyles).every((item) => item));
        }

        this.setFontSize();
    }

    getReverseSceneHandler(res): void {
        this.animationResponse = res;
        this.animationType = 'reverse';

        for (const mesh of res.meshes) {
            if (this.scene.getMeshByName(this.blindId + mesh)) {
                this.scene.getMeshByName(this.blindId + mesh).setEnabled(res.state);
            }
        }

        if (this.defaultStyles[this.blindType].operation && res.type === 'click' && this.checkIsDesignView()) {
            const { X, Y, Z } = this.targetModelXYZ('reverse');

            this.zoomOnSelectedMesh(Z, Y, this.cameraRotation + 2.5, X);

            this.hintDrivingHelper(res, 'reverse');
        }

        if (!res.state) {
            this.isHintsVisible();
        }
    }

    targetModelXYZ(type): any {
        const blindType = this.getBlindTypeFromStorage() || 'outdoor';
        let targetZ: number;
        let targetY: number;
        let targetX: number;
        let mesh: AbstractMesh;

        if (type === 'top' || type === 'mounting') {
            const meshByType = blindType === 'outdoor' ? MESHES_IDS[85] : INTERIOR_MESHES_IDS[111];
            mesh = this.scene.getMeshByName(this.blindId + meshByType);
        }

        if (type === 'bottom' || type === 'reverse' || type === 'bottomChannel') {
            const meshByType = blindType === 'outdoor' ? MESHES_IDS[107] : INTERIOR_MESHES_IDS[137];
            mesh = this.scene.getMeshByName(this.blindId + meshByType);
        }

        if (type === 'operation') {
            const meshByType = blindType === 'outdoor' ? MESHES_IDS[44] : INTERIOR_MESHES_IDS[111];
            mesh = this.scene.getMeshByName(this.blindId + meshByType);
        }

        const { x, y, z } = mesh.absolutePosition;

        targetX = x - 1.5;
        targetY = y;
        targetZ = z < 0 ? +0.2 : -0.2;

        if (type === 'reverse') {
            targetX = -0.2;
            targetZ = 0;
        }

        if (type === 'mounting') {
            targetX = x - 0.1;
            targetY = blindType === 'outdoor' ? 1 - (this.defaultModelSize.height - this.currentHeight) / 2 : y + 0.1;
            targetZ = z + 0.2;
        }

        if (type === 'operation' || type === 'top') {
            targetX = x - 0.1;
            targetZ = z + 0.2;
        }

        if (type === 'bottom') {
            targetX = 0.2;
            targetZ = 0;
        }

        if (type === 'bottomChannel') {
            targetX = 0.4;
            targetZ = 0;
            targetY = (this.currentHeight / 2) * -1;
        }

        if (window.innerWidth < this.breakpoints['tablet-landscape']) {
            targetX = x;
            targetZ = z;
        }

        return {
            Y: targetY,
            Z: targetZ,
            X: targetX,
        };
    }

    getOperationSceneHandler(res): void {
        this.animationResponse = res;
        this.animationType = 'operation';

        for (const mesh of res.meshes) {
            if (this.scene.getMeshByName(this.blindId + mesh)) {
                this.scene.getMeshByName(this.blindId + mesh).setEnabled(+res.id !== 2);
            }
        }

        if (this.defaultStyles[this.blindType].operation && res.type === 'click' && this.checkIsDesignView()) {
            const { X, Y, Z } = this.targetModelXYZ('operation');
            this.zoomOnSelectedMesh(Z, Y, this.cameraRotation + 0.5, X);
            this.hintDrivingHelper(res, 'operation');
        }

        this.defaultStyles[this.blindType].operation = true;
    }

    getBottomBarSceneHandler(res): void {
        this.animationResponse = res;
        this.animationType = 'bottomBar';

        for (const meshId of GLOBAL_STRIP) {
            if (this.scene.getMeshByName(this.blindId + meshId)) {
                this.scene.getMeshByName(this.blindId + meshId).setEnabled(false);
            }
        }

        if (res?.meshes) {
            for (const meshId of res.meshes) {
                if (this.scene.getMeshByName(this.blindId + meshId)) {
                    this.scene.getMeshByName(this.blindId + meshId).setEnabled(true);
                }
            }
        }

        if (this.defaultStyles[this.blindType].bottomBar && res.type === 'click' && this.checkIsDesignView()) {
            const { X, Y, Z } = this.targetModelXYZ('bottom');

            this.zoomOnSelectedMesh(Z, Y, this.cameraRotation + 0.5, X);
            this.hintDrivingHelper(res, 'bottomBar');
        }

        this.defaultStyles[this.blindType].bottomBar = true;
    }

    getTopStyleSceneHandler(res): void {
        this.animationResponse = res;
        this.animationType = 'topStyle';

        for (const meshId of GLOBAL_PELMET) {
            if (this.scene.getMeshByName(this.blindId + meshId)) {
                this.scene.getMeshByName(this.blindId + meshId).setEnabled(false);
            }
        }

        for (const meshId of res.meshes) {
            if (this.scene.getMeshByName(this.blindId + meshId)) {
                this.scene.getMeshByName(this.blindId + meshId).setEnabled(true);
            }
        }

        if (this.defaultStyles[this.blindType].topStyle && res.type === 'click' && this.checkIsDesignView()) {
            const { X, Y, Z } = this.targetModelXYZ('top');

            this.zoomOnSelectedMesh(Z, Y, this.cameraRotation + 0.5, X);
            this.hintDrivingHelper(res, 'topStyle');
        }

        this.defaultStyles[this.blindType].topStyle = true;
    }

    getBottomChannelHandler(res): void {
        this.animationResponse = res;
        this.animationType = 'bottomChannel';

        for (const meshId of res.meshes) {
            if (this.scene.getMeshByName(this.blindId + meshId)) {
                this.scene.getMeshByName(this.blindId + meshId).setEnabled(res.state);
            }
        }

        if (this.defaultStyles[this.blindType].bottomChannel && res.type === 'click' && this.checkIsDesignView()) {
            const { X, Y, Z } = this.targetModelXYZ('bottomChannel');
            this.zoomOnSelectedMesh(Z, Y, this.cameraRotation + 0.5, X);

            this.hintDrivingHelper(res, 'bottomChannel');
        }

        if (!res.state) {
            this.isHintsVisible();
        }

        this.defaultStyles[this.blindType].bottomChannel = true;
    }

    getInteriorFaceFixStopper(state: boolean): void {
        for (const meshId of FACE_FIX_STOPPER_INTERIOR) {
            if (this.scene.getMeshByName(meshId)) {
                this.scene.getMeshByName(meshId).setEnabled(state);
            }
        }
    }

    getSizeSceneHandler(res): void {
        if (this.camera.radius === this.upperRadius) {
            this.setCameraOffset();
        }

        if (Object.hasOwn(res, 'width')) {
            this.currentWidth = res.width;
            this.sceneWidthSize(res);
        } else if (Object.hasOwn(res, 'height')) {
            this.currentHeight = res.height;
            this.sceneHeightSize(res);
        }

        this.setGizmoBoundingBoxScaling(res);
        this.setDYBCameraRadius();
        this.setMaterialTextureSize();

        this.middleRadius = 0.8 * this.currentWidth;

        if (res.width > 1.7 || res.height > 1.7) {
            this.camera.panningDistanceLimit = 1.2;
        } else {
            this.camera.panningDistanceLimit = 0.8;
        }
    }

    getTopSceneHandler(res = 1, saveValue = true): void {
        const id = this.selectedGizmoId || this.blindId;
        /*
         * MATERIAL-2
         * LARGE WEATHER STRIP-1
         * CUSTOM MADE SKIRT-1
         * ALL BLINDS 2-1
         * ALL BLINDS 2-2
         * ALL BLINDS 2-3
         * ALL BLINDS 2-4
         * ALL BLINDS 3-1
         * ALL BLINDS 3-2
         * HDBB-1
         * REVERSE HANDLE LEVER-1
         * REVERSE HANDLE-1
         * SPLINE-1
         * SPLINE-2
         * SPRING BALANCE ALUMINIUM FLAT BAR-1
         * SPRING BALANCE ALUMINIUM FLAT BAR-2
         * SPRING BALANCE BODY COVER LEFT
         * SPRING BALANCE BODY COVER RIGHT
         * SPRING BALANCE BODY-1
         * SPRING BALANCE BOTTOM STOP-2 **
         * SPRING BALANCE BOTTOM STOP-3 **
         * SPRING BALANCE END CAP-2
         * SPRING BALANCE END CAP-3
         * SPRING BALANCE HANDLE BODY-1
         * SPRING BALANCE HANDLE-1
         * SPRING BALANCE TONGUE LEFT
         * SPRING BALANCE TONGUE RIGHT
         * STANDARD WEATHER STRIP-1
         * */

        if (!this.isModelCreated) {
            return;
        }

        if (res !== 1 && this.isImageVisualisation) {
            this.shareDataService.setIVResetStatus(true);
        }

        const preventChange = id === this.shutter.preventShutterId;
        this.shutter.modelsValue[id] = saveValue && !preventChange ? res : this.shutter.modelsValue[id];

        res = preventChange ? 1 : res;
        const inverseRes = 1 - res;

        if (this.blindType === 'outdoor' && this.shutter.materialScale) {
            this.scene.getMeshByName(id + MESHES_IDS[2]).scaling.y = this.shutter.outdoor.minScale + this.shutter.materialScale * res;
            this.scene.getMeshByName(id + MESHES_IDS[143]).scaling.y = this.shutter.outdoor.minMeshScale + this.shutter.meshScale * res;
            this.scene.getMeshByName(id + MESHES_IDS[144]).scaling.y = this.shutter.outdoor.minMeshScale + this.shutter.meshScale * res;

            this.scene.getMeshByName(id + MESHES_IDS[2]).position.y =
                this.shutter.outdoor.startPosition + this.shutter.materialPosition - this.shutter.materialPosition * res - 0.0265 * inverseRes;
            this.scene.getMeshByName(id + MESHES_IDS[143]).position.y =
                this.shutter.outdoor.startMeshPosition + this.shutter.materialPosition - this.shutter.materialPosition * res - 0.015 * inverseRes;
            this.scene.getMeshByName(id + MESHES_IDS[144]).position.y =
                this.shutter.outdoor.startMeshPosition + this.shutter.materialPosition - this.shutter.materialPosition * res - 0.015 * inverseRes;

            Object.entries(this.shutter.outdoor.meshPositions).forEach(([key, position]: [string, number]) => {
                this.scene.getMeshByName(id + MESHES_IDS[key]).position.y =
                    position +
                    2 * (this.shutter.outdoor.bottomChannelPosition * inverseRes) +
                    this.shutter.outdoor.bottomChannelMaxPosition * inverseRes;
            });
        }

        if (this.blindType === 'interior' && this.shutter.materialScale) {
            this.scene.getMeshByName(id + INTERIOR_MESHES_IDS[135]).scaling.y =
                this.shutter.interior.minScale + (this.shutter.materialScale - this.shutter.interior.minScale) * res;
            this.scene.getMeshByName(id + INTERIOR_MESHES_IDS[135]).position.y =
                this.shutter.interior.startPosition + this.shutter.materialPosition * inverseRes + 0.03 * res;

            Object.entries(this.shutter.interior.meshPositions).forEach(([key, position]: [string, number]) => {
                this.scene.getMeshByName(id + INTERIOR_MESHES_IDS[key]).position.y =
                    position + 2 * this.shutter.materialPosition * inverseRes - this.shutter.interior.maxPosition * inverseRes;
            });
        }

        this.setMaterialTextureSize();
    }

    getShutterValue(id = this.selectedGizmoId || this.blindId): number {
        const shutterValues = this.shutter.modelsValue;
        return this.isImageVisualisation
            ? Object.hasOwn(shutterValues, id)
                ? shutterValues[id]
                : this.shutter.IVDefaultValue
            : shutterValues[id];
    }

    getColorSceneHandler(res): void {
        const material = new PBRMaterial('', this.scene);
        const mesh = this.scene.getMeshByName(this.blindId + res.model);
        const isCustom = res.model.toLowerCase().includes('custom');

        this.getMaterialTypes();

        if (this.materialTypes?.includes(res.texture) || isCustom) {
            if (res.opacity >= MINIMUM_MATERIAL_OPACITY) {
                material.albedoTexture = new Texture(`../../../../assets/textures/${res.blind_type}.png`, this.scene);
                material.albedoTexture.hasAlpha = res.texture !== 'light_blocking';
                material.useAlphaFromAlbedoTexture = res.texture === 'light_filtering';
                material.specularIntensity = 0;
                material.roughness = 1;
                this.calcMaterialTextureSize(mesh, material, this.blindId);
            }

            if (this.shadowGenerator && !isCustom) {
                this.shadowGenerator.transparencyShadow = res.opacity >= MINIMUM_MATERIAL_OPACITY;
            }
        } else if (res.texture === 'frame') {
            material.metallicF0Factor = 0.1;
            material.indexOfRefraction = 3;
            material.specularIntensity = 1;
            material.roughness = 0.45;
            material.reflectionColor = new Color3(1, 1, 1);
        }

        material.albedoColor = Color3.FromHexString(res.modelColor).toLinearSpace();
        material.metallic = 0;

        if (mesh) {
            mesh.material = material;
            mesh.material.alpha = res.opacity;
        }

        this.defaultStyles[res.blind_type].color = true;

        if (this.camera.radius === this.upperRadius) {
            this.setCameraOffset();
        }

        if (this.materialOpacity !== res.opacity) {
            this.materialOpacity = res.opacity;
            this.zoomOutHandler(30);
        }
    }

    setupSceneHandler(container: AssetContainer): any {
        const getBlindType = this.getBlindTypeFromStorage() || 'outdoor';

        container.addAllToScene();
        container.meshes[0]['blind_type'] = this.blindType;
        container.meshes.forEach((mesh) => {
            mesh.checkCollisions = true;

            if (this.blindId) {
                mesh.name = `${this.blindId}${mesh.id}`;
            }
        });

        this.setDYBCameraSettings();

        const color = new StandardMaterial('', this.scene);
        color.diffuseColor = Color3.FromHexString('#818181');

        for (const meshId of GLOBAL_HIDDEN_PELMET) {
            this.scene.getMeshByName(this.blindId + meshId)?.setEnabled(false);
        }

        this.rootMeshesByType[this.blindType] = container.meshes[0];

        this.getGlobalMeshPositionAndScale(getBlindType);

        this.boundingBoxRotation = null;
        this.boundingBoxScale = null;
        this.boundingBoxAbsoluteScale = null;

        this.rootMeshScale = null;
        this.rootMeshAbsoluteScale = null;
        this.rootStartMeshScale = null;
        this.rootMeshPosition = null;

        // TODO: Need to be finished LOADING model
        // this.boxMaskHandler();

        return this.scene;
    }

    showAxis(size, scene): void {
        const makeTextPlane = (text, color, weight) => {
            const dynamicTexture = new DynamicTexture('DynamicTexture', 50, scene, true);
            dynamicTexture.hasAlpha = true;
            dynamicTexture.drawText(text, 5, 40, 'bold 36px Arial', color, 'transparent', true);
            const plane = MeshBuilder.CreatePlane('TextPlane', { size: weight }, scene);
            const planeMaterial = new StandardMaterial('TextPlaneMaterial', scene);
            plane.material = planeMaterial;
            planeMaterial.backFaceCulling = false;
            planeMaterial.specularColor = new Color3(0, 0, 0);
            planeMaterial.diffuseTexture = dynamicTexture;
            return plane;
        };

        const axisX = MeshBuilder.CreateLines(
            'axisX',
            {
                points: [
                    Vector3.Zero(),
                    new Vector3(size, 0, 0),
                    new Vector3(size * 0.95, 0.05 * size, 0),
                    new Vector3(size, 0, 0),
                    new Vector3(size * 0.95, -0.05 * size, 0),
                ],
            },
            scene,
        );
        axisX.color = new Color3(1, 0, 0);
        const xChar = makeTextPlane('X', 'red', size / 10);
        xChar.position = new Vector3(0.9 * size, -0.05 * size, 0);

        const axisY = MeshBuilder.CreateLines(
            'axisY',
            {
                points: [
                    Vector3.Zero(),
                    new Vector3(0, size, 0),
                    new Vector3(-0.05 * size, size * 0.95, 0),
                    new Vector3(0, size, 0),
                    new Vector3(0.05 * size, size * 0.95, 0),
                ],
            },
            scene,
        );
        axisY.color = new Color3(0, 1, 0);
        const yChar = makeTextPlane('Y', 'green', size / 10);
        yChar.position = new Vector3(0, 0.9 * size, -0.05 * size);

        const axisZ = MeshBuilder.CreateLines(
            'axisZ',
            {
                points: [
                    Vector3.Zero(),
                    new Vector3(0, 0, size),
                    new Vector3(0, -0.05 * size, size * 0.95),
                    new Vector3(0, 0, size),
                    new Vector3(0, 0.05 * size, size * 0.95),
                ],
            },
            scene,
        );
        axisZ.color = new Color3(0, 0, 1);
        const zChar = makeTextPlane('Z', 'blue', size / 10);
        zChar.position = new Vector3(0, 0.05 * size, 0.9 * size);
    }

    rotationAlphaBetaHandler(): void {
        const rotationsAlpha = Math.round(this.camera.alpha / Math.PI);
        const rotationsBeta = Math.round(this.camera.beta / Math.PI);

        this.currentAlpha = this.camera.alpha - rotationsAlpha * Math.PI;
        this.currentBeta = this.camera.beta - rotationsBeta * Math.PI;
        this.modelPosition = rotationsAlpha % 2 === 0 ? 'back' : 'front';
    }

    calculateModelRotations(): void {
        this.rotationAlphaBetaHandler();

        if (this.cameraRotation + Math.PI < this.camera.alpha) {
            this.cameraRotation += 2 * Math.PI;
        }
        if (this.cameraRotation - Math.PI > this.camera.alpha) {
            this.cameraRotation -= 2 * Math.PI;
        }
    }

    onIntersection() {
        this.isZoomedIn = false;
        this.zoomCounter = 0;
        Animation.CreateAndStartAnimation('anim', this.camera, 'target.x', 60, 40, this.camera.target.x, 0, 0);
        Animation.CreateAndStartAnimation('anim', this.camera, 'target.y', 60, 40, this.camera.target.y, 0, 0);
        Animation.CreateAndStartAnimation('anim', this.camera, 'target.z', 60, 40, this.camera.target.z, 0, 0);
        Animation.CreateAndStartAnimation(
            'anim',
            this.camera,
            'targetScreenOffset.x',
            60,
            40,
            this.camera.targetScreenOffset.x,
            window.innerWidth > this.breakpoints['tablet-landscape'] ? this.upperCameraOffset : this.mobileCameraOffset,
            0,
        );
        Animation.CreateAndStartAnimation('anim', this.camera, 'targetScreenOffset.y', 15, 10, this.camera.targetScreenOffset.y, 0, 0);
        const zoomOutEnd = Animation.CreateAndStartAnimation('anim', this.camera, 'radius', 60, 40, this.camera.radius, this.upperRadius, 0);

        zoomOutEnd.onAnimationEnd = () => {
            this.isHintsVisible();
        };
    }

    lightGeneralSetupHandler(IVstatus: boolean): void {
        const lightPositions = {
            front: IVstatus ? new Vector3(1, -1, 0) : new Vector3(0, -1, 1),
            back: IVstatus ? new Vector3(-1, 0, 0) : new Vector3(0, 1, -5),
            right: IVstatus ? new Vector3(-1, 1, -5) : new Vector3(-5, 1, -1),
            left: IVstatus ? new Vector3(1, 1, 5) : new Vector3(5, 1, 1),
        };

        this.light?.dispose();
        this.scene.getLightByName('HemiLight')?.dispose();
        this.scene.getLightByName('backDirectLight')?.dispose();
        this.scene.getLightByName('pointLight')?.dispose();
        this.scene.getLightByName('leftLight')?.dispose();

        const hemiLight = new HemisphericLight('HemiLight', new Vector3(0, 0, 0), this.scene);
        hemiLight.specular = new Color3(0, 0, 0);
        hemiLight.intensity = 1.4;

        this.light = new DirectionalLight('frontDirectLight', lightPositions.front, this.scene);
        this.light.intensity = 1.5;

        const backLight = new DirectionalLight('backDirectLight', lightPositions.back, this.scene);
        backLight.intensity = 0.3;
        backLight.specular = new Color3(0, 0, 0);

        const rightLight = new PointLight('pointLight', lightPositions.right, this.scene);
        rightLight.intensity = 0.1;

        const leftLight = new PointLight('leftLight', lightPositions.left, this.scene);
        leftLight.intensity = 0.1;
    }

    groundGeneralSetupHandler(): void {
        this.ground = MeshBuilder.CreateDisc('ground', { radius: 4.5 }, this.scene);
        this.ground.isPickable = false;
        const groundMaterial = new StandardMaterial('ground', this.scene);
        groundMaterial.emissiveColor = new Color3(0, 0, 0);

        this.ground.material = groundMaterial;
        this.ground.rotation.x = Math.PI / 2;
        this.ground.position.y = this.groundPositionY;
        this.ground.position.z = 0.4;

        this.shadowGenerator = new ShadowGenerator(512, this.light);

        this.shadowGenerator.bias = 0.00001;
        this.shadowGenerator.normalBias = 0.01;
        this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.1;
        this.shadowGenerator.setDarkness(0);
        this.shadowGenerator.blurBoxOffset = 3;
        this.shadowGenerator.blurKernel = 4;
        this.shadowGenerator.blurScale = 4;
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.addShadowCaster(this.scene.meshes[0]);
        this.ground.receiveShadows = true;
    }

    hintDrivingHelper(data, type): void {
        const getBlindType = this.getBlindTypeFromStorage() || 'outdoor';
        this.isHintsVisible();

        if (data.description) {
            if (type === 'bottomBar') {
                this.hintsComponentHandler(data.description, data.meshes[0]);
            }

            if (type === 'bottomChannel') {
                this.hintsComponentHandler(data.description, data.meshes[0]);
            }

            if (type === 'reverse') {
                this.hintsComponentHandler(data.description, MESHES_IDS[142]);
            }

            if (type === 'topStyle') {
                this.hintsComponentHandler(data.description, data.meshes[1]);
            }

            if (type === 'operation') {
                this.hintsComponentHandler(data.description, getBlindType === 'outdoor' ? data.meshes[5] : INTERIOR_MESHES_IDS[111]);
            }

            if (type === 'mounting') {
                const parent = this.scene.getMeshByName(
                    (this.blindId || '') + (getBlindType === 'outdoor' ? data.meshes[0] : INTERIOR_MESHES_IDS[111]),
                );
                const hintsNodeName = 'node';
                const hintsNode = new Mesh(this.blindId + hintsNodeName, this.scene, parent);

                if (getBlindType === 'outdoor') {
                    hintsNode.position.y = 0.25;
                } else {
                    hintsNode.position.y += 0.1;
                }

                this.hintsComponentHandler(data.description, hintsNodeName);
                const addOffsetY =
                    this.currentHeight < this.defaultModelSize.height && this.isMobile ? (this.defaultModelSize.height - this.currentHeight) * 90 : 0;
                this.rect.linkOffsetY = -200 + addOffsetY;
                this.target.linkOffsetY = 0;
            }

            const isSmallPhoneLandscapeScreen =
                window.window.innerHeight < window.innerWidth && window.innerHeight <= 600 && window.innerWidth <= 992;
            if (isSmallPhoneLandscapeScreen) {
                this.rect.linkOffsetY = -50;
            }
        }
    }

    isHintsVisible(): void {
        if (this.rect && this.target && this.label && this.line) {
            this.rect.isVisible = false;
            this.target.isVisible = false;
            this.label.isVisible = false;
            this.line.isVisible = false;
        }
    }

    setZoomSettings(blindType): void {
        if (window.innerWidth >= this.breakpoints['tablet-portrait']) {
            this.upperRadius = this.cameraRadii[blindType].upper;
            const addCameraOffset =
                window.innerWidth > this.breakpoints['full-hd'] ? (window.innerWidth - this.breakpoints['full-hd']) / 1750 : 0;
            this.upperCameraOffset = blindType === 'outdoor' ? -1.2 + addCameraOffset : -0.9;
        }

        this.zoomRadius = [this.upperRadius, (this.upperRadius + this.lowerRadius) / 2, this.lowerRadius];
        this.zoomCameraOffsets = [this.upperCameraOffset, (this.upperCameraOffset + this.lowerCameraOffset) / 2, this.lowerCameraOffset];
    }

    zoomOnSelectedMesh(positionZ, positionY, alpha, positionX = 0): void {
        this.pickResult = this.scene.pick(positionZ, positionY);
        this.isZoomedIn = true;
        this.isZoomedOut = false;
        this.camera.checkCollisions = false;
        this.zoomCounter = 0;

        Animation.CreateAndStartAnimation('anim', this.camera, 'target.x', 15, 10, this.camera.target.x, positionX, 0);
        Animation.CreateAndStartAnimation('anim', this.camera, 'target.y', 15, 10, this.camera.target.y, positionY, 0);
        Animation.CreateAndStartAnimation('anim', this.camera, 'target.z', 15, 10, this.camera.target.z, positionZ, 0);
        Animation.CreateAndStartAnimation('anim', this.camera, 'targetScreenOffset.x', 15, 10, this.camera.targetScreenOffset.x, 0, 0);

        const isSmallPhoneLandscapeScreen = window.orientation === 90 && window.innerHeight <= 600 && window.innerWidth <= 992;
        const cameraTargetScreenOffsetY = this.blindType === 'interior' && this.camera.radius < 2 ? (this.camera.radius - 0.5) / -7 : -0.15;
        Animation.CreateAndStartAnimation(
            'anim',
            this.camera,
            'targetScreenOffset.y',
            15,
            10,
            this.camera.targetScreenOffset.y,
            isSmallPhoneLandscapeScreen ? cameraTargetScreenOffsetY : 0,
            0,
        );
        const zoomIn = Animation.CreateAndStartAnimation('anim', this.camera, 'radius', 15, 10, this.camera.radius, this.lowerRadius, 0);
        Animation.CreateAndStartAnimation('anim', this.camera, 'alpha', 15, 10, this.camera.alpha, alpha, 0);
        Animation.CreateAndStartAnimation('anim', this.camera, 'beta', 15, 10, this.camera.beta, Math.PI / 2, 0);

        zoomIn.onAnimationEnd = () => {
            this.camera.checkCollisions = true;
        };

        this.shareDataService.setCursorPointer({
            cursor: this.canvas.style.cursor,
            clicked: this.clicked,
            zoomIn: true,
            imageVisualisation: this.isImageVisualisation,
        });
    }

    zoomInHandler(): void {
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        const isGround = pickResult?.pickedMesh?.name !== 'ground';
        const rotate = this.currentBehaviour === 'rotate';

        this.pickResult = pickResult;

        if (rotate && pickResult.hit && isGround && !this.isZoomedIn && !this.zooming) {
            this.zoomCounter += 1;
            this.isZoomedIn = true;
            this.isZoomedOut = false;
            this.zooming = true;

            Animation.CreateAndStartAnimation('anim', this.camera, 'target.x', 15, 10, this.camera.target.x, pickResult.pickedPoint.x * 0.7, 0);
            Animation.CreateAndStartAnimation('anim', this.camera, 'target.y', 15, 10, this.camera.target.y, pickResult.pickedPoint.y * 0.7, 0);
            Animation.CreateAndStartAnimation('anim', this.camera, 'target.z', 15, 10, this.camera.target.z, pickResult.pickedPoint.z * 0.7, 0);
            Animation.CreateAndStartAnimation(
                'anim',
                this.camera,
                'targetScreenOffset.x',
                15,
                10,
                this.camera.targetScreenOffset.x,
                window.innerWidth > this.breakpoints['tablet-landscape'] ? this.zoomCameraOffsets[this.zoomCounter] : this.mobileCameraOffset,
                0,
            );
            Animation.CreateAndStartAnimation('anim', this.camera, 'targetScreenOffset.y', 15, 10, this.camera.targetScreenOffset.y, 0, 0);
            const zoomInEnd = Animation.CreateAndStartAnimation(
                'anim',
                this.camera,
                'radius',
                15,
                10,
                this.camera.radius,
                this.zoomRadius[this.zoomCounter],
                0,
            );

            zoomInEnd.onAnimationEnd = () => {
                this.isZoomedIn = this.zoomCounter >= this.zoomRadius.length - 1;
                this.zooming = false;
            };

            this.isModelMoved = true;
            this.shareDataService.setCursorPointer({
                cursor: this.canvas.style.cursor,
                clicked: this.clicked,
                zoomIn: true,
                imageVisualisation: this.isImageVisualisation,
            });
        }
    }

    zoomOutHandler(framePerSecond: number): void {
        if (!this.isZoomedOut && !this.zooming && this.scene.meshes.length) {
            this.zoomCounter = this.zoomCounter && this.zoomCounter - 1;
            this.isZoomedIn = false;
            this.isZoomedOut = true;
            this.zoomOutAnimationStatus = true;
            this.zooming = true;

            Animation.CreateAndStartAnimation('anim', this.camera, 'target.x', framePerSecond, 40, this.camera.target.x, 0, 0);
            Animation.CreateAndStartAnimation('anim', this.camera, 'target.y', framePerSecond, 40, this.camera.target.y, 0, 0);
            Animation.CreateAndStartAnimation('anim', this.camera, 'target.z', framePerSecond, 40, this.camera.target.z, 0, 0);
            Animation.CreateAndStartAnimation(
                'anim',
                this.camera,
                'targetScreenOffset.x',
                framePerSecond,
                40,
                this.camera.targetScreenOffset.x,
                window.innerWidth > this.breakpoints['tablet-landscape'] ? this.zoomCameraOffsets[this.zoomCounter] : this.mobileCameraOffset,
                0,
            );
            Animation.CreateAndStartAnimation(
                'anim',
                this.camera,
                'targetScreenOffset.y',
                framePerSecond,
                10,
                this.camera.targetScreenOffset.y,
                0,
                0,
            );
            const zoomOutEnd = Animation.CreateAndStartAnimation(
                'anim',
                this.camera,
                'radius',
                framePerSecond,
                40,
                this.camera.radius,
                this.zoomRadius[this.zoomCounter],
                0,
            );

            zoomOutEnd.onAnimationEnd = () => {
                this.isZoomedOut = false;
                this.animationResponse = null;
                this.animationType = '';
                this.zooming = false;

                if (this.camera.radius < this.upperRadius) {
                    this.zoomOutHandler(framePerSecond || 30);
                    return;
                }

                this.isHintsVisible();
                this.zoomOutAnimationStatus = false;
            };

            this.shareDataService.setCursorPointer({
                cursor: this.canvas.style.cursor,
                clicked: this.clicked,
                zoomOut: true,
                imageVisualisation: this.isImageVisualisation,
            });
        }
    }

    zoomHandler(event): void {
        if (this.isImageVisualisation) {
            return;
        }

        event.stopImmediatePropagation();

        if (this.currentBehaviour === 'rotate' && event.deltaY < 0) {
            this.zoomInHandler();
        }

        if (event.deltaY > 0) {
            this.zoomOutHandler(30);
        }
    }

    public animate(): void {
        if (this.animationAdded) {
            return;
        }

        this.ngZone.runOutsideAngular(() => {
            this.animationAdded = true;
            const rendererLoopCallback = () => {
                this.scene.render();
            };

            this.engine.runRenderLoop(rendererLoopCallback);

            window.addEventListener('resize', () => {
                this.engine.resize();
                this.setCameraOffset();
                this.setFontSize();
                this.updatePositionForHints();

                const hintStatus = this.rect && this.target && this.label && this.line;

                if (window.navigator.userAgent.match('CriOS')) {
                    setTimeout(this.setGizmoControlScale.bind(this), 100);
                    setTimeout(this.setIVCameraRadius.bind(this), 100);
                    setTimeout(this.setDYBCameraRadius.bind(this, hintStatus), 100);
                } else {
                    this.setGizmoControlScale();
                    this.setIVCameraRadius();
                    this.setDYBCameraRadius(hintStatus);
                }

                setTimeout(this.updateVideoTextureSize.bind(this), 400);
            });
        });
    }

    hintsComponentHandler(text: string, mesh: string): void {
        this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this.scene);
        this.advancedTexture.idealWidth = window.innerWidth;

        this.rect = new GUI.Rectangle();
        this.label = new GUI.TextBlock();
        this.target = new GUI.Ellipse();
        this.line = new GUI.Line();

        text = text.replace(/&#13;&#10;/g, '\n');

        this.drawLabelHintsHandler(text);
        this.drawRectangleHintsHandler(mesh);
        this.drawTargetHintsHandler(mesh);
        this.drawLineHintsHandler(mesh);
    }

    drawRectangleHintsHandler(mesh): void {
        this.rect.widthInPixels = this.label.widthInPixels;
        this.rect.heightInPixels = this.label.heightInPixels;
        this.rect.cornerRadius = 5;
        this.rect.color = '#bdbdbd';
        this.rect.thickness = 1;
        this.rect.background = '#ffffff';

        this.advancedTexture.addControl(this.rect);

        this.rect.linkWithMesh(this.scene.getMeshByName(this.blindId + mesh));
        this.rect.linkOffsetY = -100;
        this.rect.linkOffsetX = window.innerWidth > this.breakpoints['tablet-landscape'] ? -200 : -50;
    }

    drawLabelHintsHandler(text): void {
        this.label.textWrapping = true;
        this.label.resizeToFit = true;
        this.label.text = text;
        this.label.color = '#212529';
        this.label.fontFamily = 'Roboto';
        this.label.fontSize = `${this.fontSize}px`;

        this.rect.addControl(this.label);

        const textElem = document.createElement('div');
        textElem.innerText = text;
        textElem.style.display = 'inline-block';
        textElem.style.maxWidth = window.innerWidth <= this.breakpoints.phone ? '50%' : '30%';
        textElem.style.font = `${this.fontSize}px Roboto`;
        textElem.style.textAlign = 'center';
        document.body.appendChild(textElem);

        const padding = 10;

        this.label.widthInPixels = textElem.offsetWidth + 50;
        this.label.heightInPixels = textElem.offsetHeight + 20;
        this.label.paddingRightInPixels = padding;
        this.label.paddingLeftInPixels = padding;

        document.body.removeChild(textElem);
    }

    drawTargetHintsHandler(mesh): void {
        this.target.width = '15px';
        this.target.height = '15px';
        this.target.color = '#bdbdbd';
        this.target.thickness = 1;
        this.target.background = '#ffffff';

        this.advancedTexture.addControl(this.target);

        this.target.linkWithMesh(this.scene.getMeshByName(this.blindId + mesh));
    }

    drawLineHintsHandler(mesh): void {
        this.line.lineWidth = 1;
        this.line.color = '#bdbdbd';
        this.line.y2 = 20;
        this.scene.getMeshByName(this.blindId + mesh).computeWorldMatrix(true);
        this.line.x2 = this.scene.getMeshByName(this.blindId + mesh).absolutePosition.x;
        this.line.linkOffsetY = -5;
        this.line.linkOffsetX = -5;
        this.line.zIndex = -1;

        this.advancedTexture.addControl(this.line);

        this.line.linkWithMesh(this.scene.getMeshByName(this.blindId + mesh));
        this.line.connectedControl = this.rect;
    }

    getParentSize(parent): any {
        const sizes = parent.getHierarchyBoundingVectors();
        return {
            depth: sizes.max.x - sizes.min.x + 0.09,
            height: sizes.max.y - sizes.min.y - 0.1,
            width: sizes.max.z - sizes.min.z - 0.5,
        };
    }

    boxMaskHandler(): void {
        this.box = MeshBuilder.CreateBox('box', this.getParentSize(this.scene.meshes[0]));
        const boxMat = new StandardMaterial('boxMat', this.scene);

        this.box.material = boxMat;
        boxMat.alpha = 1;
        this.box.position.y = 0.015;
        this.box.rotation.y = -1;
        // this.boxStatus(false);
    }

    setDefaultView(): void {
        const getBlindType = this.getBlindTypeFromStorage() || 'outdoor';
        const sessionStorageDefaultData = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_config) || {};
        const defaultModelSize = this.sessionStorageService.getSession(STORAGE_NAMES.default_model_size);
        const colorPalette = getBlindType === 'outdoor' ? COLOR_FRAME_PELMET : INTERIOR_COLOR_FRAME_PELMET;
        const sessionDefaultDataType = sessionStorageDefaultData[getBlindType];

        if (sessionDefaultDataType?.material) {
            const getDefaultMaterial = _.filter(sessionDefaultDataType.material, {
                is_default: true,
            })[0];
            const material = [...MATERIAL_MESH, ...SPLINE_MESH];

            for (const meshId of material) {
                this.setColor(meshId, getDefaultMaterial.color.default, 1, getDefaultMaterial.type, getBlindType);
            }

            if (getBlindType === 'interior') {
                const color = MATERIAL_COLORS.find((item) => item.name === 'Monument').color;
                this.setColor('WEATHER STRIP', color, 1, getDefaultMaterial.type, getBlindType);
            } else if (getBlindType === 'outdoor') {
                const color = MATERIAL_COLORS.find((item) => item.name === 'Monument').color;
                this.setColor('STANDARD_WHEATER_STRIP', color, 1, 'frame', getBlindType);
                this.setColor('LARGE_WEATHER_STRIP', color, 1, 'frame', getBlindType);
            }
        }

        if (sessionDefaultDataType?.frame && sessionDefaultDataType.frame.frame_color) {
            const getDefaultFrame = _.filter(sessionDefaultDataType.frame.frame_color, { is_default: true })[0];

            for (const meshId of colorPalette) {
                this.setColor(meshId, getDefaultFrame.color, 1, 'frame', getBlindType);
            }
        }

        if (sessionDefaultDataType?.fixtures_color && sessionDefaultDataType?.material && getBlindType === 'interior') {
            const getDefaultFixturesColor = _.filter(sessionDefaultDataType.fixtures_color, { is_default: true })[0];
            const getDefaultSizes = _.filter(sessionDefaultDataType.material, {
                is_default: true,
            })[0].sizes;
            const width = getDefaultSizes['width'].default;
            const height = getDefaultSizes['height'].default;

            const topStyleId = INTERIOR_FRAME_TOP_STYLE.reduce((acc, x) => (!acc && width > x.width && height > x.height ? x.id : acc), '');
            const topStyle = sessionDefaultDataType.frame.top_style.filter((el) => el.id === topStyleId)[0];
            const meshArray = topStyle.id === INTERIOR_FRAME_TOP_STYLE[2].id ? INTERIOR_COLOR_FIXTURES : INTERIOR_COLOR_FIXTURES.slice(0, -2);

            for (const meshId of meshArray) {
                this.setColor(meshId, getDefaultFixturesColor.color, 1, 'frame', getBlindType);
            }
        }

        if (getBlindType === 'outdoor') {
            const meshArray = [...REVERSE_HANDLE, ...BLACK_PLASTIC_MESH];

            for (const meshId of meshArray) {
                const color = MATERIAL_COLORS.find((item) => item.name === 'Ebony').color;
                this.setColor(meshId, color, 1, 'frame', getBlindType);
            }

            for (const meshId of ALUMINIUM_MESH) {
                const color = MATERIAL_COLORS.find((item) => item.name === 'Mist').color;
                this.setColor(meshId, color, 1, 'frame', getBlindType);
            }

            for (const meshId of Object.keys(MESHES_IDS)) {
                this.scene.getMeshByName(this.blindId + MESHES_IDS[meshId])?.setEnabled(true);
            }

            for (const meshName of GLOBAL_HIDDEN_PELMET) {
                this.scene.getMeshByName(this.blindId + meshName)?.setEnabled(false);
            }
        }

        const shutterValue = this.isImageVisualisation ? this.shutter.IVDefaultValue : this.shutter.value;
        this.getTopSceneHandler(shutterValue);
        this.setDefaultCursor();

        const subscription = this.getSize().subscribe((res) => {
            if (Object.hasOwn(res, 'height')) {
                subscription.unsubscribe();
                this.shareDataService.setModelLoaded(!!sessionDefaultDataType?.material);
            }
        });

        if (defaultModelSize && defaultModelSize[getBlindType].width && defaultModelSize[getBlindType].height) {
            this.setSize({ width: defaultModelSize[getBlindType].width });
            this.setSize({ height: defaultModelSize[getBlindType].height });
        }
    }

    setModelDefaultPosition(): void {
        this.setDefaultCameraPosition();
        this.isHintsVisible();
        this.setDYBCameraRadius(true);
        this.setCameraOffset();
    }

    boxStatus(status): void {
        if (this.box?.setEnabled(status)) {
            setTimeout(() => {
                this.box.setEnabled(status);
            }, 500);
        }
    }

    outdoorWidthSizeHandler(widthDiff: number): void {
        const id = this.selectedGizmoId || this.blindId;

        this.scene.getMeshByName(id + MESHES_IDS[1]).scaling.x = this.meshScaling[1].x + 1.84 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[2]).scaling.x = this.meshScaling[2].x + 1.84 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[3]).scaling.x = this.meshScaling[2].x + 1.935 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[11]).scaling.x = this.meshScaling[11].x + 1.725 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[22]).scaling.x = this.meshScaling[22].x + 1.84 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[35]).scaling.x = (this.meshScaling[35].x + 1.84 * widthDiff) * 1.25;
        this.scene.getMeshByName(id + MESHES_IDS[53]).scaling.x = (this.meshScaling[53].x + 1.84 * widthDiff) * 1.25;
        this.scene.getMeshByName(id + MESHES_IDS[65]).scaling.x = this.meshScaling[65].x + 1.84 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[74]).scaling.x = this.meshScaling[74].x + 1.725 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[107]).scaling.x = this.meshScaling[107].x + 1.898 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[112]).scaling.x = this.meshScaling[112].x + 1.725 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[123]).scaling.x = this.meshScaling[123].x + 1.84 * widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[136]).scaling.x = this.meshScaling[136].x + 1.84 * widthDiff;

        this.scene.getMeshByName(id + MESHES_IDS[4]).position.x = this.meshPosition[4].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[8]).position.x = this.meshPosition[8].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[13]).position.x = this.meshPosition[13].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[15]).position.x = this.meshPosition[15].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[18]).position.x = this.meshPosition[18].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[20]).position.x = this.meshPosition[20].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[35]).position.x = this.meshPosition[35].x - widthDiff / 2;
        this.scene.getMeshByName(id + MESHES_IDS[53]).position.x = this.meshPosition[53].x + widthDiff / 2;
        this.scene.getMeshByName(id + MESHES_IDS[38]).position.x = this.meshPosition[38].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[39]).position.x = this.meshPosition[38].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[40]).position.x = this.meshPosition[38].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[44]).position.x = this.meshPosition[44].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[45]).position.x = this.meshPosition[44].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[46]).position.x = this.meshPosition[44].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[55]).position.x = this.meshPosition[55].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[58]).position.x = this.meshPosition[58].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[71]).position.x = this.meshPosition[71].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[76]).position.x = this.meshPosition[76].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[78]).position.x = this.meshPosition[78].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[82]).position.x = this.meshPosition[82].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[85]).position.x = this.meshPosition[85].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[110]).position.x = this.meshPosition[110].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[114]).position.x = this.meshPosition[114].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[117]).position.x = this.meshPosition[117].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[130]).position.x = this.meshPosition[130].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[138]).position.x = this.meshPosition[138].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[143]).position.x = this.meshPosition[143].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[144]).position.x = this.meshPosition[144].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[145]).position.x = this.meshPosition[145].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[146]).position.x = this.meshPosition[146].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[147]).position.x = this.meshPosition[147].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[148]).position.x = this.meshPosition[148].x + widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[149]).position.x = this.meshPosition[147].x - widthDiff;
        this.scene.getMeshByName(id + MESHES_IDS[150]).position.x = this.meshPosition[148].x + widthDiff;
    }

    outdoorHeightSizeHandler(heightDiff: number): void {
        const id = this.selectedGizmoId || this.blindId;

        this.scene.getMeshByName(id + MESHES_IDS[2]).scaling.y = this.meshScaling[2].y + 4 * heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[8]).scaling.y = this.meshScaling[8].y + 3.55 * heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[20]).scaling.y = this.meshScaling[20].y + 3.55 * heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[71]).scaling.y = this.meshScaling[71].y + 3.54 * heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[117]).scaling.y = this.meshScaling[117].y + 3.54 * heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[143]).scaling.y = this.meshScaling[143].y + 4.1 * heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[144]).scaling.y = this.meshScaling[144].y + 4.1 * heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[147]).scaling.y = this.meshScaling[147].y + 3.55 * heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[148]).scaling.y = this.meshScaling[148].y + 3.55 * heightDiff;

        this.scene.getMeshByName(id + MESHES_IDS[1]).position.y = this.meshPosition[1].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[3]).position.y = this.meshPosition[3].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[4]).position.y = this.meshPosition[4].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[11]).position.y = this.meshPosition[11].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[13]).position.y = this.meshPosition[13].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[15]).position.y = this.meshPosition[15].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[18]).position.y = this.meshPosition[18].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[22]).position.y = this.meshPosition[22].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[35]).position.y = this.meshPosition[35].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[38]).position.y = this.meshPosition[38].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[39]).position.y = this.meshPosition[38].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[40]).position.y = this.meshPosition[38].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[44]).position.y = this.meshPosition[44].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[45]).position.y = this.meshPosition[44].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[46]).position.y = this.meshPosition[44].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[47]).position.y = this.meshPosition[47].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[53]).position.y = this.meshPosition[53].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[55]).position.y = this.meshPosition[55].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[58]).position.y = this.meshPosition[58].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[65]).position.y = this.meshPosition[65].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[74]).position.y = this.meshPosition[74].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[76]).position.y = this.meshPosition[76].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[78]).position.y = this.meshPosition[78].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[82]).position.y = this.meshPosition[82].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[85]).position.y = this.meshPosition[85].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[107]).position.y = this.meshPosition[107].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[110]).position.y = this.meshPosition[110].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[112]).position.y = this.meshPosition[112].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[114]).position.y = this.meshPosition[114].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[123]).position.y = this.meshPosition[123].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[130]).position.y = this.meshPosition[130].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[136]).position.y = this.meshPosition[136].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[138]).position.y = this.meshPosition[138].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[142]).position.y = this.meshPosition[142].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[145]).position.y = this.meshPosition[145].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[146]).position.y = this.meshPosition[146].y + heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[149]).position.y = this.meshPosition[149].y - heightDiff;
        this.scene.getMeshByName(id + MESHES_IDS[150]).position.y = this.meshPosition[150].y - heightDiff;

        const meshPositions = {
            3: this.meshPosition[3].y - heightDiff,
            22: this.meshPosition[22].y - heightDiff,
            35: this.meshPosition[35].y - heightDiff,
            38: this.meshPosition[38].y - heightDiff,
            39: this.meshPosition[39].y - heightDiff,
            40: this.meshPosition[40].y - heightDiff,
            44: this.meshPosition[44].y - heightDiff,
            45: this.meshPosition[45].y - heightDiff,
            46: this.meshPosition[46].y - heightDiff,
            47: this.meshPosition[47].y - heightDiff,
            53: this.meshPosition[53].y - heightDiff,
            65: this.meshPosition[65].y - heightDiff,
            107: this.meshPosition[107].y - heightDiff,
            123: this.meshPosition[123].y - heightDiff,
            142: this.meshPosition[142].y - heightDiff,
        };

        this.shutter.outdoor.meshPositions = { ...meshPositions };
        this.shutter.materialScale = this.meshScaling[2].y + 3.786 * heightDiff - this.shutter.outdoor.minScale;
        this.shutter.meshScale = this.meshScaling[143].y + 3.9 * heightDiff - this.shutter.outdoor.minMeshScale;
        this.shutter.materialPosition = this.meshPosition[1].y + heightDiff - this.shutter.outdoor.maxPosition;
        this.shutter.outdoor.bottomChannelPosition = this.meshPosition[1].y + heightDiff;
        this.getTopSceneHandler(this.shutter.modelsValue[id]);
    }

    interiorWidthSizeHandler(widthDiff: number): void {
        const id = this.selectedGizmoId || this.blindId;
        const scaleMeshCof = {
            113: 1.055,
            152: 1.03,
            154: 1.05,
            134: 1.05,
            135: 1.0449,
            137: 0.991,
            159: 1.05,
        };

        for (const [key, value] of Object.entries(INTERIOR_WIDTH_MESH)) {
            const cof = scaleMeshCof[+key] || 0.99;
            this.scene.getMeshByName(id + value).scaling.x = this.meshScaling[key].x + cof * (+key === 154 ? widthDiff + 0.04 : widthDiff);
        }

        for (const [key, value] of Object.entries(INTERIOR_WIDTH_POSITION_MESH)) {
            const cof = value.includes('END') ? 0.4902 : 0.49;
            if (value.includes('1')) {
                this.scene.getMeshByName(id + value).position.x = this.meshPosition[key].x - cof * widthDiff;
            }
            if (value.includes('2') || value.includes('BOTTOM CHANNEL FACE FIX 3')) {
                this.scene.getMeshByName(id + value).position.x = this.meshPosition[key].x + cof * widthDiff;
            }
        }
    }

    interiorHeightSizeHandler(heightDiff: number): void {
        const id = this.selectedGizmoId || this.blindId;
        this.shutter.interior.meshPositions = {};
        this.shutter.interior.heightDiff = heightDiff;

        for (const [key, value] of Object.entries(INTERIOR_HEIGHT_MESH)) {
            if (value.includes('MATERIAL')) {
                this.shutter.materialScale = this.meshScaling[key].y + 2.065 * heightDiff;
            }
            if (value.includes('TRACK') || value.includes('REVEAL') || value.includes('FACE')) {
                this.scene.getMeshByName(id + value).scaling.y = this.meshScaling[key].y + 1.95 * heightDiff;
            }
        }

        for (const [key, value] of Object.entries(INTERIOR_HEIGHT_POSITION_MESH)) {
            if (value.includes('MATERIAL')) {
                this.shutter.materialPosition = this.meshPosition[key].y + 0.49 * heightDiff;
            }
            if (value.includes('BOTTOM BAR') || value.includes('STRIP')) {
                this.shutter.interior.meshPositions[key] = this.meshPosition[key].y - 0.49 * heightDiff + 0.012;
            }
            if (value.includes('PELMET') || value.includes('END') || value.includes('MATERIAL')) {
                this.scene.getMeshByName(id + value).position.y = this.meshPosition[key].y + 0.49 * heightDiff;
            }
            if (value.includes('BOTTOM') || value.includes('STRIP') || value.includes('FACE')) {
                this.scene.getMeshByName(id + value).position.y = this.meshPosition[key].y - 0.49 * heightDiff;
            }
            if (value.includes('BOTTOM CHANNEL')) {
                this.scene.getMeshByName(id + value).position.y = this.meshPosition[key].y - 0.49 * heightDiff + 0.012;
            }
        }

        this.getTopSceneHandler(this.shutter.modelsValue[id]);
    }

    sceneWidthSize(res): void {
        if (this.preventScalingModel) {
            return;
        }
        const getBlindType = res.blind_type || this.blindType;
        const initialWidth = INITIAL_MODEL_SIZES_IN_METERS[getBlindType].width;

        if (this.defaultSize[getBlindType].width === 0) {
            this.defaultSize[getBlindType].width = initialWidth;
            this.sessionStorageService.setModelSize(this.defaultSize, STORAGE_NAMES.default_model_size);
        }

        const widthDiff = res.width - this.defaultSize[getBlindType].width;

        if (getBlindType === 'outdoor') {
            this.outdoorWidthSizeHandler(widthDiff / 2);
        }

        if (getBlindType === 'interior') {
            this.interiorWidthSizeHandler(widthDiff);
        }

        this.defaultStyles[getBlindType].sizeWidth = true;
    }

    sceneHeightSize(res): void {
        if (this.preventScalingModel) {
            return;
        }
        const initialHeight = INITIAL_MODEL_SIZES_IN_METERS[this.blindType].height;

        if (this.defaultSize[this.blindType].height === 0) {
            this.defaultSize[this.blindType].height = initialHeight;
            this.sessionStorageService.setModelSize(this.defaultSize, STORAGE_NAMES.default_model_size);
        }

        const heightDiff = res.height - this.defaultSize[this.blindType].height;

        if (this.ground) {
            const offsetY = -(Math.abs(this.groundPositionY) + heightDiff);
            this.ground.position.y = Math.abs(offsetY) > Math.abs(this.groundPositionY) ? offsetY : this.groundPositionY;
        }

        if (this.blindType === 'outdoor') {
            this.outdoorHeightSizeHandler(heightDiff / 2);
        }

        if (this.blindType === 'interior') {
            this.interiorHeightSizeHandler(heightDiff);
        }

        this.defaultStyles[this.blindType].sizeHeight = true;
    }

    setDefaultModelSizes(defaultModelSizes): void {
        this.defaultModelSize = defaultModelSizes;
    }

    setMaterialTextureSize(): void {
        const id = this.selectedGizmoId || this.blindId;
        const meshes = Object.entries(MATERIAL_TEXTURE_SCALE[this.blindType]);

        meshes.forEach((data) => {
            const [meshName] = data;
            const mesh = this.scene.getMeshByName(id + meshName);
            const material = mesh.material as PBRMaterial;
            this.calcMaterialTextureSize(mesh, material, id);
        });
    }

    calcMaterialTextureSize(mesh: AbstractMesh, material: PBRMaterial, blindId: string): void {
        if (!mesh || !material.albedoTexture) {
            return;
        }

        let uScale = MATERIAL_TEXTURE_SCALE[this.blindType][mesh.name.replace(blindId, '')]?.u;
        let vScale = MATERIAL_TEXTURE_SCALE[this.blindType][mesh.name.replace(blindId, '')]?.v;

        if (this.blindType === 'outdoor') {
            const xScaleDiff = mesh.scaling.x - INITIAL_MODEL_SIZES_IN_METERS[this.blindType].width;
            const yScaleDiff = mesh.scaling.y - INITIAL_MODEL_SIZES_IN_METERS[this.blindType].height;
            uScale = uScale + uScale * xScaleDiff;
            vScale = vScale + vScale * yScaleDiff;
        }

        if (uScale && vScale) {
            // @ts-ignore
            material.albedoTexture.uScale = uScale;
            // @ts-ignore
            material.albedoTexture.vScale = vScale;
        }
    }

    setBackgroundImage(backgroundImage, status?: boolean): void {
        if (!this.canvas) {
            return;
        }

        this.sampleImage = backgroundImage;
        this.boundingBoxesSettingsStatus = false;
        this.canvas.classList.toggle('background-no-cover', !!backgroundImage?.type);

        if (backgroundImage) {
            const blinds = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_data);
            const storage = backgroundImage.type
                ? STORAGE_NAMES.zip_image_visualisation_background
                : STORAGE_NAMES.zip_uploaded_image_visualisation_background;
            const backgroundConfig = { ...backgroundImage };
            delete backgroundConfig.image;
            delete backgroundConfig.base64;
            delete backgroundConfig.blob;

            this.saveModelAndBoundingBoxSettings();
            this.getModelAndBoundingBoxSettings(backgroundImage.settings);
            this.setShutterDefaultValue(this.shutter.IVDefaultValue);
            this.shutter.modelsValue = backgroundImage.shutterValues || this.shutter.modelsValue;
            this.sampleProjectBlinds = backgroundImage.sampleProjectBlinds || {};
            this.newCreatedBlinds = blinds
                .filter(
                    (blind: BlindData) =>
                        !Object.hasOwn(this.boundingBoxesSettings, blind.blind_id) && !Object.hasOwn(this.sampleProjectBlinds, blind.blind_id),
                )
                .map((blind: BlindData) => blind.blind_id);

            if (backgroundImage.type) {
                const isPhoneLandscape =
                    backgroundImage.image_orientation === 'landscape' && window.innerHeight <= 600 && window.innerWidth > window.innerHeight;
                this.sceneOrientation = backgroundImage.image_orientation === 'portrait' || isPhoneLandscape ? 'portrait' : 'landscape';
            }

            this.shareDataService.setViewType(VIEW_TYPES.image_visualisation);
            this.sessionStorageService.setBlindData(backgroundConfig, storage);
            this.sessionStorageService.setBlindData(backgroundConfig, STORAGE_NAMES.zip_image_visualisation_background);
            this.indexedDBService.saveImage(backgroundImage, STORAGE_NAMES.zip_image_visualisation_background);
        }

        this.canvas.style.backgroundImage = backgroundImage ? `url(${backgroundImage.src})` : '';
        this.changeViewType(!!backgroundImage, status);

        if (backgroundImage && this.videoTexture) {
            this.closeVideoStream();
        }
    }

    changeViewType(isImageVisualisation: boolean, status?: boolean): void {
        this.isImageVisualisation = isImageVisualisation;
        this.preventScalingModel = !isImageVisualisation ? false : this.preventScalingModel;

        if (isImageVisualisation) {
            this.getTopSceneHandler(this.getShutterValue());

            this.setIVCameraSettings();
            this.setGizmoControl(true);
            this.setIVSampleProject();
            this.createModelsFromStorage();
            this.setSettingsWhenSceneReady();

            this.ground.setEnabled(false);
        } else {
            this.selectedGizmoId = '';
            this.boundingBoxesSettings = {};
            this.scene.onPointerObservable.remove(this.zoomIVModelObserver);
            this.setShutterDefaultValue();

            if (status) {
                const sessionBlindType = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_type);
                const currentBlindId = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_current_blind_id);
                const lastOpenBlindId = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_last_opened_blind_id);

                this.createScene(sessionBlindType || 'outdoor', currentBlindId || lastOpenBlindId || '', true);
            }
        }

        if (window.innerWidth < this.breakpoints['desktop']) {
            setTimeout(() => {
                this.engine.resize();
            }, 0);
        }

        this.shareDataService.setCursorPointer({
            cursor: this.canvas.style.cursor,
            clicked: this.clicked,
            imageVisualisation: this.isImageVisualisation,
        });
    }

    createCamera(): void {
        this.camera = new ArcRotateCamera('camera', this.cameraRotation, Math.PI / 2, this.upperRadius, Vector3.Zero(), this.scene);
    }

    setDYBCameraSettings() {
        this.zoomCounter = 0;
        this.isZoomedOut = true;
        this.isZoomedIn = false;

        this.camera.attachControl(this.scene);
        this.camera.minZ = 0.1;
        this.rootMeshRotationQuaternion = this.scene.meshes[0]?.rotationQuaternion?.clone() || this.rootMeshRotationQuaternion;
        this.scene.meshes[0].rotationQuaternion = null;
        this.camera.panningInertia = 0;
        this.camera.panningSensibility = 600;
        this.camera.panningDistanceLimit = 0.8;
        this.camera._useCtrlForPanning = false;
        this.camera.panningAxis = new Vector3(1, 1, 0);
        (this.camera.inputs.attached.pointers as ArcRotateCameraPointersInput).buttons = [0, -1, -1];
        this.camera.inputs.remove(this.camera.inputs.attached.mousewheel);
        this.camera.angularSensibilityX = 2000;
        this.camera.angularSensibilityY = 2000;
        this.setCameraOffset();

        this.camera.checkCollisions = true;
        this.camera.collisionRadius = new Vector3(0.25, 0.1, 0.15);
        this.camera.onCollide = () => {
            this.camera.detachControl();
            this.onIntersection();
            this.camera.attachControl(this.scene);
        };

        this.cameraPosition = this.camera.position.clone();
        this.setDYBCameraRadius();
    }

    setIVCameraSettings() {
        const ivCameraLowerRadiusLimit = this.getIVCameraLowerRadiusLimit();
        const blindCenter = MeshBuilder.CreatePlane('blindCenter', { width: 0.1, height: 0.1 }, this.scene);
        blindCenter.parent = this.scene.meshes[0];
        blindCenter.visibility = 0;

        this.isZoomedIVCamera = false;
        this.isZoomedIn = true;
        this.isZoomedOut = true;
        this.isHintsVisible();

        this.camera.target.x = 0;
        this.camera.target.y = 0;
        this.camera.target.z = 0;
        this.camera.targetScreenOffset.x = this.mobileCameraOffset;

        this.cameraPosition = this.camera.position.clone();
        this.camera.alpha = Math.PI;
        this.camera.beta = Math.PI / 2;
        this.camera.upperRadiusLimit = 15;
        this.camera.lowerRadiusLimit = ivCameraLowerRadiusLimit;
        this.camera.useFramingBehavior = true;
        this.camera.checkCollisions = false;
        this.setIVCameraRadius();

        if (!this.camera.inputs.attached['mousewheel']) {
            this.camera.inputs.add(new ArcRotateCameraMouseWheelInput());
        }

        this.camera.wheelPrecision = 100;
        this.camera.panningSensibility = 0;

        this.scene.registerBeforeRender(() => {
            if (this.camera.radius !== this.startIVCameraRadius && !this.isZoomedIVCamera) {
                this.shareDataService.setIVResetStatus(true);
                this.isZoomedIVCamera = true;
            }
            this.camera.alpha = Math.PI;
            this.camera.beta = Math.PI / 2;

            this.camera.lowerRadiusLimit = !this.camera.isInFrustum(blindCenter) ? this.camera.radius : ivCameraLowerRadiusLimit;
        });

        this.lightGeneralSetupHandler(true);
    }

    setGizmoControl(status: boolean): void {
        if (status) {
            this.setGizmoModelMeshScaling(false);
        }
        this.resetGizmoControl();

        if (status) {
            const currentRootMesh = this.getCurrentRootMesh();
            currentRootMesh.rotation = new Vector3(0, this.isImageVisualisation ? Math.PI / 2 : 0, 0);
            this.boundingBox = BoundingBoxGizmo.MakeNotPickableAndWrapInBoundingBox(currentRootMesh as Mesh);

            this.utilityLayer = new UtilityLayerRenderer(this.scene);
            this.gizmo = new BoundingBoxGizmo(Color3.FromHexString('#0984e3'), this.utilityLayer);
            this.gizmo.ignoreChildren = true;
            this.gizmo.fixedDragMeshScreenSize = true;
            this.gizmo.attachedMesh = this.boundingBox;

            // @ts-ignore
            this.gizmo._scaleDragSpeed = this.isImageVisualisation ? 1 : 1.5;

            this.setGizmoControlHandler();
            this.setGizmoControlScale();
            this.setGizmoControlHover();
            this.setGizmoControlColors();
            this.setGizmoScaleControlVisibleDYB();
            this.setGizmoControlPosition();

            if (this.isImageVisualisation && this.boundingBoxesSettings[this.selectedGizmoId || this.blindId] && !this.resetSelectedBlind) {
                const id = this.selectedGizmoId || this.blindId;
                this.setBoundingBoxById(id, this.getRootMeshById(id));
            }

            this.setGizmoMinMaxMeshScaling();
            this.getGizmoMeshScaling();
            this.setGizmoModelMeshScaling(true);
            this.setModelAndBoundingBoxSettings();

            // @ts-ignore
            this.scene._renderingManager.setRenderingAutoClearDepthStencil(RenderingManager.MAX_RENDERINGGROUPS - 1, true, true, true);
            this.setModelRenderingSettings(currentRootMesh, RenderingManager.MAX_RENDERINGGROUPS - 1, false);
        } else {
            this.boundingBox = null;
            this.gizmo = null;
            this.utilityLayer = null;
            this.scene.onPointerObservable.remove(this.zoomIVModelObserver);
            this.scene.onKeyboardObservable.remove(this.keyboardIVObserver);
            this.scene.onBeforeRenderObservable.remove(this.gizmoControlPositionObserver);
        }
    }

    getIVCurrentSampleProject() {
        const type = this.sampleImage?.type;
        const index = this.sampleImage?.index;

        if (!type && !index) {
            return [];
        }

        const isPhoneLandscape = this.sceneOrientation === 'landscape' && screen.height <= 600 && window.innerWidth > window.innerHeight;
        const orientation = this.sceneOrientation === 'portrait' || isPhoneLandscape ? '_portrait' : '';
        const device = this.mobileAndTabletCheck() ? 'mobile' + orientation : 'desktop';
        // const getBlindType = this.getBlindTypeFromStorage() || 'outdoor';
        return this.samplesProjectProperties[device][`${type}Project`][index];
    }

    getIVCameraLowerRadiusLimit(): number {
        const defaultCameraLowerRadiusLimit = 2;
        const sampleProjectProperties = this.getIVCurrentSampleProject();

        if (!sampleProjectProperties.length) {
            return defaultCameraLowerRadiusLimit;
        } else {
            const cameraRadiuses = sampleProjectProperties.map((boundingBoxSettings: BoundingBoxSettings) => boundingBoxSettings.cameraRadius);
            return Math.min(...cameraRadiuses);
        }
    }

    setIVSampleProject(): void {
        const filteredBlindCheck = (id: number) =>
            status && (Object.hasOwn(this.sampleProjectBlinds, id) || this.newCreatedBlinds.includes(id));
        const sampleProjectProperties = this.getIVCurrentSampleProject();
        const status = this.boundingBoxesSettingsStatus;

        if (!sampleProjectProperties.length) {
            return;
        }

        if (!status) {
            this.sampleProjectBlinds = {};
            this.boundingBoxesSettings = {};
            this.setShutterDefaultValue(this.shutter.IVDefaultValue);
        }

        const blinds = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_data);
        const filteredBlinds = blinds
            .filter((blind: BlindData) => blind.type === this.sampleImage.type && (status ? filteredBlindCheck(blind.blind_id) : true))
            .slice(0, sampleProjectProperties.length);

        filteredBlinds.forEach((blind: BlindData, index) => {
            if (Object.hasOwn(this.sampleProjectBlinds, blind.blind_id)) {
                return;
            }

            const boundingBoxSettings = sampleProjectProperties[index];
            this.boundingBoxesSettings[blind.blind_id] = {
                position: boundingBoxSettings.position.clone(),
                scaling: boundingBoxSettings.scaling.clone(),
                rotationQuaternion: Quaternion.FromEulerVector(boundingBoxSettings.rotation.clone()),
                cameraRadius: boundingBoxSettings.cameraRadius,
                isEnabled: true,
            };

            this.sampleProjectBlinds[blind.blind_id] = index;
        });

        const blindIndex = filteredBlinds.map((blind) => blind.blind_id).indexOf(+this.blindId);
        const blindIsCorrect = blindIndex >= 0 && blindIndex < sampleProjectProperties.length && this.blindType === this.sampleImage.type;
        if (!status && sampleProjectProperties && blindIsCorrect) {
            this.boundingBox.position = sampleProjectProperties[blindIndex].position.clone();
            this.boundingBoxPosition = sampleProjectProperties[blindIndex].position.clone();
            this.boundingBox.rotationQuaternion = Quaternion.FromEulerVector(sampleProjectProperties[blindIndex].rotation);

            this.boundingBox.scaling.x = sampleProjectProperties[blindIndex].scaling.x;
            this.boundingBox.absoluteScaling.x = sampleProjectProperties[blindIndex].scaling.x;

            this.boundingBox.scaling.y = sampleProjectProperties[blindIndex].scaling.y;
            this.boundingBox.absoluteScaling.y = sampleProjectProperties[blindIndex].scaling.y;

            this.setGizmoModelMeshScaling(true);
            this.setShutterControlValue({
                id: this.selectedGizmoId,
                value: this.shutter.IVDefaultValue,
            });
        }

        const savedSettingsStatus = status && this.newCreatedBlinds.includes(+this.blindId);
        if (savedSettingsStatus) {
            delete this.sampleProjectBlinds[this.blindId];
            this.setIVSampleProjectById();
        }
    }

    setIVSampleProjectById(id = this.selectedGizmoId): void {
        const sampleProjectProperties = this.getIVCurrentSampleProject();

        if (!sampleProjectProperties.length || this.sampleImage.type !== this.blindType || this.isCopyingModel) {
            return;
        }

        const missBlindIndexes = [];
        const sampleProjectBlindIndexes = Object.values(this.sampleProjectBlinds);
        sampleProjectProperties.forEach((value, index) => {
            if (!sampleProjectBlindIndexes.includes(index)) {
                missBlindIndexes.push(index);
            }
        });

        const blindIndex = missBlindIndexes[0];
        if (!sampleProjectProperties[blindIndex] || Object.hasOwn(this.sampleProjectBlinds, id)) {
            return;
        }

        this.sampleProjectBlinds[id] = blindIndex;
        this.boundingBoxesSettings[id] = {
            position: sampleProjectProperties[blindIndex].position.clone(),
            scaling: sampleProjectProperties[blindIndex].scaling.clone(),
            rotationQuaternion: Quaternion.FromEulerVector(sampleProjectProperties[blindIndex].rotation.clone()),
            cameraRadius: sampleProjectProperties[blindIndex].cameraRadius,
            isEnabled: true,
        };

        this.boundingBox.scaling = sampleProjectProperties[blindIndex].scaling.clone();
        this.boundingBox.position = sampleProjectProperties[blindIndex].position.clone();
        this.boundingBox.rotationQuaternion = Quaternion.FromEulerVector(sampleProjectProperties[blindIndex].rotation);
        this.camera.radius = sampleProjectProperties[blindIndex].cameraRadius;
        this.setGizmoModelMeshScaling(true);
    }

    setSettingsWhenSceneReady(): void {
        this.scene.executeWhenReady(() => {
            this.boundingBox.checkCollisions = true;
            this.camera.checkCollisions = true;
            this.camera.collisionRadius = new Vector3(0.25, 0.1, 0.4);
            this.camera.onCollide = () => {
                this.camera.checkCollisions = false;

                const zoomInEnd = Animation.CreateAndStartAnimation(
                    'anim',
                    this.camera,
                    'radius',
                    15,
                    10,
                    this.camera.radius,
                    this.camera.radius + 0.3,
                    0,
                );

                zoomInEnd.onAnimationEnd = () => {
                    this.camera.checkCollisions = true;
                };
            };
        });
    }

    resetGizmoControl(): void {
        this.resetLineByPoints(true);

        const mesh = this.scene.getMeshesByID('box')[0];
        const childMesh = mesh?.getChildMeshes()[0];
        const currentRootMesh = this.getCurrentRootMesh();

        mesh?.removeChild(childMesh);
        this.scene.removeMesh(mesh);
        currentRootMesh.setParent(null);

        if (this.gizmo) {
            this.gizmo.attachedMesh = null;
            this.gizmo.dispose();
            this.utilityLayer.dispose();
            this.boundingBox.dispose();

            this.boundingBoxRotation = null;
            this.boundingBoxScale = null;
            this.boundingBoxAbsoluteScale = null;
            this.boundingBoxPosition = null;

            this.rootMeshScale = null;
            this.rootMeshAbsoluteScale = null;
            this.rootStartMeshScale = null;
            this.rootMeshPosition = null;
        }

        mesh?.dispose();
        currentRootMesh.position = Vector3.Zero();
        currentRootMesh.rotation = new Vector3(0, 0, 0);
        currentRootMesh.scaling = new Vector3(1, 1, -1);
        this.shareDataService.setIVResetStatus(false);

        this.zoomGizmoSettings = { fingers: 2, pickOnMesh: false };
        this.scene.onPointerObservable.remove(this.zoomIVModelObserver);
    }

    setGizmoControlHandler(): void {
        const toggleToolBarPointerEvents = (status: boolean) => {
            const toolBar = document.querySelector(SELECTORS.tool_bar);
            toolBar.classList.toggle('prevent-pointer-events', status);
        };

        this.gizmoService.updateScaleBoxDragBehavior.apply(this.gizmo, [this.isImageVisualisation, this.gizmoService]);
        this.gizmo.onScaleBoxDragObservable.add(() => {
            toggleToolBarPointerEvents(true);

            this.setMinMaxGizmoMeshScaling();

            if (this.isImageVisualisation) {
                this.setGizmoModelMeshScaling(true);
                this.shareDataService.setIVResetStatus(true);
                this.shareDataService.setGizmoControlAction(true);
            } else {
                this.setGizmoModelMeshScalingOnDrag();
            }
        });

        this.gizmo.onScaleBoxDragEndObservable.add(() => {
            toggleToolBarPointerEvents(false);

            this.gizmo.attachedMesh = this.boundingBox;
            this.gizmoDragStatus = false;
            this.gizmoTooltipPlane.isVisible = false;

            if (!this.isImageVisualisation) {
                setTimeout(() => {
                    this.setGizmoModelMeshScalingOnDrag();
                    this.gizmoLastHoveredControlId = null;
                });
            }
        });

        this.gizmoService.updateRotateSpheres.apply(this.gizmo);
        this.gizmo.onRotationSphereDragObservable.add(() => {
            toggleToolBarPointerEvents(true);
        });
        this.gizmo.onRotationSphereDragEndObservable.add(() => {
            toggleToolBarPointerEvents(false);
            this.gizmoDragStatus = false;
            this.gizmoTooltipPlane.isVisible = false;
            this.boundingBoxRotation = this.boundingBox.rotationQuaternion.toEulerAngles();
            this.shareDataService.setIVResetStatus(true);
        });

        this.setGizmoZoomModelBehavior();

        this.gizmo.onDragStartObservable.add(() => {
            this.gizmoDragStatus = true;
            const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            this.scenePointerDownListener(null, pickResult);
        });
        this.gizmoDragModelBehavior = new PointerDragBehavior({
            dragPlaneNormal: new Vector3(0, 0, 0),
        });
        this.gizmoDragModelBehavior.onDragEndObservable.add(() => {
            this.shareDataService.setIVResetStatus(true);
        });

        if (this.mobileAndTabletCheck() && this.isImageVisualisation) {
            this.zoomGizmoSettings = { fingers: 2, pickOnMesh: false };
            this.zoomIVModelObserver = this.scene.onPointerObservable.add((pointerInfo) => this.zoomIVModelHandler(pointerInfo));
            this.camera.pinchDeltaPercentage = 0.003;
        } else if (this.isImageVisualisation) {
            this.boundingBox.addBehavior(this.gizmoDragModelBehavior);
        }
    }

    setGizmoZoomModelBehavior(status = true): void {
        if (!status || !this.isImageVisualisation) {
            this.scene?.onBeforeCameraRenderObservable.remove(this.gizmoZoomModelBehavior);
            return;
        }

        this.scene.onBeforeCameraRenderObservable.remove(this.gizmoZoomModelBehavior);
        this.gizmoZoomModelBehavior = this.scene.onBeforeCameraRenderObservable.add(() => {
            if (!this.isImageVisualisation) {
                return;
            }

            this.getRootMeshes().forEach((rootMesh: Mesh) => {
                const rootMeshId = Number.parseInt(rootMesh.name, 10);

                if (+this.selectedGizmoId !== rootMeshId && this.boundingBoxesSettings[rootMeshId]) {
                    const distance = this.boundingBoxesSettings[rootMeshId].cameraRadius - this.camera.radius;
                    rootMesh.position.x = this.boundingBoxesSettings[rootMeshId].position.x + distance;
                }
            });
        });
    }

    setGizmoControlScale(): void {
        if (!this.gizmo) {
            return;
        }

        this.gizmo.scaleBoxSize = !this.isMobile ? 0.12 : 0.18;
        this.gizmo.rotationSphereSize = !this.isMobile ? 0.12 : 0.18;

        this.gizmo.fixedDragMeshScreenSizeDistanceFactor = this.isMobile && window.innerWidth > window.innerHeight ? 7 : 10;
    }

    setGizmoControlHover(): void {
        const resetGizmoUI = () => {
            this.gizmoUI?.dispose();
            this.gizmoUI = this.isImageVisualisation
                ? GUI.AdvancedDynamicTexture.CreateForMesh(this.gizmoTooltipPlane)
                : GUI.AdvancedDynamicTexture.CreateFullscreenUI('gizmoUI', true, this.utilityLayer.utilityLayerScene);
            this.gizmoUI.addControl(this.gizmoTooltipRectangle);
        };

        this.gizmoScaleTooltip = new GUI.Image('tooltipIcon', 'assets/icons/new/gizmo-scale-icon.svg');
        this.gizmoRotationTooltip = new GUI.Image('tooltipIcon', 'assets/icons/new/gizmo-rotate-icon.svg');

        this.gizmoScaleSizeTooltip = new GUI.TextBlock('blindSize', '1200mm');
        this.gizmoScaleSizeTooltip.color = '#16416C';
        this.gizmoScaleSizeTooltip.top = 2;

        this.gizmoTooltipPlane = Mesh.CreatePlane('plane', 1, this.utilityLayer.utilityLayerScene);
        this.gizmoTooltipPlane.isVisible = false;
        this.gizmoTooltipPlane.isPickable = false;
        this.gizmoTooltipPlane.updateFacetData();
        this.gizmoTooltipPlane.renderingGroupId = 1;

        this.gizmoTooltipRectangle = new GUI.Rectangle('rec');
        this.gizmoTooltipRectangle.widthInPixels = 40;
        this.gizmoTooltipRectangle.heightInPixels = 40;
        this.gizmoTooltipRectangle.thickness = 0;

        this.utilityLayer.utilityLayerScene.onBeforeRenderObservable.add(() => {
            const size = Vector3.Distance(this.camera.globalPosition, this.gizmoTooltipPlane.absolutePosition);
            this.gizmoTooltipPlane.scaling.set(size, size, size);
        });

        this.gizmo.gizmoLayer.utilityLayerScene.onPointerObservable.add((pointerInfo) => {
            if (this.gizmoDragStatus) {
                if (!this.gizmoHoveredControl) {
                    this.gizmoHoveredControl = pointerInfo.pickInfo.pickedMesh;
                    resetGizmoUI();
                }

                if (this.gizmoHoveredControl && !this.gizmoScaleBoxClone) {
                    const index = this.gizmoHoveredControl.id.split('_').slice(-1);
                    // @ts-ignore
                    this.gizmoScaleBoxClone = this.gizmo._scaleBoxesParent.getChildMeshes()[index].clone('scale_box_clone');
                    this.gizmoScaleBoxClone.position = Vector3.Zero();
                    this.gizmoScaleBoxClone.isPickable = false;
                    this.gizmoScaleBoxClone.isVisible = false;
                }
                this.setGizmoControlDrag();
                return;
            }

            if (this.gizmoHoveredControl && (!pointerInfo.pickInfo.pickedMesh || this.gizmoHoveredControl !== pointerInfo.pickInfo.pickedMesh)) {
                this.setGizmoControlColors();
            }

            this.gizmoHoveredControl = pointerInfo.pickInfo.pickedMesh || null;

            if (this.isMobile && pointerInfo.type === PointerEventTypes.POINTERUP) {
                this.setGizmoControlColors();
                this.gizmoHoveredControl = null;
            }

            if (this.gizmoHoveredControl) {
                const meshId = this.gizmoHoveredControl.id;

                resetGizmoUI();
                this.setGizmoTooltip(meshId);
            } else {
                this.gizmoTooltipPlane.isVisible = false;
                this.gizmoTooltipRectangle.isVisible = this.isImageVisualisation;
                this.gizmoScaleBoxClone?.dispose();
                this.gizmoScaleBoxClone = null;
            }
        });
    }

    setGizmoControlDrag() {
        this.boundingBoxRotation = this.boundingBox.rotationQuaternion.toEulerAngles();
        const meshId = this.gizmoHoveredControl.id;
        this.gizmoLastHoveredControlId = meshId;

        this.setGizmoTooltip(meshId);
    }

    setGizmoTooltip(meshId) {
        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
        const roundModelRotation = (rotationY) => (rotationY > 1 || rotationY < -1 ? 1.57 : rotationY);
        const getAngleBetweenPoint = (point1, point2) => {
            const dz = point1.z - point2.z;
            const dx = point1.x - point2.x;
            return Math.atan2(dx, dz);
        };

        const controlPoint = {
            z: this.gizmoHoveredControl.absolutePosition.z,
            x: this.gizmoHoveredControl.absolutePosition.x,
        };
        const cameraPoint = {
            z: this.camera.position.z,
            x: this.camera.position.x,
        };
        const cameraAndControlAngle = getAngleBetweenPoint(cameraPoint, controlPoint) + Math.PI / 2;

        const modelRotationY =
            this.boundingBoxRotation.y > Math.PI / 2 && this.boundingBoxRotation.y > 0
                ? this.boundingBoxRotation.y - Math.PI
                : this.boundingBoxRotation.y < -Math.PI / 2 && this.boundingBoxRotation.y < 0
                    ? this.boundingBoxRotation.y + Math.PI
                    : this.boundingBoxRotation.y;

        const rotation = cameraAndControlAngle - roundModelRotation(modelRotationY);
        const tooltipRotation = rotation + Math.PI / 2;

        const idNumber = meshId.split('_').slice(-1);
        if (meshId.includes('scale') && !this.isImageVisualisation) {
            this.gizmo.hoverMaterial.emissiveColor = Color3.White();
            // @ts-ignore
            this.gizmoTooltipPlane.parent = this.gizmo._scaleBoxesParent;

            this.gizmoTooltipPlane.isVisible = false;

            this.gizmoTooltipRectangle.isVisible = true;
            this.gizmoTooltipRectangle.background = 'white';
            this.gizmoTooltipRectangle.shadowBlur = 0.1;
            this.gizmoTooltipRectangle.cornerRadius = 8;
            this.gizmoTooltipRectangle.fontSize = !this.isMobile ? 13 : 17;
            this.gizmoTooltipRectangle.widthInPixels = !this.isMobile ? 62 : 81;
            this.gizmoTooltipRectangle.heightInPixels = !this.isMobile ? 20 : 26;
            this.gizmoTooltipRectangle.linkOffsetY = !this.isMobile ? 20 : 26;

            if (!this.gizmoDragStatus) {
                this.getGizmoModelMeshScaling();
            }

            this.gizmoTooltipRectangle.linkWithMesh(this.gizmoHoveredControl);
            this.gizmoTooltipRectangle.removeControl(this.gizmoScaleSizeTooltip);
            this.getGizmoModelMeshScaling();
            this.gizmoTooltipRectangle.addControl(this.gizmoScaleSizeTooltip);
        } else if (meshId.includes('scale')) {
            this.gizmo.hoverMaterial.emissiveColor = Color3.White();
            // @ts-ignore
            this.gizmoTooltipPlane.parent = this.gizmo._scaleBoxesParent;

            const tooltipRotations = [
                new Vector3(0, clamp(-Math.sign(rotation) * tooltipRotation, -0.75, 0.75), -Math.PI / 4),
                Vector3.Zero(),
                new Vector3(-this.boundingBoxRotation.x, clamp(-Math.sign(rotation) * tooltipRotation, -0.25, 0.25), Math.PI / 2),
                new Vector3(0, clamp(-Math.sign(rotation) * tooltipRotation, -0.75, 0.75), Math.PI / 4),
                Vector3.Zero(),
                new Vector3(0, this.degreeToRadian(90) - this.boundingBoxRotation.y, 0),
                new Vector3(this.boundingBoxRotation.z, Math.PI / 2, Math.PI / 4),
                new Vector3(this.boundingBoxRotation.z, Math.PI / 2, Math.PI / 4),
                new Vector3(0, this.degreeToRadian(90) - this.boundingBoxRotation.y, 0),
                new Vector3(0, clamp(-Math.sign(rotation) * tooltipRotation, -0.75, 0.75), Math.PI / 4),
                Vector3.Zero(),
                new Vector3(-this.boundingBoxRotation.x, clamp(-Math.sign(rotation) * tooltipRotation, -0.25, 0.25), Math.PI / 2),
                new Vector3(0, clamp(-Math.sign(rotation) * tooltipRotation, -0.75, 0.75), -Math.PI / 4),
                Vector3.Zero(),
            ];

            this.gizmoTooltipPlane.position = this.gizmoHoveredControl.position;
            this.gizmoTooltipPlane.rotation = tooltipRotations[idNumber];
            this.gizmoTooltipPlane.isVisible = true;

            this.gizmoTooltipRectangle.paddingRight = 0;
            this.gizmoTooltipRectangle.paddingBottom = 0;
            this.gizmoTooltipRectangle.widthInPixels = !this.isMobile ? 40 : 50;
            this.gizmoTooltipRectangle.heightInPixels = !this.isMobile ? 40 : 50;
            this.gizmoTooltipRectangle.removeControl(this.gizmoScaleTooltip);
            this.gizmoTooltipRectangle.addControl(this.gizmoScaleTooltip);

            this.gizmoHoveredControl.outlineColor = new Color4(0.65, 0.82, 0.98, 1);
        } else if (meshId.includes('rotate')) {
            this.gizmo.hoverMaterial.emissiveColor = new Color3(0.3352941176470588, 0.8176470588235294, 1.1901960784313725);
            // @ts-ignore
            this.gizmoTooltipPlane.parent = this.gizmo._rotateAnchorsParent;

            const tooltipRotations = [
                new Vector3(0, this.degreeToRadian(90) - this.boundingBoxRotation.y, Math.PI / 4),
                new Vector3(0, Math.PI / 2, Math.PI / 2),
                new Vector3(0, this.degreeToRadian(90) - this.boundingBoxRotation.y, Math.PI / 4),
                new Vector3(0, Math.PI / 2, 0),
                new Vector3(0, this.degreeToRadian(90) - this.boundingBoxRotation.y, (3 * Math.PI) / 4),
                new Vector3(0, (3 * Math.PI) / 4, (3 * Math.PI) / 4),
                new Vector3(0, this.degreeToRadian(90) - this.boundingBoxRotation.y, (3 * Math.PI) / 4),
                new Vector3(0, (-3 * Math.PI) / 4, (3 * Math.PI) / 4),
                new Vector3(0, clamp(-Math.sign(rotation) * tooltipRotation, -0.75, 0.75), Math.PI / 2),
                new Vector3(0, clamp(-Math.sign(rotation) * tooltipRotation, -0.75, 0.75), 0),
                new Vector3(0, clamp(-Math.sign(rotation) * tooltipRotation, -0.75, 0.75), -Math.PI),
                new Vector3(0, clamp(-Math.sign(rotation) * tooltipRotation, -0.75, 0.75), -Math.PI / 2),
            ];

            this.gizmoTooltipPlane.position = this.gizmoHoveredControl.position;
            this.gizmoTooltipPlane.rotation = tooltipRotations[idNumber];
            this.gizmoTooltipPlane.isVisible = true;

            // @ts-ignore
            this.gizmoTooltipRectangle.paddingRight = 25;
            this.gizmoTooltipRectangle.paddingBottom = 25;
            this.gizmoTooltipRectangle.widthInPixels = !this.isMobile ? 65 : 75;
            this.gizmoTooltipRectangle.heightInPixels = !this.isMobile ? 65 : 75;
            this.gizmoTooltipRectangle.removeControl(this.gizmoRotationTooltip);
            this.gizmoTooltipRectangle.addControl(this.gizmoRotationTooltip);
        }

        if (this.gizmoDragStatus) {
            const isScaling = this.gizmoHoveredControl.id.includes('scale');
            if (!this.isImageVisualisation || !isScaling) {
                this.gizmoHoveredControl.material.emissiveColor = new Color3(0.03529411764705882, 0.5176470588235295, 0.8901960784313725);
                this.gizmoHoveredControl.outlineColor = new Color3(0.03529411764705882, 0.5176470588235295, 0.8901960784313725);
            } else {
                // @ts-ignore
                this.gizmoScaleBoxClone.material.emissiveColor = new Color3(0.03529411764705882, 0.5176470588235295, 0.8901960784313725);
                this.gizmoScaleBoxClone.outlineColor = new Color3(0.03529411764705882, 0.5176470588235295, 0.8901960784313725);
                this.gizmoScaleBoxClone.isVisible = true;
                this.gizmoHoveredControl.isVisible = false;
            }
        }
    }

    degreeToRadian(deg) {
        return (deg * Math.PI) / 180;
    }

    setGizmoControlPosition(): void {
        const getPositionOffset = (position, name, scaleBoxesPosition) => {
            const cornerOffset = name === 'corner' && this.isMobile ? 0.15 : 0;
            return {
                y: position.y > 0 ? -scaleBoxesPosition.top + cornerOffset : position.y < 0 ? scaleBoxesPosition.bottom - cornerOffset : 0,
                x: position.x > 0 ? -scaleBoxesPosition.left + cornerOffset : position.x < 0 ? scaleBoxesPosition.right - cornerOffset : 0,
            };
        };

        const getBlindType = this.getBlindTypeFromStorage() || 'outdoor';
        const defaultScaleBoxesPosition = {
            top: getBlindType === 'outdoor' ? 0.15 : 0.15,
            left: getBlindType === 'outdoor' ? 0.15 : 0.16,
            bottom: getBlindType === 'outdoor' ? 0.15 : 0.17,
            right: getBlindType === 'outdoor' ? 0.15 : 0.16,
        };

        this.gizmoControlPositionObserver = this.scene.onBeforeRenderObservable.add(() => {
            const scaleBoxesPosition = { ...defaultScaleBoxesPosition };
            if (this.isMobile && this.isImageVisualisation) {
                const mobileOffset = getBlindType === 'outdoor' ? 0.07 : 0.05;
                Object.keys(scaleBoxesPosition).forEach((key) => (scaleBoxesPosition[key] += mobileOffset + this.camera.radius * 0.011));
            }

            // @ts-ignore
            const scaleBoxes = this.gizmo._scaleBoxesParent.getChildMeshes();
            scaleBoxes.forEach((mesh) => {
                mesh.position.z = 0;

                if ((!this.isImageVisualisation || !this.gizmoDragStatus) && mesh.name !== 'plane') {
                    const { y, x } = getPositionOffset(mesh.position, mesh.name, scaleBoxesPosition);
                    mesh.position.y += y;
                    mesh.position.x += x;
                }
            });

            if (this.gizmoDragStatus && this.isImageVisualisation && this.gizmoHoveredControl?.id.includes('scale')) {
                const { y, x } = getPositionOffset(this.gizmoHoveredControl.position, this.gizmoHoveredControl.name, scaleBoxesPosition);
                this.gizmoTooltipPlane.position = this.gizmoHoveredControl.position.subtractFromFloats(-x, -y, 0);
                this.gizmoScaleBoxClone.position = this.gizmoTooltipPlane.position;
                this.gizmoScaleBoxClone.scaling = this.gizmoHoveredControl.scaling;
            }

            // @ts-ignore
            const rotateSpheres = this.gizmo._rotateAnchorsParent.getChildMeshes();
            rotateSpheres.forEach((mesh) => {
                mesh.position.z = 0;
            });

            [...this.boundingBoxPointSpheres, this.movePointSphere].forEach((sphere) => {
                if (sphere) {
                    const size = Vector3.Distance(this.camera.globalPosition, sphere.absolutePosition);
                    sphere.scaling.set(size * 0.35, size * 0.35, size * 0.35);
                }
            });
        });
    }

    setGizmoControlColors(): void {
        // @ts-ignore
        const lines = this.gizmo._lineBoundingBox.getChildMeshes();
        lines.forEach((mesh: Mesh) => {
            mesh.position.z = 0;
        });

        lines[2].setEnabled(false);
        lines[4].setEnabled(false);
        lines[6].setEnabled(false);
        lines[7].setEnabled(false);
        lines[8].setEnabled(false);
        lines[9].setEnabled(false);
        lines[10].setEnabled(false);
        lines[11].setEnabled(false);

        lines[0].setEnabled(this.isImageVisualisation);
        lines[1].setEnabled(this.isImageVisualisation);
        lines[3].setEnabled(this.isImageVisualisation);
        lines[5].setEnabled(this.isImageVisualisation);

        // @ts-ignore
        const scaleBoxes = this.gizmo._scaleBoxesParent.getChildMeshes();
        const planeMaterial = scaleBoxes[1].material.clone('planeMaterial') as StandardMaterial;

        planeMaterial.emissiveColor = new Color3(0.03529411764705882, 0.5176470588235295, 0.8901960784313725);

        scaleBoxes.forEach((mesh: Mesh, index) => {
            if (mesh.name !== 'plane') {
                const material = mesh.material as StandardMaterial;
                mesh.position.z = 0;
                mesh.renderOutline = true;
                mesh.outlineWidth = 0.15;
                mesh.outlineColor = new Color3(0.03529411764705882, 0.5176470588235295, 0.8901960784313725);
                material.emissiveColor = new Color3(1, 1, 1);
                mesh.id = 'scale_box_' + index;
            } else {
                mesh.material = planeMaterial;
            }
        });

        scaleBoxes[1].setEnabled(false);
        scaleBoxes[4].setEnabled(false);
        scaleBoxes[6].setEnabled(false);
        scaleBoxes[7].setEnabled(false);
        scaleBoxes[10].setEnabled(false);
        scaleBoxes[13].setEnabled(false);

        scaleBoxes[0].setEnabled(this.isImageVisualisation);
        scaleBoxes[3].setEnabled(this.isImageVisualisation);
        scaleBoxes[9].setEnabled(this.isImageVisualisation);
        scaleBoxes[12].setEnabled(this.isImageVisualisation);

        // @ts-ignore
        const rotateSpheres = this.gizmo._rotateAnchorsParent.getChildMeshes();
        const rotateSphereMaterial = scaleBoxes[1].material.clone('rotateSphereMaterial') as StandardMaterial;

        rotateSphereMaterial.emissiveColor = new Color3(0.03529411764705882, 0.5176470588235295, 0.8901960784313725);

        rotateSpheres.forEach((mesh, index) => {
            if (mesh.name !== 'plane') {
                mesh.position.z = 0;
                mesh.renderOutline = true;
                mesh.outlineWidth = 0.15;
                mesh.outlineColor = new Color3(1, 1, 1);
                mesh.material = rotateSphereMaterial;
                mesh.id = 'rotate_sphere_' + index;
            } else {
                mesh.material = planeMaterial;
            }
        });

        rotateSpheres[1].setEnabled(false);
        rotateSpheres[3].setEnabled(false);
        rotateSpheres[5].setEnabled(false);
        rotateSpheres[7].setEnabled(false);

        rotateSpheres[0].setEnabled(this.isImageVisualisation);
        rotateSpheres[2].setEnabled(this.isImageVisualisation);
        rotateSpheres[4].setEnabled(this.isImageVisualisation);
        rotateSpheres[6].setEnabled(this.isImageVisualisation);
        rotateSpheres[8].setEnabled(this.isImageVisualisation);
        rotateSpheres[9].setEnabled(this.isImageVisualisation);
        rotateSpheres[10].setEnabled(this.isImageVisualisation);
        rotateSpheres[11].setEnabled(this.isImageVisualisation);
    }

    setGizmoScaleControlVisibleDYB(): void {
        if (this.boundingBox && !this.isImageVisualisation) {
            // @ts-ignore
            const scaleBoxes = this.gizmo._scaleBoxesParent.getChildMeshes();
            const blinds = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_data);
            const status = this.getCurrentRootMesh()?.isEnabled() && this.blindId && blinds.length;
            scaleBoxes[2].setEnabled(status);
            scaleBoxes[5].setEnabled(status);
            scaleBoxes[8].setEnabled(status);
            scaleBoxes[11].setEnabled(status);
        }
    }

    setGizmoControlVisible(status): void {
        if (this.isImageVisualisation) {
            // @ts-ignore
            const lines = this.gizmo._lineBoundingBox.getChildMeshes();
            lines[0].setEnabled(status);
            lines[1].setEnabled(status);
            lines[3].setEnabled(status);
            lines[5].setEnabled(status);

            // @ts-ignore
            const scaleBoxes = this.gizmo._scaleBoxesParent.getChildMeshes();
            scaleBoxes[0].setEnabled(status);
            scaleBoxes[2].setEnabled(status);
            scaleBoxes[3].setEnabled(status);
            scaleBoxes[5].setEnabled(status);
            scaleBoxes[8].setEnabled(status);
            scaleBoxes[9].setEnabled(status);
            scaleBoxes[11].setEnabled(status);
            scaleBoxes[12].setEnabled(status);

            // @ts-ignore
            const rotateSpheres = this.gizmo._rotateAnchorsParent.getChildMeshes();
            rotateSpheres[0].setEnabled(status);
            rotateSpheres[2].setEnabled(status);
            rotateSpheres[4].setEnabled(status);
            rotateSpheres[6].setEnabled(status);
            rotateSpheres[8].setEnabled(status);
            rotateSpheres[9].setEnabled(status);
            rotateSpheres[10].setEnabled(status);
            rotateSpheres[11].setEnabled(status);
        }
    }

    getGizmoMeshScaling(resetSatus = false): void {
        if (this.boundingBoxRotation && !resetSatus) {
            return;
        }
        const eps = 0.00001;

        this.boundingBoxRotationQuaternion = this.boundingBox.rotationQuaternion.clone();
        this.boundingBoxRotation = this.boundingBox.rotationQuaternion.toEulerAngles();
        this.boundingBoxPosition = this.boundingBox.position.clone();
        this.rootMeshAbsoluteScale = this.getCurrentRootMesh().absoluteScaling.clone();
        this.rootMeshPosition = this.getCurrentRootMesh().position.clone();

        if (this.blindType === 'outdoor') {
            this.boundingBoxScale = new Vector3(1.44, 1, 0.29);
            this.boundingBoxAbsoluteScale = new Vector3(1.44, 1, 0.29);
            this.rootMeshScale = new Vector3(0.9, -0.73, -3.5);
        } else {
            this.boundingBoxScale = new Vector3(1.31, 0.9, 0.3);
            this.boundingBoxAbsoluteScale = new Vector3(1.31, 0.9, 0.3);
            this.rootMeshScale = new Vector3(0.97, -0.97, -3.29);
        }

        if (this.isMobile && this.isImageVisualisation) {
            const multiplyVector = new Vector3(1.15, 1.15, 1);
            this.boundingBoxScale = this.boundingBoxScale.multiply(multiplyVector);
            this.boundingBoxAbsoluteScale = this.boundingBoxAbsoluteScale.multiply(multiplyVector);
        }

        if (this.boundingBox?.scaling.y < this.gizmoMinMaxMeshScaling.min.y) {
            this.boundingBox.scaling.y = this.gizmoMinMaxMeshScaling.min.y + eps;
            this.boundingBox.absoluteScaling.y = this.gizmoMinMaxMeshScaling.min.y + eps;
        }

        if (this.boundingBox?.scaling.x < this.gizmoMinMaxMeshScaling.min.x) {
            this.boundingBox.scaling.x = this.gizmoMinMaxMeshScaling.min.x + eps;
            this.boundingBox.absoluteScaling.x = this.gizmoMinMaxMeshScaling.min.x + eps;
        }

        if (!this.isImageVisualisation) {
            this.boundingBox.position = Vector3.Zero();
        }

        this.rootStartMeshScale = this.boundingBoxAbsoluteScale.divide(this.rootMeshScale).multiply(new Vector3(1, -1, -1));
    }

    setGizmoMinMaxMeshScaling(serverSizeData = null) {
        this.serverSizeData = serverSizeData || this.serverSizeData;
        const maxMeshScaling = { y: 5, x: 8.9 };
        const minMeshScaling = {
            y: this.blindType === 'outdoor' ? 1.3 : 0.8,
            x: this.blindType === 'outdoor' ? 0.95 : 0.8,
        };

        if (this.isMobile && this.isImageVisualisation) {
            minMeshScaling.x = minMeshScaling.x * 1.15;
        }

        if (this.serverSizeData && !this.isImageVisualisation) {
            const eps = 0.00001;
            maxMeshScaling.y = this.serverSizeData['height'].maximum / 1000 + 0.3 + eps;
            maxMeshScaling.x = this.serverSizeData['width'].maximum / 1000 + 0.3 + eps;
            minMeshScaling.y = this.serverSizeData['height'].minumum / 1000 + 0.3 - eps;
            minMeshScaling.x = this.serverSizeData['width'].minumum / 1000 + 0.3 - eps;
        }

        this.gizmoMinMaxMeshScaling = {
            min: minMeshScaling,
            max: maxMeshScaling,
        };
    }

    setGizmoBoundingBoxScaling(res): void {
        const resStatus = !res.isBoundingBox && !Object.hasOwn(res, 'extra_size');
        const sceneStatus = !this.isImageVisualisation && this.boundingBox && !this.gizmoHoveredControl;
        if (resStatus && sceneStatus) {
            const scalingWay = Object.keys(res)[0];
            this.boundingBox.scaling[scalingWay === 'width' ? 'x' : 'y'] = res[scalingWay] + 0.3;

            if (this.rootMeshAbsoluteScale) {
                const rootMesh = this.getCurrentRootMesh();
                rootMesh.scaling = this.rootMeshAbsoluteScale.divide(this.boundingBox.scaling);
                this.setGizmoModelMeshPosition(rootMesh);
                this.setMinMaxGizmoMeshScaling(false);
            }
        }
    }

    setMinMaxGizmoMeshScaling(detach = true): void {
        const eps = 0.000001;

        if (this.boundingBox.scaling.y >= this.gizmoMinMaxMeshScaling.max.y) {
            this.boundingBox.scaling.y = this.gizmoMinMaxMeshScaling.max.y - eps;
            this.gizmo.attachedMesh = detach ? null : this.gizmo.attachedMesh;
        }
        if (this.boundingBox.scaling.y <= this.gizmoMinMaxMeshScaling.min.y) {
            this.boundingBox.scaling.y = this.gizmoMinMaxMeshScaling.min.y + eps;
            this.gizmo.attachedMesh = detach ? null : this.gizmo.attachedMesh;
        }

        if (this.boundingBox.scaling.x >= this.gizmoMinMaxMeshScaling.max.x) {
            this.boundingBox.scaling.x = this.gizmoMinMaxMeshScaling.max.x - eps;
            this.gizmo.attachedMesh = detach ? null : this.gizmo.attachedMesh;
        }
        if (this.boundingBox.scaling.x <= this.gizmoMinMaxMeshScaling.min.x) {
            this.boundingBox.scaling.x = this.gizmoMinMaxMeshScaling.min.x + eps;
            this.gizmo.attachedMesh = detach ? null : this.gizmo.attachedMesh;
        }
    }

    setGizmoModelMeshScaling(status: boolean) {
        let currentMeshScale;

        const selectedGizmoMesh = this.getRootMeshById(this.selectedGizmoId);
        const rootMesh = this.getCurrentRootMesh();
        const currentRootMesh = selectedGizmoMesh || rootMesh;
        this.blindType = currentRootMesh['blind_type'] || this.blindType;

        if (this.rootMeshScale) {
            if (!this.isImageVisualisation) {
                const eps = 0.00001;
                this.boundingBox.scaling.y = this.currentHeight + 0.3 + eps;
                this.boundingBox.scaling.x = this.currentWidth + 0.3 + eps;
            }

            currentMeshScale = this.boundingBox?.scaling.divide(this.rootMeshScale).multiply(new Vector3(1, -1, -1));
        }

        let heightCof;
        let heightDiff;
        let widthCof;
        let widthDiff;

        if (!status) {
            heightCof = this.blindType === 'outdoor' ? 0.5 : 1;
            heightDiff = (this.currentHeight - this.defaultSize[this.blindType].height) * heightCof;

            widthCof = this.blindType === 'outdoor' ? 0.5 : 1;
            widthDiff = (this.currentWidth - this.defaultSize[this.blindType].width) * widthCof;
        } else {
            currentRootMesh.scaling = this.rootMeshAbsoluteScale.divide(this.boundingBox.scaling);

            heightCof = this.blindType === 'outdoor' ? 0.36 : 0.98;
            heightDiff = (currentMeshScale.y - this.rootStartMeshScale.y) * heightCof;

            widthCof = this.blindType === 'outdoor' ? 0.45 : 0.99;
            widthDiff = (currentMeshScale.x - this.rootStartMeshScale.x) * widthCof;
        }

        this.setGizmoModelMeshPosition(currentRootMesh);
        if (this.blindType === 'outdoor') {
            this.outdoorHeightSizeHandler(heightDiff);
            this.outdoorWidthSizeHandler(widthDiff);
        } else {
            this.interiorHeightSizeHandler(heightDiff);
            this.interiorWidthSizeHandler(widthDiff);
        }
    }

    setGizmoModelMeshScalingOnDrag() {
        if (this.isImageVisualisation) {
            return;
        }
        const selectedGizmoMesh = this.getRootMeshById(this.selectedGizmoId);
        const rootMesh = this.getCurrentRootMesh();
        const currentRootMesh = selectedGizmoMesh || rootMesh;
        currentRootMesh.scaling = this.rootMeshAbsoluteScale.divide(this.boundingBox.absoluteScaling);

        this.boundingBox.position = Vector3.Zero();
        this.setGizmoModelMeshPosition(currentRootMesh);

        const [type, value] = this.getGizmoModelMeshScaling();
        this.setBoundingBoxSize({
            blindId: this.blindId,
            dragStatus: this.gizmoDragStatus,
            type,
            value,
        });
    }

    getGizmoModelMeshScaling() {
        const sizeSettings = {
            scale_box_2: { type: 'width', coord: 'x', value: this.currentWidth },
            scale_box_5: { type: 'height', coord: 'y', value: this.currentHeight },
            scale_box_8: { type: 'height', coord: 'y', value: this.currentHeight },
            scale_box_11: { type: 'width', coord: 'x', value: this.currentWidth },
        };
        const currentSettings = sizeSettings[this.gizmoHoveredControl?.id || this.gizmoLastHoveredControlId];
        const currentSize = Math.round((this.boundingBox.scaling.clone()[currentSettings.coord] - 0.3) * 1000);
        this.gizmoScaleSizeTooltip.text = `${!this.gizmoDragStatus ? currentSettings.value * 1000 : currentSize}mm`;
        return [currentSettings.type, currentSize];
    }

    setGizmoModelMeshPosition(rootMesh: AbstractMesh) {
        const position = Vector3.Zero();

        if (this.blindType === 'outdoor' && this.boundingBox) {
            const offsetPosition = this.isImageVisualisation ? -0.018 : -0.025;
            position.y = offsetPosition * (this.gizmoMinMaxMeshScaling.max.y / this.boundingBox.scaling.y);
        }

        rootMesh.position = position;
    }

    setLineByPointsHandlers() {
        if (this.isImageVisualisation && !this.mobileAndTabletCheck()) {
            const plane = Mesh.CreatePlane('plane', 40, this.scene);
            plane.position.x = 0;
            plane.rotation = new Vector3(0, Math.PI / 2, 0);

            const planeMaterial = new StandardMaterial('planeMaterial', this.scene);
            planeMaterial.diffuseColor = new Color3(0, 0, 0);
            planeMaterial.alpha = 0;
            plane.material = planeMaterial;

            this.pointSpheresMaterial = new StandardMaterial('sphere', this.scene);
            this.pointSpheresMaterial.specularColor = new Color3(1, 1, 1);
            this.pointSpheresMaterial.emissiveColor = new Color3(1, 1, 1);
            this.hoverPointSpheresMaterial = this.pointSpheresMaterial.clone('hover-sphere');

            this.movePointSphere = this.createLinePoints('sphere-move');
            this.movePointSphere.isVisible = false;
            this.movePointSphere.renderingGroupId = 1;

            this.scene.onPointerUp = (evt, pickResult) => this.ivScenePointerUpListener(evt, pickResult);

            this.keyboardIVObserver = this.scene.onKeyboardObservable.add((kbInfo: KeyboardInfo) => {
                if (kbInfo.type === KeyboardEventTypes.KEYDOWN && kbInfo.event.code === 'Escape' && this.boundingBoxPoints.length) {
                    this.removeBoundingBoxPoint();
                    this.scene.onPointerMove(null, null, null);
                }
            });
        }
    }

    removeBoundingBoxPoint() {
        this.boundingBoxPoints.splice(-1, 1);
        this.boundingBoxPointSpheres[this.boundingBoxPointSpheres.length - 1].dispose();
        this.boundingBoxPointSpheres.splice(-1, 1);

        if (!this.boundingBoxPointSpheres.length) {
            this.camera.inputs.add(new ArcRotateCameraMouseWheelInput());
            this.camera.wheelPrecision = 100;
        }

        this.createLinesByPoints();
    }

    ivScenePointerUpListener(evt, pickResult) {
        if (this.isImageVisualisation && !this.mobileAndTabletCheck()) {
            this.scene.getMeshByName(this.blindId + 'line')?.dispose();
            this.movePointSphere.isVisible = false;
            pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

            if (pickResult.pickedPoint && this.boundingBoxPoints.length < 5 && pickResult.pickedMesh.id !== 'box') {
                this.shareDataService.setIVResetStatus(true);
                const isLastPoint = pickResult.pickedMesh.id.includes('sphere-0') && this.boundingBoxPoints.length === 4;

                if (pickResult.pickedMesh.id.includes('sphere') && !isLastPoint) {
                    this.removeBoundingBoxPoint();
                    return;
                }

                const lastPoints = [this.boundingBoxPoints[this.boundingBoxPoints.length - 1], pickResult.pickedPoint];
                const isOpportunityToSetPoint = this.boundingBoxPoints.length ? this.isOpportunityToSetPoint(lastPoints, pickResult) : true;
                if ((isOpportunityToSetPoint && this.boundingBoxPoints.length < 4) || isLastPoint) {
                    const point = pickResult.pickedPoint;
                    this.movePointSphere.position = point;
                    this.boundingBoxPoints.push(point);
                    this.createLinesByPoints();

                    if (this.boundingBoxPoints.length !== 5) {
                        const sphere = this.createLinePoints();
                        this.boundingBoxPointSpheres.push(sphere);

                        this.camera.inputs.remove(this.camera.inputs.attached.mousewheel);
                    }

                    if (this.boundingBoxPoints.length === 5) {
                        this.formatLinePoints();

                        this.camera.inputs.add(new ArcRotateCameraMouseWheelInput());
                        this.camera.wheelPrecision = 100;
                    }
                }
                this.movePointSphere.isVisible = true;
            }
        }
    }

    ivScenePointerMoveListener(evt, pickResult) {
        if (this.isImageVisualisation && !this.mobileAndTabletCheck()) {
            this.scene.getMeshByName(this.blindId + 'line')?.dispose();
            this.movePointSphere.isVisible = false;

            pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

            if (pickResult.pickedPoint && this.boundingBoxPoints.length && this.boundingBoxPoints.length !== 5) {
                const point = pickResult.pickedPoint;
                const points = [this.boundingBoxPoints[this.boundingBoxPoints.length - 1], point];

                const isOpportunityToSetPoint = this.isOpportunityToSetPoint(points, pickResult);
                this.createLinesByPoints('line', points, isOpportunityToSetPoint ? '#FFFFFF' : '#BF0000');
                this.changePointSphereColor(this.movePointSphere, Color3.FromHexString(isOpportunityToSetPoint ? '#FFFFFF' : '#BF0000'));

                if (pickResult.pickedMesh.id.includes('sphere') && !pickResult.pickedMesh.id.includes('move')) {
                    this.changePointSphereColor(pickResult.pickedMesh, Color3.FromInts(22, 65, 108));
                    this.movePointSphere.isVisible = false;
                } else {
                    this.boundingBoxPointSpheres.forEach((sphere) => (sphere.material = this.pointSpheresMaterial));
                    this.movePointSphere.isVisible = true;
                }

                this.movePointSphere.position = point;
                this.movePointSphere.position.x = pickResult.pickedMesh.id === 'box' ? this.movePointSphere.position.x : 0;
            }
        }
    }

    isOpportunityToSetPoint(points, pickResult) {
        const checkInRange = (range, degree) => {
            if (range.length === 3) {
                return degree >= range[0] || (degree >= range[1] && degree <= range[2]);
            } else {
                return degree >= range[0] && degree <= range[1];
            }
        };

        const getAngleBetweenPoint = ([point1, point2]: any[]) => {
            const dx = point1.z - point2.z;
            const dy = point1.y - point2.y;
            const degree = Math.atan2(dy, dx) * (180 / Math.PI);

            return degree < 0 ? 360 + degree : degree;
        };

        let ranges = [
            [330, 0, 30],
            [60, 120],
            [150, 210],
            [240, 300],
        ];
        const distanceStatus = ranges.some((range, index) => {
            return index % 2 === 0
                ? Math.abs(points[1].z - points[0].z) >= this.gizmoMinMaxMeshScaling.min.x * 0.9 &&
                        Math.abs(points[1].z - points[0].z) <= this.gizmoMinMaxMeshScaling.max.x * 0.935
                : Math.abs(points[1].y - points[0].y) >= this.gizmoMinMaxMeshScaling.min.y * 0.9 &&
                        Math.abs(points[1].y - points[0].y) <= this.gizmoMinMaxMeshScaling.max.y * 0.935;
        });

        const lastPointsDegree = getAngleBetweenPoint([points[1], this.boundingBoxPoints[0]]);
        const lastRangeStatus = ranges.some((range) => checkInRange(range, lastPointsDegree));

        if (this.boundingBoxPoints.length > 1) {
            for (let i = 1; i < this.boundingBoxPoints.length; i++) {
                const pointsDegree = getAngleBetweenPoint(this.boundingBoxPoints.slice(i - 1));
                ranges = ranges.filter((range) => !checkInRange(range, pointsDegree));
            }

            const lasPointsDegree = getAngleBetweenPoint(this.boundingBoxPoints.slice(-2).reverse());
            ranges = ranges.filter((range) => !checkInRange(range, lasPointsDegree));
        }

        const currPointsDegree = getAngleBetweenPoint(points);
        const rangeStatus = ranges.some((range) => checkInRange(range, currPointsDegree));

        return this.boundingBoxPoints.length === 3
            ? lastRangeStatus && rangeStatus && distanceStatus
            : this.boundingBoxPoints.length < 4
                ? rangeStatus && distanceStatus
                : pickResult.pickedMesh.id.includes('sphere-0');
    }

    createLinesByPoints(name = 'lines', points = this.boundingBoxPoints, color = '#16416C') {
        this.scene.getMeshByName(this.blindId + name)?.dispose();
        const lines = MeshBuilder.CreateLines(name, {
            points,
            updatable: true,
        });

        lines.color = Color3.FromHexString(color);
    }

    createLinePoints(
        name = `sphere-${this.boundingBoxPoints.length - 1}`,
        point = this.boundingBoxPoints[this.boundingBoxPoints.length - 1],
    ) {
        const sphere = MeshBuilder.CreateSphere(name, { diameter: 0.035 }, this.scene);
        sphere.position = point || Vector3.Zero();
        sphere.rotation = new Vector3(0, Math.PI / 2, 0);
        sphere.material = this.pointSpheresMaterial;
        sphere.forceSharedVertices();

        sphere.renderOutline = true;
        sphere.outlineColor = Color3.FromInts(22, 65, 108);
        sphere.outlineWidth = 0.002;

        return sphere;
    }

    changePointSphereColor(sphere, color) {
        this.hoverPointSpheresMaterial.specularColor = color;
        this.hoverPointSpheresMaterial.emissiveColor = color;
        this.hoverPointSpheresMaterial.ambientColor = color;
        this.hoverPointSpheresMaterial.diffuseColor = color;

        sphere.material = this.hoverPointSpheresMaterial;
    }

    formatLinePoints() {
        const points = [...this.boundingBoxPoints].slice(0, -1);
        const sortedPointsZ = [...points].sort((v1, v2) => v1.z - v2.z);
        const sortedPointsY = [...points].sort((v1, v2) => v1.y - v2.y);

        const pointPremaxZ = this.boundingBoxPoints.find((vector) => vector.z === sortedPointsZ[1].z);
        pointPremaxZ.z = sortedPointsZ[0].z;

        const pointPreminZ = this.boundingBoxPoints.find((vector) => vector.z === sortedPointsZ[2].z);
        pointPreminZ.z = sortedPointsZ[3].z;

        const pointPremaxY = this.boundingBoxPoints.find((vector) => vector.y === sortedPointsY[1].y);
        pointPremaxY.y = sortedPointsY[0].y;

        const pointPreminY = this.boundingBoxPoints.find((vector) => vector.y === sortedPointsY[2].y);
        pointPreminY.y = sortedPointsY[3].y;

        this.boundingBoxPoints[4] = this.boundingBoxPoints[0].clone();

        this.setModelByPoints();
        this.resetLineByPoints(false);
    }

    setModelByPoints() {
        const getBlindType = this.getBlindTypeFromStorage();
        const scalingDiff = {
            z: getBlindType === 'outdoor' ? 0.32 : 0.34,
            y: getBlindType === 'outdoor' ? 0.32 : 0.29,
        };

        const points = [...this.boundingBoxPoints].slice(0, -1);
        const sortedPointsZ = [...points].sort((v1, v2) => v1.z - v2.z);
        const sortedPointsY = [...points].sort((v1, v2) => v1.y - v2.y);

        this.boundingBox.position.z = (sortedPointsZ[3].z + sortedPointsZ[0].z) / 2;
        this.boundingBox.position.y = (sortedPointsY[3].y + sortedPointsY[0].y) / 2;

        this.boundingBox.scaling.x = Math.abs(sortedPointsZ[3].z - sortedPointsZ[0].z) + scalingDiff.z;
        this.boundingBox.absoluteScaling.x = Math.abs(sortedPointsZ[3].z - sortedPointsZ[0].z) + scalingDiff.z;

        this.boundingBox.scaling.y = Math.abs(sortedPointsY[0].y - sortedPointsY[3].y) + scalingDiff.y;
        this.boundingBox.absoluteScaling.y = Math.abs(sortedPointsY[0].y - sortedPointsY[3].y) + scalingDiff.y;

        this.boundingBox.rotationQuaternion = Quaternion.FromEulerVector(new Vector3(0, Math.PI / 2, 0));

        this.setGizmoModelMeshScaling(true);

        this.boundingBox.position.y -=
            getBlindType === 'interior' ? this.scene.meshes[0].position.y * (0.45 + this.boundingBox.scaling.y * 0.02) : 0.025;
    }

    resetLineByPoints(status) {
        this.scene.getMeshByName(this.blindId + 'line')?.dispose();
        this.scene.getMeshByName(this.blindId + 'lines')?.dispose();

        this.boundingBoxPointSpheres.forEach((sphere) => sphere.dispose());
        if (this.movePointSphere) {
            this.movePointSphere.isVisible = false;
        }

        this.boundingBoxPoints = [];
        this.boundingBoxPointSpheres = [];

        if (status) {
            this.scene.getMeshByName(this.blindId + 'plane')?.dispose();
            this.scene.onPointerUp = () => {};
        }
    }

    setControl(type): void {
        this.controlType = type;
        this.scene.onPointerObservable.remove(this.rotateModelObserver);
        this.scene.meshes[0].removeBehavior(this.dragModelBehavior);

        if (this.controlType === CONTROL_TYPES.rotate) {
            this.setRotateCursor();
            this.rotateModelObserver = this.scene.onPointerObservable.add((pointerInfo) => {
                this.setRotateControlEvent(pointerInfo);
            });
        } else if (this.controlType === CONTROL_TYPES.move) {
            this.setDragCursor();
            this.dragModelBehavior = new PointerDragBehavior({
                dragPlaneNormal: new Vector3(1, 0, 0),
            });
            this.dragModelBehavior.useObjectOrientationForDragging = false;
            this.dragModelBehavior.onDragStartObservable.add(() => {
                $(this.canvas).click();
            });

            this.dragModelBehavior.onDragObservable.add((event) => {
                const offset = 30;
                const size = {
                    widht: this.canvas.offsetWidth,
                    height: this.canvas.offsetHeight,
                };
                const coords = {
                    x: this.scene.pointerX,
                    y: this.scene.pointerY,
                };
                const direction = {
                    left: event.delta.z > 0,
                    right: event.delta.z < 0,
                    up: event.delta.y > 0,
                    down: event.delta.y < 0,
                };
                const borders = {
                    top: coords.y < offset,
                    left: coords.x < offset,
                    bottom: coords.x + offset > size.widht,
                    right: coords.y + offset > size.height,
                };
                const isOutside =
                    (borders.top && direction.up) ||
                    (borders.right && direction.right) ||
                    (borders.bottom && direction.down) ||
                    (borders.left && direction.left);

                if (isOutside) {
                    this.dragModelBehavior.releaseDrag();
                }
            });

            this.scene.meshes[0].addBehavior(this.dragModelBehavior);
        }
    }

    setRotateControlEvent(pointerInfo): void {
        switch (pointerInfo.type) {
            case PointerEventTypes.POINTERDOWN:
                $(this.canvas).click();
                this.startingRotationPoint = {
                    x: pointerInfo.event.clientX,
                    y: pointerInfo.event.clientY,
                };
                break;
            case PointerEventTypes.POINTERUP:
                this.startingRotationPoint = null;
                this.rotateAxis = '';
                break;
            case PointerEventTypes.POINTERMOVE:
                if (!this.startingRotationPoint) {
                    break;
                }

                const dY = this.startingRotationPoint.y - pointerInfo.event.clientY;
                const dX = this.startingRotationPoint.x - pointerInfo.event.clientX;

                if (!this.rotateAxis) {
                    this.rotateAxis = Math.abs(dY) < Math.abs(dX) ? 'axisY' : Math.abs(dY) > Math.abs(dX) ? 'axisZ' : '';
                } else {
                    this.rotateAxis = Math.abs(dY) + 5 < Math.abs(dX) ? 'axisY' : Math.abs(dY) > Math.abs(dX) + 5 ? 'axisZ' : this.rotateAxis;
                }

                if (this.rotateAxis === 'axisY') {
                    this.scene.meshes[0].rotation.y += dX * 0.003;
                } else if (this.rotateAxis === 'axisZ') {
                    this.scene.meshes[0].rotation.z -= dY * 0.003;
                }

                this.startingRotationPoint.x = pointerInfo.event.clientX;
                this.startingRotationPoint.y = pointerInfo.event.clientY;
                break;
        }
    }

    zoomIVModelHandler(pointerInfo: PointerInfo): void {
        const currentRay = pointerInfo.pickInfo.ray.direction.clone();
        const isSameRay =
            this.gizmoDragRayPicked &&
            this.gizmoDragRayPicked.x === currentRay.x &&
            this.gizmoDragRayPicked.y === currentRay.y &&
            this.gizmoDragRayPicked.z === currentRay.z;

        switch (pointerInfo.type) {
            case PointerEventTypes.POINTERDOWN:
                this.zoomGizmoSettings.fingers--;
                this.zoomGizmoSettings.pickOnMesh = pointerInfo.pickInfo.hit;
                this.gizmoDragPointPicked = this.zoomGizmoSettings.pickOnMesh ? pointerInfo.pickInfo.pickedPoint.clone() : null;
                this.gizmoDragRayPicked = pointerInfo.pickInfo.ray.direction.clone();
                break;

            case PointerEventTypes.POINTERMOVE:
                if (this.zoomGizmoSettings.pickOnMesh && !isSameRay) {
                    const event = pointerInfo.event as PointerEvent;

                    if (this.zoomGizmoSettings.fingers) {
                        this.boundingBox.addBehavior(this.gizmoDragModelBehavior);

                        const currentMoveRay = Ray.CreateNewFromTo(this.camera.position, this.gizmoDragPointPicked);
                        this.gizmoDragModelBehavior.startDrag(event.pointerId, currentMoveRay);
                    }
                }
                break;

            case PointerEventTypes.POINTERUP:
                this.boundingBox?.removeBehavior(this.gizmoDragModelBehavior);
                this.zoomGizmoSettings.fingers++;
                this.zoomGizmoSettings.pickOnMesh = false;
                this.gizmoDragPointPicked = null;
                this.gizmoDragRayPicked = null;
                break;
        }
    }

    setScreenShot(status: boolean, id: string): void {
        if (!this.getRootMeshById(this.blindId || null) || (this.isImageVisualisation && !this.boundingBoxesSettings[id])) {
            this.shareDataService.setScreenShotAborted(true);
            return;
        }

        this.scene.onReadyObservable.add(() => {
            const previousShutterValue = this.getShutterValue();
            const previousViewType: string = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_view_type);
            this.getTopSceneHandler(1, false);

            if (this.scene) {
                const upperSize = this.currentWidth > this.currentHeight ? this.currentWidth : this.currentHeight;
                const upperCord = upperSize + (6 - upperSize) * 0.12;
                const cameraPosition = this.isImageVisualisation ? new Vector3(-upperCord, 0, -upperCord) : new Vector3(upperCord, 0, -upperCord);
                const cameraForScreenShot = new FreeCamera('camera2', cameraPosition, this.scene);
                const shovedModelIds: number[] = [];
                const IVSceneSettings = {
                    quaternion: this.boundingBox?.rotationQuaternion,
                    position: this.boundingBox?.position,
                };

                cameraForScreenShot.setTarget(Vector3.Zero());

                const setSetupForScreenshot = () => {
                    this.ground.setEnabled(false);
                    this.ground.receiveShadows = false;

                    if (this.isImageVisualisation) {
                        this.shutter.preventShutterId = this.selectedGizmoId;
                        this.boundingBox.rotationQuaternion = Quaternion.FromEulerVector(new Vector3(0, Math.PI / 2, 0));
                        this.boundingBox.position = new Vector3(0, 0, 0);
                        this.boundingBox.setEnabled(true);
                        this.setGizmoModelMeshScaling(false);
                        this.getRootMeshes().forEach((mesh) => {
                            if (mesh.isEnabled()) {
                                shovedModelIds.push(parseInt(mesh.name, 10));
                            }
                            mesh.setEnabled(mesh.name === `${this.blindId}__root__`);
                        });
                    }
                };

                this.firstCreatedEngine ||= this.engine;

                Tools.CreateScreenshotUsingRenderTargetAsync(
                    this.firstCreatedEngine,
                    cameraForScreenShot,
                    1300,
                    'image/png',
                    1,
                    false,
                    null,
                    false,
                    false,
                    true,
                    1,
                    setSetupForScreenshot,
                ).then((data) => {
                    const rootMesh = this.getRootMeshById(id);
                    const viewType: string = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_view_type);

                    this.shareDataService.setScreenShotBLindTemp(data);

                    this.shutter.preventShutterId = null;

                    if (this.isImageVisualisation) {
                        this.boundingBox.rotationQuaternion = IVSceneSettings.quaternion;
                        this.boundingBox.position = IVSceneSettings.position;

                        if (rootMesh) {
                            this.setGizmoModelMeshScaling(true);
                            this.getRootMeshes().forEach((mesh) => mesh.setEnabled(shovedModelIds.includes(Number.parseInt(mesh.name, 10))));
                            this.setModelAndBoundingBoxSettings(id);
                        } else {
                            this.getRootMeshes().forEach((mesh) => mesh.setEnabled(shovedModelIds.includes(Number.parseInt(mesh.name, 10))));
                        }
                    } else {
                        this.ground.setEnabled(true);
                        this.ground.receiveShadows = true;
                    }

                    if (status && rootMesh && previousViewType === viewType) {
                        this.getTopSceneHandler(previousShutterValue);
                    }
                });
            }
        });
    }

    setIVSceneScreenShots(loaderStatus = true) {
        const setWrapperLoader = (status: boolean): void => {
            const wrapper = document.querySelector(SELECTORS.wrapper);
            const headerWrapper = document.querySelector(SELECTORS.headerWrapper);

            wrapper.classList.toggle(CLASSES.iv_loading, status);
            headerWrapper.classList.toggle(CLASSES.no_overview, status);
        };

        return new Promise((resolve, reject) => {
            if (!this.isImageVisualisation) {
                resolve(true);
                return;
            }

            setWrapperLoader(loaderStatus);
            this.setGizmoControlVisible(false);
            const rootMeshes = this.getRootMeshes();

            try {
                this.scene.whenReadyAsync().then(async () => {
                    await this.screenshotToBlindService.getSceneScreenshot(null, 'iv_scene');

                    for (const [index, mesh] of rootMeshes.entries()) {
                        const currentName = mesh.name;
                        const currentBlindId = currentName.replace(/__root__/g, '');
                        rootMeshes.forEach((currentMesh) => currentMesh.setEnabled(currentMesh.name === currentName));

                        if (this.boundingBoxesSettings[+currentBlindId]?.isEnabled) {
                            await this.scene.whenReadyAsync().then(async () => {
                                await this.screenshotToBlindService.getSceneScreenshot(+currentBlindId, 'iv');
                            });
                        }

                        if (index === rootMeshes.length - 1) {
                            rootMeshes.forEach((currentMesh) => {
                                const id = Number.parseInt(currentMesh.name, 10);
                                currentMesh.setEnabled(this.boundingBoxesSettings[id].isEnabled);
                            });

                            setWrapperLoader(false);
                            resolve(true);
                        }
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    setColor(name, color, transparency, material, blindType: string): void {
        this.colorEvents.next({
            model: name,
            modelColor: color,
            opacity: transparency,
            texture: material,
            blind_type: blindType,
        });
    }

    setTop(param): void {
        this.getTopSceneHandler(param);
    }

    setSize(param): any {
        this.sizeEvents.next(param);
    }

    setBoundingBoxSize(param): any {
        this.boundingBoxSizeEvents.next(param);
    }

    setModelDisplay(param): any {
        this.modelDisplayEvents.next(param);
    }

    setTopStyle(array): any {
        this.topStyleEvents.next(array);
    }

    setBottomBar(array): any {
        this.bottomBarEvents.next(array);
    }

    setOperation(data): any {
        this.operationEvents.next(data);
    }

    setReverse(data): any {
        this.reverseEvents.next(data);
    }

    setBottomChannel(array): any {
        this.bottomChannelEvents.next(array);
    }

    setMounting(data): any {
        this.mountingEvents.next(data);
    }

    setShutterControlValue(value: ShutterValues): any {
        this.shutterControlEvents.next(value);
    }

    getColor(): Observable<any> {
        return this.colorEvents.asObservable();
    }

    getSize(): Observable<any> {
        return this.sizeEvents.asObservable();
    }

    getBoundingBoxSize(): Observable<any> {
        return this.boundingBoxSizeEvents.asObservable();
    }

    getModelDisplay(): any {
        return this.modelDisplayEvents.asObservable();
    }

    getTopStyle(): Observable<any> {
        return this.topStyleEvents.asObservable();
    }

    getBottomBar(): Observable<any> {
        return this.bottomBarEvents.asObservable();
    }

    getOperation(): Observable<any> {
        return this.operationEvents.asObservable();
    }

    getReverse(): Observable<any> {
        return this.reverseEvents.asObservable();
    }

    getMounting(): Observable<any> {
        return this.mountingEvents.asObservable();
    }

    getBottomChannel(): Observable<any> {
        return this.bottomChannelEvents.asObservable();
    }

    getShutterControlValue(): Observable<any> {
        return this.shutterControlEvents.asObservable();
    }

    setDYBCameraRadius(hintStatus?) {
        if (!this.isImageVisualisation) {
            const getBlindType = this.getBlindTypeFromStorage() || 'outdoor';
            this.setZoomSettings(getBlindType);

            if (window.innerWidth > this.breakpoints['tablet-portrait']) {
                const devicePixelRatioCof =
                    window.devicePixelRatio > 1 && screen.width > this.breakpoints['l-desktop'] && !this.mobileAndTabletCheck()
                        ? window.devicePixelRatio
                        : 1;
                const toolBarWidth = window.innerWidth > this.breakpoints['l-desktop'] ? 580 : 375;
                const largestModelSize = this.currentWidth > this.currentHeight ? this.currentWidth : this.currentHeight;
                const defaultModelSize =
                    (this.currentWidth > this.currentHeight ? this.defaultModelSize?.width : this.defaultModelSize?.height) || 2.5;
                const addCameraOffset =
                    window.innerWidth > this.breakpoints['full-hd'] ? (window.innerWidth - this.breakpoints['full-hd']) / 1750 : 0;
                const defaultCameraOffset =
                    getBlindType === 'outdoor' ? -1.2 * (devicePixelRatioCof - 0.1) + addCameraOffset : -1.1 * devicePixelRatioCof;
                const isSmallPhoneLandscapeScreen = window.innerHeight < window.innerWidth && window.innerHeight <= 600 && window.innerWidth <= 992;

                let modelWidth;
                let modelHeight;
                let widthDiff;

                if (window.innerWidth > this.breakpoints['tablet-landscape']) {
                    const devicePixelRatio = this.mobileAndTabletCheck() ? 1.45 : window.devicePixelRatio;
                    const cof = 235 + (1 - devicePixelRatio) * 250;
                    modelWidth = largestModelSize * window.devicePixelRatio * cof;
                    widthDiff = modelWidth - (window.innerWidth - toolBarWidth);
                } else if (isSmallPhoneLandscapeScreen) {
                    modelHeight = this.currentHeight * 150;
                    widthDiff = modelHeight - window.innerHeight + 100;
                } else {
                    const windowWidthCof = this.mobileAndTabletCheck() ? 0.85 : 1;
                    modelWidth = largestModelSize * (150 - (this.breakpoints['tablet-portrait'] - screen.width) / 7.5);
                    widthDiff = modelWidth - screen.width * windowWidthCof + 250 * (this.breakpoints['tablet-portrait'] / screen.width);
                }

                const startRadius = isSmallPhoneLandscapeScreen && getBlindType === 'interior' ? 3.5 : 5.5;
                this.upperRadius =
                    widthDiff > 0
                        ? startRadius + widthDiff * 0.015
                        : largestModelSize < defaultModelSize
                            ? startRadius - (defaultModelSize - largestModelSize) * 2
                            : startRadius;

                const upperCameraOffsetCof = getBlindType === 'outdoor' ? 0.5 : 0.41 * devicePixelRatioCof;
                this.upperCameraOffset =
                    widthDiff > 0
                        ? defaultCameraOffset - widthDiff * 0.0015
                        : largestModelSize < defaultModelSize
                            ? defaultCameraOffset - (largestModelSize - defaultModelSize) * upperCameraOffsetCof
                            : defaultCameraOffset;
            } else if (window.innerWidth <= this.breakpoints['tablet-portrait']) {
                this.upperRadius = (this.currentWidth > this.currentHeight ? this.currentWidth : this.currentHeight) * 3;
            }

            if (this.camera.radius >= this.upperRadius) {
                this.isZoomedOut = true;
                this.zoomOutAnimationStatus = false;
            }

            this.zoomRadius = [this.upperRadius, (this.upperRadius + this.lowerRadius) / 2, this.lowerRadius];
            this.zoomCameraOffsets = [this.upperCameraOffset, (this.upperCameraOffset + this.lowerCameraOffset) / 2, this.lowerCameraOffset];

            if (!hintStatus) {
                this.zoomOutHandler(30);
            } else {
                this.getAnimationScene();
            }

            if (!this.zoomOutAnimationStatus) {
                this.camera.radius = this.upperRadius;
            }

            this.touchHandler(this.lowerRadius);
        }
    }

    setIVCameraRadius() {
        if (this.isImageVisualisation) {
            const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
            const getBlindType = this.getBlindTypeFromStorage() || 'outdoor';
            const widthDiff = this.currentWidth / 2 - INITIAL_MODEL_SIZES_IN_METERS[getBlindType].width;
            const largestModelSize = this.currentWidth > this.currentHeight ? this.currentWidth : this.currentHeight;

            if (this.sampleImage?.type) {
                const filteredBlindCheck = (id: number) =>
                    status && (Object.hasOwn(this.sampleProjectBlinds, id) || this.newCreatedBlinds.includes(id));
                const status = this.boundingBoxesSettingsStatus;
                const sampleProjectProperties = this.getIVCurrentSampleProject();
                const blinds = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_data);
                const blindIndex = blinds
                    .filter((blind: BlindData) => blind.type === this.sampleImage.type && (status ? filteredBlindCheck(blind.blind_id) : true))
                    .slice(0, sampleProjectProperties.length)
                    .map((blind) => blind.blind_id)
                    .indexOf(+this.blindId);

                this.camera.radius = sampleProjectProperties[blindIndex]?.cameraRadius || 5.5;
                this.startIVCameraRadius = clamp(this.camera.radius, this.camera.lowerRadiusLimit, this.camera.upperRadiusLimit);
                return;
            }

            if (window.innerWidth <= 1024 && window.innerWidth < window.innerHeight) {
                const windowWidthCof = (1280 - window.innerWidth) / 70;
                const radiusCof = widthDiff <= 0 ? (windowWidthCof < 10 ? 13 - windowWidthCof : 3) : windowWidthCof;
                const radius = 6 + widthDiff * radiusCof;

                this.camera.radius = radius;
                this.camera.upperRadiusLimit = radius > this.camera.upperRadiusLimit ? radius : this.camera.upperRadiusLimit;
            } else {
                this.camera.radius = largestModelSize * clamp(2.5 - (largestModelSize - 2) * 0.2, 1, 2.5);
            }

            if (this.boundingBoxesSettings[this.selectedGizmoId]) {
                this.camera.radius = this.boundingBoxesSettings[this.selectedGizmoId].cameraRadius;
            } else {
                this.camera.radius = clamp(this.camera.radius, this.camera.lowerRadiusLimit + 3, this.camera.upperRadiusLimit);
            }

            this.startIVCameraRadius = clamp(this.camera.radius, this.camera.lowerRadiusLimit, this.camera.upperRadiusLimit);
        }
    }

    setCameraOffset(): void {
        if (this.isImageVisualisation) {
            return;
        }

        if (window.innerWidth > this.breakpoints['tablet-landscape'] && this.scene.meshes[0]) {
            this.camera.targetScreenOffset.x = this.upperCameraOffset;
        }

        if (window.innerWidth < this.breakpoints['tablet-landscape']) {
            this.camera.targetScreenOffset.x = this.mobileCameraOffset;
        }
    }

    setDefaultCameraPosition(): void {
        if (this.isImageVisualisation) {
            return;
        }
        this.isZoomedIn = false;
        this.isZoomedOut = true;
        this.animationType = '';
        this.camera.position = this.cameraPosition;
        this.camera.alpha = this.cameraRotation;
        this.camera.beta = Math.PI / 2;
        this.camera.target = Vector3.Zero();
        this.zoomCounter = 0;
    }

    setFontSize(): void {
        this.fontSize = window.innerWidth <= this.breakpoints['tablet-landscape'] ? 12 : 20;
    }

    touchHandler(lowerLimit): void {
        const input = this.camera.inputs.attached.pointers;
        // @ts-ignore
        input.multiTouchPanning = false;

        this.camera.lowerRadiusLimit = lowerLimit;
        this.camera.upperRadiusLimit = this.upperRadius + 0.2;
    }

    scaleHandler(zoomIn: boolean, value: number): void {
        let zoom = 1;

        if (zoomIn) {
            zoom += value;
        }

        if (!zoomIn) {
            zoom -= value * 0.9;
        }

        this.scene.meshes[0].scaling = new Vector3(zoom, zoom, -zoom);
    }

    checkIsDesignView(): boolean {
        return this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_view_type) === VIEW_TYPES.design;
    }

    getModelGLB(): Promise<Blob> {
        return new Promise((res) => {
            const rootMesh = this.getCurrentRootMesh();
            const currentRootMeshRotation = rootMesh.rotation;
            const excludeNames = ['blindCenter', 'light', 'ground', '86MM TOPTUBE-1'];
            const blindId = this.blindId;
            const texturesScale = {};

            const options = {
                shouldExportNode: (node) => {
                    const isMesh = node.getClassName().includes('Mesh');
                    const isMeshForExport =
                        node.name.includes(blindId) &&
                        node.isEnabled() &&
                        !excludeNames.some((name) => node.name.toLowerCase().includes(name.toLowerCase()));

                    if (!node?.material?.albedoColor && isMeshForExport && isMesh) {
                        node.forceSharedVertices();
                    }

                    return isMeshForExport;
                },
            };

            const flipRootMeshRotation = (status: boolean) => {
                const euler = this.rootMeshRotationQuaternion.toEulerAngles();
                const newRotation = new Vector3(euler.x, euler.y, euler.z);

                rootMesh.rotation = status ? newRotation : currentRootMeshRotation;

                this.scene.meshes.forEach((mesh) => {
                    const texture = (mesh.material as PBRMaterial)?.albedoTexture as Texture;

                    if (texture) {
                        const { uScale, vScale } = texture;
                        texturesScale[texture.uniqueId] ||= { uScale, vScale };

                        texture.uScale = status ? 300 : texturesScale[texture.uniqueId].uScale;
                        texture.vScale = status ? 300 : texturesScale[texture.uniqueId].vScale;
                    }
                });
            };

            this.setGizmoModelMeshScaling(false);
            this.resetGizmoControl();

            flipRootMeshRotation(true);

            const previousShutterValue = this.getShutterValue();
            if (this.isImageVisualisation) {
                this.getTopSceneHandler(1, false);
            }

            GLTF2Export.GLBAsync(this.scene, 'model.glb', options).then((glb: GLTFData) => {
                flipRootMeshRotation(false);
                const blob = glb.glTFFiles['model.glb'] as Blob;

                this.setGizmoControl(true);

                if (this.isImageVisualisation) {
                    this.getTopSceneHandler(previousShutterValue);
                }

                res(this.compressModelService.compress(blob));
            });
        });
    }

    addVideoLayer(): Promise<boolean> {
        return new Promise((res, rej) => {
            this.videoLayer = new Layer('background', null, this.scene, true);
            this.sampleImage = null;

            navigator.mediaDevices
                .getUserMedia({
                    audio: false,
                    video: { facingMode: { exact: 'environment' } },
                })
                .then((stream: MediaStream) => {
                    VideoTexture.CreateFromWebCam(
                        this.scene,
                        (videoTexture) => {
                            this.videoStream = stream;

                            if (!this.passDataService.isLaunchCameraStopped) {
                                this.canvas.style.backgroundImage = '';
                                videoTexture._invertY = false;

                                this.videoTexture = videoTexture;
                                this.videoLayer.texture = videoTexture;

                                this.appendVideoToHTML(videoTexture.video);
                                this.changeViewType(true);
                                setTimeout(this.updateVideoTextureSize.bind(this));
                                this.shareDataService.setViewType(VIEW_TYPES.image_visualisation);
                                this.sessionStorageService.setSession('live_background', STORAGE_NAMES.zip_iv_type);
                                this.passDataService.isLiveOpened = true;

                                res(true);
                            }

                            this.passDataService.isLaunchCameraStopped = false;
                        },
                        {
                            minWidth: 0,
                            minHeight: 0,
                            maxWidth: 1920,
                            maxHeight: 1080,
                            deviceId: stream.getVideoTracks()[0].getSettings().deviceId,
                        },
                    );
                })
                .catch((err) => {
                    rej(false);
                    console.error(err);
                });
        });
    }

    calculatePixel(obj: Mesh) {
        const temp = new Vector3();
        const vertices = obj.getBoundingInfo().boundingBox.vectorsWorld;
        const viewport = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
        let minX = 1e10;
        let minY = 1e10;
        let maxX = -1e10;
        let maxY = -1e10;

        for (const vertex of vertices) {
            Vector3.ProjectToRef(vertex, Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), viewport, temp);
            if (minX > temp.x) {
                minX = temp.x;
            }
            if (maxX < temp.x) {
                maxX = temp.x;
            }
            if (minY > temp.y) {
                minY = temp.y;
            }
            if (maxY < temp.y) {
                maxY = temp.y;
            }
        }
        return { x: maxX - minX, y: maxY - minY };
    }

    closeVideoStream(): void {
        if (this.videoStream) {
            // @ts-ignore
            const videoEl = this.videoLayer.texture.video;
            const videoElements = document.querySelectorAll('video');
            const videos = videoElements.length ? videoElements : [videoEl];

            videos.forEach((video) => (video.srcObject as MediaStream).getTracks().forEach((stream) => stream.stop()));
            this.videoStream.getTracks().forEach((track) => track.stop());
            this.videoLayer.texture.dispose();

            this.videoStream = null;
        }
    }

    updatePositionForHints(): void {
        if (this.advancedTexture) {
            this.advancedTexture.idealWidth = window.innerWidth;
        }
    }

    updateVideoTextureSize(): void {
        if (this.videoTexture) {
            const canvasAspectRatio = this.canvas.width / this.canvas.height;
            const videoAspectRatio = this.videoTexture.video.videoWidth / this.videoTexture.video.videoHeight;

            if (canvasAspectRatio > videoAspectRatio) {
                this.videoLayer.scale.x = videoAspectRatio / canvasAspectRatio;
                this.videoLayer.scale.y = 1;

                this.videoTexture.uScale = 1 / this.videoLayer.scale.x;
                this.videoTexture.vScale = 1;
                this.videoTexture.uOffset = (1 - this.videoTexture.uScale) * 0.5;
                this.videoTexture.vOffset = 0;
            } else {
                this.videoLayer.scale.x = 1;
                this.videoLayer.scale.y = canvasAspectRatio / videoAspectRatio;

                this.videoTexture.uScale = 1;
                this.videoTexture.vScale = 1 / this.videoLayer.scale.y;
                this.videoTexture.uOffset = 0;
                this.videoTexture.vOffset = (1 - this.videoTexture.vScale) * 0.5;
            }
        }
    }

    setPositionForHTMLHints(): void {
        if (!this.scene.meshes[0]) {
            return;
        }

        const temp = new Vector3();

        this.afterRenderCallback = this.scene.onAfterRenderObservable.add(() => {
            const vertices = this.scene.meshes[0].getBoundingInfo().boundingBox.vectorsWorld;
            const viewport = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
            let minX = 1e10;
            let minY = 1e10;

            for (const vertex of vertices) {
                Vector3.ProjectToRef(vertex, Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), viewport, temp);

                if (minX > temp.x) {
                    minX = temp.x;
                }
                if (minY > temp.y) {
                    minY = temp.y;
                }
            }

            const canvasZone = this.engine.getRenderingCanvas();
            const offsetX = canvasZone.offsetLeft;
            const offsetY = canvasZone.offsetTop;

            document.querySelectorAll(SELECTORS.cursor).forEach((hint: HTMLElement) => {
                hint.style.left = minX + offsetX - hint.getBoundingClientRect().width / 2 + 'px';
                hint.style.top = minY + offsetY - hint.getBoundingClientRect().height / 2 + 'px';
            });
        });
    }

    removeAfterRenderObservable(): void {
        this.scene.onAfterRenderObservable.remove(this.afterRenderCallback);
    }

    mobileAndTabletCheck(): boolean {
        let check = false;
        ((a) => {
            if (
                /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
                    a,
                ) ||
                /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
                    a.substr(0, 4),
                )
            ) {
                check = true;
            }
        })(navigator.userAgent || navigator.vendor);
        return check || 'ontouchstart' in window;
    }

    getMaterialTypes(): void {
        const sessionStorageDefaultData = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_config) || {};
        const sessionDefaultDataType = sessionStorageDefaultData[this.blindType];

        if (sessionDefaultDataType?.material) {
            this.materialTypes = sessionDefaultDataType.material.map((m) => m.type);
        }
    }

    onChangeBlindId(id: string): void {
        this.setGizmoZoomModelBehavior(false);
        this.setModelAndBoundingBoxSettings();

        const hasNumber = (testString: string) => /\d/.test(testString);
        this.blindId = id;

        if (this.isImageVisualisation && id && id !== this.selectedGizmoId) {
            setTimeout(this.setBoundingBoxById.bind(this, id, this.getRootMeshById(id)), 100);
        }

        if (!hasNumber(this.scene.meshes[0].name) || !this.isImageVisualisation) {
            this.setIdForSceneMeshes(id);
        }

        if (id === this.selectedGizmoId) {
            this.setGizmoZoomModelBehavior(true);
        }
    }

    setIdForSceneMeshes(id: string): void {
        this.scene.meshes[0].name = id + this.scene.meshes[0].id;
        this.scene.meshes[0]
            .getChildMeshes()
            .forEach((mesh: AbstractMesh) => (mesh.name = id ? `${id}${mesh.id}` : this.removeIdFromName(mesh.name)));
    }

    removeIdFromName(name: string): string {
        return name.replace(/\d{4}/g, '');
    }

    IVSceneHandler(id: string, type: string): void {
        const rootMeshByCurrentId = this.getRootMeshById(id);
        const setModelCreatedAndApplyBoundingBox = (mesh: AbstractMesh, clearSettinsStatus = false) => {
            this.scene.onAfterRenderObservable.addOnce(() => {
                this.shareDataService.getSceneCreated.pipe(first(), delay(10)).subscribe(() => {
                    if (clearSettinsStatus) {
                        delete this.boundingBoxesSettings[this.selectedGizmoId];
                        this.shareDataService.setScreenShotStatus(false);
                    }

                    this.setIVCameraSettings();
                    this.applyBoundingBoxToSelectedModel(mesh);
                    this.setIVSampleProjectById(id);
                    this.isCopyingModel = false;
                });

                this.setSceneAndModelViewCreated(this.blindType, false);
            });
        };

        const addSettingsAfterClonning = (mesh: AbstractMesh, clearSettinsStatus = false) => {
            mesh.setParent(null);
            mesh.position = new Vector3(0, 0, 0);
            mesh.rotation = new Vector3(0, Math.PI / 2, 0);

            this.setDefaultView();
            setModelCreatedAndApplyBoundingBox(mesh, clearSettinsStatus);
        };

        if (!id) {
            return;
        }

        if (rootMeshByCurrentId) {
            this.blindType = type;
            this.selectedGizmoId = id;
            setModelCreatedAndApplyBoundingBox(rootMeshByCurrentId);
            return;
        }

        const hasChildMeshes = this.rootMeshesByType[type]?.getChildren()?.length;

        if (type !== this.blindType || !hasChildMeshes) {
            this.preventScalingModel = false;
            this.isModelCreated = false;
            const blindType = type === 'outdoor' ? this.blindOutdoor : this.blindInterior;
            this.loadModelWithRetry(this.baseUrl, blindType, this.scene).then((container) => {
                this.blindType = type;
                const newRootMesh = this.cloneRootMesh(id, container.meshes[0], type, false);
                this.isModelCreated = true;
                this.getGlobalMeshPositionAndScale(type);
                addSettingsAfterClonning(newRootMesh, true);

                if (!this.rootMeshesByType[this.blindType]) {
                    this.rootMeshesByType[this.blindType] = container.meshes[0];
                }
            });
        }

        if (type === this.blindType && hasChildMeshes) {
            this.preventScalingModel = false;
            const meshForClone = this.rootMeshesByType[this.blindType];
            const newRootMesh = this.cloneRootMesh(id, meshForClone, type, false);
            addSettingsAfterClonning(newRootMesh, true);
        }
    }

    getCurrentRootMesh(): AbstractMesh {
        const rootMesh = this.getRootMeshById(this.blindId);
        const defaultRootMesh = this.getRootMeshById('');

        return rootMesh || defaultRootMesh;
    }

    toggleRootMeshById(id: string, status: boolean): void {
        const rootMesh = this.getRootMeshById(id);
        rootMesh?.setEnabled(status);

        if (this.boundingBoxesSettings && this.boundingBoxesSettings[id]) {
            this.boundingBoxesSettings[id].isEnabled = status;
        }

        if (rootMesh?.parent?.name === 'box') {
            this.setGizmoControlVisible(status);
            rootMesh.parent.setEnabled(status);
        }

        this.setModelDisplay({ id, isEnabled: status });
    }

    getRootMeshById(id: string): AbstractMesh {
        return this.scene?.meshes.filter((mesh: AbstractMesh) => mesh.name === `${id}__root__`)[0];
    }

    getRootMeshes(): AbstractMesh[] {
        return this.scene?.meshes.filter((mesh: AbstractMesh) => mesh.name.includes('__root__'));
    }

    removeRootMeshes(): void {
        const rootMeshes = this.getRootMeshes();

        if (rootMeshes.length > 1) {
            rootMeshes.filter((rootMesh) => !rootMesh.name.includes(this.selectedGizmoId)).forEach((rootMesh) => rootMesh.dispose());
        }
    }

    setModelAndBoundingBoxSettings(id?: string): void {
        if (!this.isImageVisualisation) {
            return;
        }

        const currentPosition = this.boundingBox.position.clone();
        const currentScaling = this.boundingBox.scaling.clone();
        const currentRotationQuanterion = this.boundingBox.rotationQuaternion.clone();
        const currentCameraRadius = this.camera.radius;
        const currentIsEnabled = id ? this.getRootMeshById(id)?.isEnabled() : this.getCurrentRootMesh()?.isEnabled();
        this.selectedGizmoId ||= this.blindId;

        this.boundingBoxesSettings = {
            ...this.boundingBoxesSettings,
            [id || this.selectedGizmoId]: {
                position: currentPosition,
                scaling: currentScaling,
                rotationQuaternion: currentRotationQuanterion,
                cameraRadius: currentCameraRadius,
                isEnabled: currentIsEnabled,
            },
        };

        this.resetModelRenderingSettings();
        this.setShutterControlEvent();
    }

    saveModelAndBoundingBoxSettings(setBoundingBoxStatus = true, clearSettingsStatus = true) {
        if (setBoundingBoxStatus) {
            this.setModelAndBoundingBoxSettings();
        }

        const ivCurrentBackground = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_image_visualisation_background);
        const ivUploadedBackground = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_uploaded_image_visualisation_background);
        const ivLastType = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_iv_type);

        const ivLastBackground = ivCurrentBackground?.type === null ? ivUploadedBackground : ivCurrentBackground;
        const updatedLastBackground = {
            ...ivLastBackground,
            settings: { ...this.boundingBoxesSettings },
            shutterValues: { ...this.shutter.modelsValue },
            sampleProjectBlinds: { ...this.sampleProjectBlinds },
        };

        this.boundingBoxesSettings = clearSettingsStatus ? {} : this.boundingBoxesSettings;

        this.sessionStorageService.setBlindData(updatedLastBackground, STORAGE_NAMES.zip_image_visualisation_background);

        if (ivCurrentBackground?.type === null) {
            delete updatedLastBackground.sampleProjectBlinds;
            this.sessionStorageService.setBlindData(updatedLastBackground, STORAGE_NAMES.zip_uploaded_image_visualisation_background);
        }

        if (ivLastType === 'live_background') {
            this.sessionStorageService.removeBlindData(STORAGE_NAMES.zip_image_visualisation_background);
        }
    }

    getModelAndBoundingBoxSettings(savedSettings) {
        if (!savedSettings) {
            return;
        }

        this.boundingBoxesSettingsStatus = true;

        for (const key of Object.keys(savedSettings)) {
            const currentPosition = savedSettings[key].position;
            const currentScaling = savedSettings[key].scaling;
            const currentRotation = savedSettings[key].rotationQuaternion;

            this.boundingBoxesSettings[key] = {
                ...savedSettings[key],
                scaling: new Vector3(currentScaling._x, currentScaling._y, currentScaling._z),
                position: new Vector3(currentPosition._x, currentPosition._y, currentPosition._z),
                rotationQuaternion: new Quaternion(currentRotation._x, currentRotation._y, currentRotation._z, currentRotation._w),
            };
        }
    }

    resetModelRenderingSettings() {
        const blinds: BlindData[] = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_data);
        const renderGroupId = blinds.findIndex((blind: BlindData) => blind.blind_id === +this.selectedGizmoId);
        RenderingManager.MAX_RENDERINGGROUPS = blinds.length + 1;

        const currentRootMesh = this.getRootMeshById(this.selectedGizmoId);
        this.setModelRenderingSettings(currentRootMesh, renderGroupId, true);
    }

    setModelRenderingSettings(model: AbstractMesh, renderGroupId: number, isPickable: boolean): void {
        model?.getChildren().forEach((mesh: AbstractMesh) => {
            mesh.renderingGroupId = renderGroupId;
            mesh.isPickable = isPickable;
        });
    }

    applyBoundingBoxToSelectedModel(rootMesh: AbstractMesh, setEnabled = true): void {
        const childMesh = this.boundingBox.getChildMeshes()[0];

        const box = BoundingBoxGizmo.MakeNotPickableAndWrapInBoundingBox(rootMesh as Mesh);
        const boxSettings = {
            position: box.position.clone(),
            scaling: box.scaling.clone(),
            rotationQuaternion: box.rotation.toQuaternion().clone(),
        };
        rootMesh.setParent(null);
        box.dispose();

        if (childMesh) {
            this.boundingBox.removeChild(childMesh);
        }

        this.boundingBox.position = this.boundingBoxesSettings[this.selectedGizmoId]?.position || boxSettings.position;
        this.boundingBox.scaling = this.boundingBoxesSettings[this.selectedGizmoId]?.scaling || boxSettings.scaling;
        this.boundingBox.rotationQuaternion =
            this.boundingBoxesSettings[this.selectedGizmoId]?.rotationQuaternion || boxSettings.rotationQuaternion;
        this.boundingBoxRotation = this.boundingBox.rotationQuaternion.toEulerAngles();
        this.boundingBox.addChild(rootMesh);
        this.boundingBox.setEnabled(true);
        rootMesh.rotation = new Vector3(Math.PI, 0, 0);
        rootMesh.setEnabled(setEnabled);

        this.setModelDisplay({
            id: +this.selectedGizmoId,
            isEnabled: !!setEnabled,
        });
        this.resetBoundingBoxDisplay();

        // @ts-ignore
        this.scene._renderingManager.setRenderingAutoClearDepthStencil(RenderingManager.MAX_RENDERINGGROUPS - 1, true, true, true);
        this.setModelRenderingSettings(rootMesh, RenderingManager.MAX_RENDERINGGROUPS - 1, false);
        this.setGizmoMinMaxMeshScaling();
        this.getGizmoMeshScaling(true);
        this.setGizmoModelMeshScaling(true);
        this.setShutterControlEvent();

        this.camera.radius = this.boundingBoxesSettings[this.selectedGizmoId]?.cameraRadius || this.startIVCameraRadius;
        this.setGizmoZoomModelBehavior();
    }

    resetBoundingBoxDisplay(id: string = '', resetStatus = this.resetSelectedBlind): void {
        if (!resetStatus) {
            return;
        }

        if (id) {
            delete this.boundingBoxesSettings[id];
            delete this.sampleProjectBlinds[id];
        }

        this.setIVCameraSettings();
        this.setGizmoControl(true);
        this.setIVSampleProjectById(id || undefined);
        this.toggleRootMeshById(this.selectedGizmoId, true);
        this.resetSelectedBlind = false;
    }

    setBoundingBoxById(id: string, mesh: AbstractMesh): void {
        this.selectedGizmoId = id;
        this.applyBoundingBoxToSelectedModel(mesh);
    }

    cloneRootMesh(id: string, meshForClone: AbstractMesh, type: string, isEnabled = true): AbstractMesh {
        const parent = meshForClone.parent;
        meshForClone.setParent(null);

        const newRootMesh = meshForClone.instantiateHierarchy(null, { doNotInstantiate: true }, (source, clone) => {
            clone.name = `${id}${source.id}`;
            clone.setEnabled(!GLOBAL_HIDDEN_PELMET.includes(source.id));
        }) as AbstractMesh;

        if (!this.scene.meshes.includes(newRootMesh)) {
            this.scene.addMesh(newRootMesh, true);
        }

        meshForClone.setParent(parent);
        newRootMesh['blind_type'] = type;
        newRootMesh.setEnabled(isEnabled);

        return newRootMesh;
    }

    getGlobalMeshPositionAndScale(type: string, blindId?: string): void {
        const MESH_TYPE = type === 'outdoor' ? MESHES_IDS : INTERIOR_MESHES_IDS;
        const SCALING_TYPE = type === 'outdoor' ? SCALING_MESHES : INTERIOR_SCALING_MESHES;
        blindId ||= this.blindId;

        for (const id in MESH_TYPE) {
            if (id) {
                this.meshPosition[id] = {
                    x: this.scene.getMeshByName(blindId + MESH_TYPE[id])?.position.x,
                    y: this.scene.getMeshByName(blindId + MESH_TYPE[id])?.position.y,
                    z: this.scene.getMeshByName(blindId + MESH_TYPE[id])?.position.z,
                };

                if (this.scene.getMeshByName(blindId + MESH_TYPE[id])?.material?.name.includes('aluminum')) {
                    const material = this.scene.getMeshByName(blindId + MESH_TYPE[id])?.material;

                    // @ts-ignore
                    material._albedoColor = Color3.FromHexString('#919092').toLinearSpace();
                }
            }
        }

        for (const id in SCALING_TYPE) {
            if (id) {
                this.meshScaling[id] = {
                    x: this.scene.getMeshByName(blindId + MESH_TYPE[id])?.scaling.x,
                    y: this.scene.getMeshByName(blindId + MESH_TYPE[id])?.scaling.y,
                    z: this.scene.getMeshByName(blindId + MESH_TYPE[id])?.scaling.z,
                };
            }
        }
    }

    getBlindTypeFromStorage(): string {
        return this.sessionStorageService.getSession(STORAGE_NAMES.zip_blind_type);
    }

    createModelsFromStorage(): void {
        const sampleProjectProperties = this.getIVCurrentSampleProject();
        const blinds: BlindData[] = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_data);
        const smapleProjectBlinds = blinds
            .filter((blind: BlindData) => blind.type === this.sampleImage?.type)
            .slice(0, sampleProjectProperties.length)
            .map((blind) => blind.blind_id);
        const notCreatedBlinds = blinds.filter((blind) => blind.blind_id.toString() !== this.selectedGizmoId);
        const prevBlindType = this.blindType;
        const prevSelectedGizmoId = this.selectedGizmoId;
        let prevBoundingBoxPosition = null;
        let indexOffset = 0;
        let i = 0;

        const createModelAndSetSetup = (blind: BlindData) => {
            const setBoudingBoxOffset = () => {
                // @ts-ignore
                this.scene._renderingManager.setRenderingAutoClearDepthStencil(i + 1, true, true, true);

                if (this.boundingBoxesSettings[this.selectedGizmoId] || !this.sampleImage?.type) {
                    return;
                }

                this.boundingBox.position = Vector3.Zero();
                const boundingBoxPosition = this.boundingBox.position.clone();
                const boundingBoxScaling = this.boundingBox.scaling.clone();
                const boundingBoxHalfScaling = new Vector3(0, boundingBoxScaling.y, boundingBoxScaling.x).multiplyByFloats(0, 0.5, 0.5);
                const currentBoundingBoxTopPosition = boundingBoxPosition.add(boundingBoxHalfScaling);
                const diff = prevBoundingBoxPosition ? currentBoundingBoxTopPosition.subtract(prevBoundingBoxPosition) : Vector3.Zero();
                prevBoundingBoxPosition = currentBoundingBoxTopPosition.subtract(diff);

                const offsetValue = 0.2 * (i + indexOffset);
                this.boundingBox.position.addInPlaceFromFloats(0, -(offsetValue + diff.y), -(offsetValue + diff.z));
                this.camera.radius = 5.5;
            };

            const resetBoundingBoxScaling = () => {
                if (
                    (this.sampleImage?.type && !smapleProjectBlinds.some((blindId) => blindId === +this.selectedGizmoId)) ||
                    !this.sampleImage?.type
                ) {
                    this.setGizmoModelMeshScaling(false);

                    if (this.sampleImage?.type && !this.boundingBoxesSettingsStatus) {
                        delete this.boundingBoxesSettings[this.selectedGizmoId];
                    }
                } else {
                    indexOffset -= 1;
                }
            };

            const setSetup = (mesh: AbstractMesh) => {
                mesh.setParent(null);
                mesh.position = new Vector3(0, 0, 0);
                mesh.rotation = new Vector3(0, Math.PI / 2, 0);

                this.setModelAndBoundingBoxSettings();
                this.blindType = blind.type;
                this.selectedGizmoId = this.blindId = blind.blind_id.toString();

                const subscription = this.getSize().subscribe((res) => {
                    if (!Object.hasOwn(res, 'height')) {
                        return;
                    }
                    resetBoundingBoxScaling();

                    this.startIVCameraRadius = null;
                    this.setIVCameraRadius();

                    subscription.unsubscribe();
                    const isEnabled = this.boundingBoxesSettings[this.selectedGizmoId]?.isEnabled || false;
                    this.applyBoundingBoxToSelectedModel(mesh, isEnabled);
                    setBoudingBoxOffset();

                    if (i !== notCreatedBlinds.length - 1) {
                        createModelAndSetSetup(notCreatedBlinds[++i]);
                    } else {
                        this.boundingBoxesSettingsStatus = false;
                        this.setModelAndBoundingBoxSettings();
                        this.blindType = prevBlindType;
                        this.blindId = this.selectedGizmoId = prevSelectedGizmoId;
                        this.getStorageSizes();
                        this.setBoundingBoxById(this.blindId, this.getRootMeshById(this.blindId));
                    }
                });

                this.setConfig(blind);
            };

            if (this.getRootMeshById(blind.blind_id.toString())) {
                const mesh = this.getRootMeshById(blind.blind_id.toString());
                setSetup(mesh);
            } else if (this.rootMeshesByType[blind.type]?.getChildMeshes().length) {
                const mesh = this.cloneRootMesh(blind.blind_id.toString(), this.rootMeshesByType[blind.type], blind.type, false);

                setSetup(mesh);
            } else {
                const blindType = blind.type === 'outdoor' ? this.blindOutdoor : this.blindInterior;
                let rootMesh: AbstractMesh;
                this.loadModelWithRetry(this.baseUrl, blindType, this.scene)
                    .then((container) => {
                        container.addAllToScene();
                        rootMesh = container.meshes[0];
                        rootMesh['blind_type'] = blind.type;
                        container.meshes.forEach((mesh) => {
                            mesh.checkCollisions = true;
                            mesh.setEnabled(!GLOBAL_HIDDEN_PELMET.includes(mesh.name));
                            mesh.name = `${blind.blind_id}${mesh.id}`;
                        });
                        this.rootMeshesByType[blind.type] = rootMesh;
                    })
                    .then(() => {
                        this.getGlobalMeshPositionAndScale(blind.type, blind.blind_id.toString());
                        setSetup(rootMesh);
                    });
            }
        };

        if (notCreatedBlinds.length) {
            createModelAndSetSetup(notCreatedBlinds[i]);
        } else {
            this.boundingBoxesSettingsStatus = false;
        }
    }

    getStorageSizes() {
        const blindItemById = this.sessionStorageService.getBlindItemById(+this.selectedGizmoId, STORAGE_NAMES.zip_blind_data);

        if (blindItemById.length) {
            const sizeStorage = blindItemById[0].setup.size;
            this.currentHeight = sizeStorage.height / 1000;
            this.currentWidth = sizeStorage.width / 1000;
        }
    }

    setConfig(blind: BlindData): void {
        const serverMaterialData = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_blind_config)[blind.type].material;
        const isOutdoor = blind.type === 'outdoor';
        const isInterior = blind.type === 'interior';
        const colorPalette = isOutdoor ? COLOR_FRAME_PELMET : INTERIOR_COLOR_FRAME_PELMET;
        const { material, frames, fixtures_color, mounting, operation } = blind?.setup;

        if (material) {
            const { color, type } = material;
            const isClearPVC = type === serverMaterialData[1].type && isOutdoor;
            const opacity = isOutdoor && !isClearPVC ? MINIMUM_MATERIAL_OPACITY : material.opacity;

            for (const meshId of MATERIAL_MESH) {
                this.setColor(meshId, isClearPVC ? '#ffffff' : color, opacity, type, blind.type);
            }

            for (const meshId of SPLINE_MESH) {
                this.setColor(meshId, isClearPVC ? frames.frame_color.color : color, 1, isClearPVC ? 'frame' : type, blind.type);
            }

            const materialColor = MATERIAL_COLORS.find((item) => item.name === 'Monument').color;

            if (isInterior) {
                this.setColor('WEATHER STRIP', materialColor, 1, material.type, blind.type);
            } else if (isOutdoor) {
                this.setColor('STANDARD_WHEATER_STRIP', materialColor, 1, 'frame', blind.type);
                this.setColor('LARGE_WEATHER_STRIP', materialColor, 1, 'frame', blind.type);
            }
        }

        if (frames) {
            const { top_style, bottom_bar, optionals } = frames;

            if (top_style && isOutdoor) {
                const topStyleMeshes = TOP_STYLE_IDS.filter((item) => item.id === top_style.id)[0].meshes;
                this.setTopStyle({ meshes: topStyleMeshes });
            }

            if (bottom_bar && isOutdoor) {
                const bottomBarMeshes = BOTTOM_BAR_IDS.filter((item) => item.id === bottom_bar.id)[0].meshes;
                this.setBottomBar({ meshes: bottomBarMeshes });
            }

            if (optionals) {
                const state = !!optionals.length;
                const mountingName = mounting?.name?.toLowerCase();
                const bottomChannel = BOTTOM_CHANNEL_HANDLE.filter((name) => !state || name.toLowerCase().includes(mountingName));

                if (bottomChannel) {
                    this.setBottomChannel({ meshes: bottomChannel, state: false });
                    this.getInteriorFaceFixStopper(false);
                }
            }

            for (const meshId of colorPalette) {
                this.setColor(meshId, frames.frame_color.color, 1, 'frame', blind.type);
            }
        }

        if (fixtures_color && frames && isInterior) {
            const meshArray =
                frames.top_style.id === INTERIOR_FRAME_TOP_STYLE[2].id ? INTERIOR_COLOR_FIXTURES : INTERIOR_COLOR_FIXTURES.slice(0, -2);

            for (const meshId of meshArray) {
                this.setColor(meshId, fixtures_color.color, 1, 'frame', blind.type);
            }
        }

        if (mounting) {
            const meshArray = isOutdoor
                ? mounting.id === 1
                    ? REVEAL_CHANNEL
                    : FACE_FIX
                : mounting.id === 1
                    ? REVEAL_CHANNEL_INTERIOR
                    : FACE_FIX_INTERIOR;

            this.setMounting({
                meshes: meshArray,
                id: mounting.id,
                from_config: true,
            });
        }

        if (operation && isOutdoor) {
            const meshArray = operation.id === 1 ? SPRING_BALANCE : [...SPRING_BALANCE, ...REVERSE_HANDLE];
            const reverseLock = operation.optional.find((x) => x.id === 2);

            this.setOperation({
                id: operation.id,
                meshes: meshArray,
            });

            if (reverseLock) {
                this.setReverse({
                    meshes: REVERSE_HANDLE,
                    state: true,
                });
            }
        }

        if (isOutdoor) {
            const meshArray = [...REVERSE_HANDLE, ...BLACK_PLASTIC_MESH];

            for (const meshId of meshArray) {
                const color = MATERIAL_COLORS.find((item) => item.name === 'Ebony').color;
                this.setColor(meshId, color, 1, 'frame', blind.type);
            }

            for (const meshId of ALUMINIUM_MESH) {
                const color = MATERIAL_COLORS.find((item) => item.name === 'Mist').color;
                this.setColor(meshId, color, 1, 'frame', blind.type);
            }
        }

        this.getTopSceneHandler(this.getShutterValue());

        if (blind?.setup.size.width && blind?.setup.size.height) {
            const { width, height } = blind?.setup.size;
            this.setSize({ width: width * 0.001, blind_type: blind.type });
            this.setSize({ height: height * 0.001, blind_type: blind.type });
        }
    }

    onDeleteModel(id: string): void {
        const rootMesh = this.getRootMeshById(id);

        if (rootMesh && this.isImageVisualisation) {
            this.scene.removeMesh(rootMesh, true);
        }

        delete this.boundingBoxesSettings?.[id];
        delete this.sampleProjectBlinds?.[id];
        this.updateIVBackgroundOnDelete(id);
    }

    updateIVBackgroundOnDelete(id: string): void {
        const ivCurrentBackground = this.sessionStorageService.getBlindData(STORAGE_NAMES.zip_image_visualisation_background);

        if (!ivCurrentBackground?.type) {
            return;
        }

        delete ivCurrentBackground.sampleProjectBlinds?.[id];
        delete ivCurrentBackground.settings?.[id];

        this.sessionStorageService.setBlindData(ivCurrentBackground, STORAGE_NAMES.zip_image_visualisation_background);
    }

    setBoundingBoxForCopiedModel(currentId: string, newId: string): void {
        const { scaling, rotationQuaternion, cameraRadius, position } = this.boundingBoxesSettings[currentId];
        this.boundingBoxesSettings[newId] = {
            position: new Vector3(position.x, 0, 0),
            scaling,
            rotationQuaternion,
            cameraRadius,
            isEnabled: true,
        };
        this.setShutterValueForCopiedModel(currentId, newId);
    }

    setShutterValueForCopiedModel(currentId: string, newId: string): void {
        this.shutter.modelsValue[newId] = this.shutter.modelsValue[currentId];
    }

    copyModel(newId: string, copyId: string, type: string): void {
        this.isCopyingModel = true;
        this.setModelAndBoundingBoxSettings();
        const rootMeshForCopy = this.rootMeshesByType[type];

        this.cloneRootMesh(newId, rootMeshForCopy, type, true);
        this.setBoundingBoxForCopiedModel(copyId, newId);
        this.shareDataService.setModelLoaded(true);
        this.shareDataService.getModelLoaded.pipe(first()).subscribe(this.setSceneAndModelViewCreated.bind(this, type));
    }

    getModelShowed(id: string): boolean {
        const rootMesh = this.getRootMeshById(id);

        return rootMesh?.isEnabled();
    }

    getRootMeshEnabled(): boolean {
        const rootMesh = this.getCurrentRootMesh();

        return rootMesh?.isEnabled();
    }

    setShutterControlEvent(): void {
        if (!this.getCurrentRootMesh()) {
            return;
        }

        this.setShutterControlValue({
            id: this.selectedGizmoId,
            value: this.getShutterValue(),
        });
    }

    setShutterDefaultValue(value = this.shutter.value): void {
        Object.keys(this.shutter.modelsValue).forEach((key) => (this.shutter.modelsValue[key] = value));
    }

    appendVideoToHTML(video: HTMLVideoElement): void {
        if (!document.body.contains(video)) {
            document.querySelectorAll(SELECTORS.live_background).forEach((item) => item.remove());
            document.body.appendChild(video);
        }

        video.classList.add(CLASSES.live_background);
    }
}
