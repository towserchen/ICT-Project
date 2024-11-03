import axios from '/node_modules/axios/index.js';

// Call the function after OpenCV is ready
window.onload = function() {
    cv['onRuntimeInitialized'] = async () => {
        // Load the image from a URL
        let imageUrl = '/sample/5.jpg';  // Set image URL for test
        const renderCanvas = document.getElementById('renderCanvas')
        renderCanvas.style.backgroundImage = `url(${imageUrl})`;
        let result = await autoDetectBlindOpenings(imageUrl, false); // change true or false for detection or window or detection on patio. Can change the target canvas too
        console.log(result); 
        console.log(await manualDetectBlindOpenings());

        imageUrl = '/sample/1.jpg';
        renderCanvas.style.backgroundImage = `url(${imageUrl})`;
        result = await autoDetectBlindOpenings(imageUrl, true);
        console.log(result);
        console.log(manualDetectBlindOpenings());
    };
};

// EVERYTHING ABOVE IS FOR TESTING ONLY

let src = undefined;
let globalAIpatio = [];
let image = null;
let file = null;

function scaleCoordinates(originalWidth, originalHeight, canvas, originalCoords) {
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    
    const canvasAspectRatio = canvasWidth / canvasHeight;
    const imageAspectRatio = originalWidth / originalHeight;

    let scaleX, scaleY, offsetX = 0, offsetY = 0;

    if (imageAspectRatio > canvasAspectRatio) { // Image is wider than the canvas, so the height will fit, and it'll have horizontal padding
        scaleX = canvasWidth / originalWidth;
        scaleY = scaleX; // Maintain aspect ratio
        offsetY = (canvasHeight - (originalHeight * scaleY)) / 2;
    } else { // Image is taller than the canvas, so the width will fit, and it'll have vertical padding
        scaleY = canvasHeight / originalHeight;
        scaleX = scaleY; // Maintain aspect ratio
        offsetX = (canvasWidth - (originalWidth * scaleX)) / 2;
    }

    const scaledCoords = [];

    for (let i = 0; i < originalCoords.length; i += 2) {
        const x = originalCoords[i];
        const y = originalCoords[i + 1];

        const scaledX = x * scaleX + offsetX;
        const scaledY = y * scaleY + offsetY;

        scaledCoords.push(scaledX, scaledY);
    }

    return scaledCoords;
};

function unscaleCoordinates(originalWidth, originalHeight, canvas, canvasCoords) {
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    
    const canvasAspectRatio = canvasWidth / canvasHeight;
    const imageAspectRatio = originalWidth / originalHeight;

    let scaleX, scaleY, offsetX = 0, offsetY = 0;

    if (imageAspectRatio > canvasAspectRatio) { // Image is wider than the canvas
        scaleX = canvasWidth / originalWidth;
        scaleY = scaleX;
        offsetY = (canvasHeight - (originalHeight * scaleY)) / 2;
    } else { // Image is taller than the canvas
        scaleY = canvasHeight / originalHeight;
        scaleX = scaleY;
        offsetX = (canvasWidth - (originalWidth * scaleX)) / 2;
    }

    const unscaledCoords = [];

    for (let i = 0; i < canvasCoords.length; i += 2) {
        const x = canvasCoords[i];
        const y = canvasCoords[i + 1];

        // Reverse the scaling and offset to get the original image coordinates
        const unscaledX = (x - offsetX) / scaleX;
        const unscaledY = (y - offsetY) / scaleY;

        unscaledCoords.push(unscaledX, unscaledY);
    }

    return unscaledCoords;
};

let apiUrl = 'https://ziptrak.ddos.la/detect';


/*
* Reset the api url
* 
* @param {string} url
* @return {void}
*/
function setApiUrl(url) {
    apiUrl = url;
}

async function autoDetectBlindOpeningsByAI(file, isWindowDetected, saveProcessedImages) {
    const formData = new FormData();
    
    formData.append('upload_file', file);
    formData.append('is_window_detected', isWindowDetected);
    formData.append('save_processed_images', saveProcessedImages);
    
    try {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });

        if (!response) {
            console.warn('Response failed');
            return false;
        }

        if (response.status != 200) {
            console.warn('Response failed, code=' + response.status);
            return false;
        }

        if (!response.data.hasOwnProperty('coordinate_list')) {
            console.warn('Response failed');
            console.warn(response.data);
            return false;
        }

        return response.data.coordinate_list;
    } catch (error) {
        console.error('Error uploading file', error);
    }
}

async function imageFromURL(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => resolve(img);
        img.onerror = reject;

        img.src = url;
    });
}

/**
 * Detect blind opening from an image
 * 
 * @param {String} imageURL - the URL the uploaded image is stored at (example: blob:https://iv.logissoftware.com/da26a161-a81f-493a-a1c2-27f2790c8d5f)
 * @param {Boolean} detectWindow - Used to tell the AI model if it is trying to detect a window or an outdoor setting (Can be tricky as can't be coupled to outdoor/indoor blinds as an outdoor blind over an external window will trip the model)
 * @param {String} canvas - The ID of the main render canvas. Default 'renderCanvas'
 * @return {Promise<Array<number>>} - A promise that resolves to an array that represents the four corner coordinates of a quad in the form [x1, y1, x2, y2, x3, y3, x4, y4] (clockwise)
 */
async function autoDetectBlindOpenings(imageURL, detectWindow = false, canvas = 'renderCanvas') {
    const response = await fetch(imageURL);
    const blob = await response.blob();
    file = new File([blob], 'userImage.jpg', { type: blob.type }); // construct file for AI detection
    image = await imageFromURL(imageURL); // construct image for opencv detection

    console.log("File: ", file);

    let overlayContainer = document.getElementById('overlayContainer'); // Get the overlay container if it exists
    const renderCanvas = document.getElementById(canvas); // Get the renderCanvas

    // Check if the overlay exists; if not, create it
    let UIelements = {};
    if (!overlayContainer) {
        UIelements = createUIElements(renderCanvas);
    } else {
        UIelements = {overlayContainer: document.getElementById('overlayContainer'),
            overlayCanvas: document.getElementById('overlayCanvas'),
            messageBox: document.getElementById('messageBox'),
            buttonContainer: document.getElementById('buttonContainer'),
            toggleButton: document.getElementById('toggleButton'),
            forText: document.getElementById('forText'),
            locationToggleButton: document.getElementById('locationToggleButton'),
            exitButton: document.getElementById('exitButton'),
            noOpeningsModal: document.getElementById('noOpeningsModal')
        }
        UIelements.locationToggleButton.style.display = 'flex'
        UIelements.toggleButton.style.display = 'flex'
        UIelements.forText.style.display = 'block'
        UIelements.toggleButton.innerText = 'AI Detection'
        styleButton(UIelements.locationToggleButton);
        UIelements.messageBox.innerText = "Didn't find the opening you are looking for? Try";
    }
    
    console.log(UIelements);

    let AIquadsWindow = [];
    let AIquadsPatio = [];
    let runningWindow = false; // Currently running AI detection
    let runningPatio = false;
    let AInothingDetectedWindow = false;
    let AInothingDetectedPatio = false;

    autoDetectQuadsAI(1);
    autoDetectQuadsAI(0);
    function autoDetectQuadsAI(detectWindowValue) {
        if (detectWindowValue === 1) {
            runningWindow = true;
        } else {
            runningPatio = true;
        }

        autoDetectBlindOpeningsByAI(file, detectWindowValue, 0)
        .then(AIcoordinates => {
            if (detectWindowValue === 1) {
                console.log("AI coordinates for window:", AIcoordinates);
                if (AIcoordinates) {
                    let flattenedAIcoords = AIcoordinates.map(quad => quad.flat());
                    console.log("Flat coords for window: ", flattenedAIcoords);
                    AIquadsWindow = flattenedAIcoords;
                    if (AIquadsWindow.length === 0) {
                        AInothingDetectedWindow = true;
                    }
                    else {
                        AInothingDetectedWindow = false;
                    }
                    
                    if (UIelements.toggleButton.innerText === 'Detecting...' && detectWindow) { // for if they click the AI detect button before detection is finshed the first time
                        activeQuads = AIquadsWindow
                        scaleAndDrawQuads(activeQuads, renderCanvas, image);
                        hideLoadingSpinner(UIelements.toggleButton);
                        UIelements.forText.style.display = 'none';
                        UIelements.locationToggleButton.style.display = 'none';
                        if (AInothingDetectedWindow) {
                            UIelements.noOpeningsModal.style.display = 'block';
                        } else {
                            UIelements.noOpeningsModal.style.display = 'none';
                        }                    
                    }
    
                    runningWindow = false;
                } else {
                    console.warn("No coordinates received or an error occurred");
                }

            } else {
                console.log("AI coordinates for patio:", AIcoordinates);
                if (AIcoordinates) {
                    let flattenedAIcoords = AIcoordinates.map(quad => quad.flat());
                    console.log("Flat coords for patio: ", flattenedAIcoords);
                    AIquadsPatio = flattenedAIcoords;
                    if (AIquadsPatio.length === 0) {
                        AInothingDetectedPatio = true;
                        globalAIpatio = null;
                    }
                    else {
                        AInothingDetectedPatio = false;
                        globalAIpatio = flattenedAIcoords;
                    }
                    
                    if (UIelements.toggleButton.innerText === 'Detecting...' && !detectWindow) { // for if they click the AI detect button before detection is finshed the first time
                        activeQuads = AIquadsPatio
                        scaleAndDrawQuads(activeQuads, renderCanvas, image);
                        hideLoadingSpinner(UIelements.toggleButton);
                        UIelements.forText.style.display = 'none';
                        UIelements.locationToggleButton.style.display = 'none';
                        if (AInothingDetectedPatio) {
                            UIelements.noOpeningsModal.style.display = 'block';
                        } else {
                            UIelements.noOpeningsModal.style.display = 'none';
                        }                    
                    }
    
                    runningPatio = false;
                } else {
                    console.warn("No coordinates received or an error occurred");
                }
            }
        })
        .catch(error => {
            console.error("An error occurred:", error);
        });
    }

    let stdNothingDetected = false;
    const stdQuads = autoDetectQuads(image); // Run standard detection
    console.log("standard detected quads: ", stdQuads);
    if (stdQuads.length === 0) {
        stdNothingDetected = true;
        UIelements.noOpeningsModal.style.display = 'block';
    }

    let activeQuads = stdQuads; // currently displayed quads

    scaleAndDrawQuads(activeQuads, renderCanvas, image);
    const onResizeScaleAndDrawQuads = () => scaleAndDrawQuads(activeQuads, renderCanvas, image); // Makes sure quads scale when screen is moved
    window.addEventListener('resize', onResizeScaleAndDrawQuads);

    // Location toggle stuff
    if(detectWindow){
        UIelements.locationToggleButton.innerText = 'Window';
    }

    const onLocationToggleClick = () => {
        if (UIelements.locationToggleButton.innerText === 'Window') {
            detectWindow = false;
            UIelements.locationToggleButton.innerText = 'Patio'
        } else {
            detectWindow = true;
            UIelements.locationToggleButton.innerText = 'Window'
        }
    };
    UIelements.locationToggleButton.addEventListener('click', onLocationToggleClick);

    // Detection method toggle stuff
    const onToggleButtonClick = () => {
        UIelements.overlayCanvas.getContext('2d').clearRect(0, 0, UIelements.overlayCanvas.width, UIelements.overlayCanvas.height);

        if (((detectWindow && AIquadsWindow.length > 0) || (detectWindow && AInothingDetectedWindow))  && UIelements.toggleButton.innerText === 'AI Detection') { // Case for if the AI for window has completed and switch TO AI from std. Also if AI for window has complete but nothing is detected
            activeQuads = AIquadsWindow
            UIelements.toggleButton.innerText = 'Standard Detection';
            UIelements.forText.style.display = 'none';
            UIelements.locationToggleButton.style.display = 'none';
            if (AInothingDetectedWindow) {
                UIelements.noOpeningsModal.style.display = 'block';
            } else {
                UIelements.noOpeningsModal.style.display = 'none';
            }
        } else if (((!detectWindow && AIquadsPatio.length > 0) || (!detectWindow && AInothingDetectedPatio))  && UIelements.toggleButton.innerText === 'AI Detection') { // // Case for if the AI for patio has completed and switch TO AI from std. Also if AI for patio has complete but nothing is detected
            activeQuads = AIquadsPatio
            UIelements.toggleButton.innerText = 'Standard Detection';
            UIelements.forText.style.display = 'none';
            UIelements.locationToggleButton.style.display = 'none';
            if (AInothingDetectedPatio) {
                UIelements.noOpeningsModal.style.display = 'block';
            } else {
                UIelements.noOpeningsModal.style.display = 'none';
            }
        } else if ( ((detectWindow && runningWindow) || (!detectWindow && runningPatio)) && (UIelements.toggleButton.innerText === 'AI Detection' || UIelements.toggleButton.innerText === 'Detecting...')) { // Case for if the AI hasn't completed and switch from std to AI
            showLoadingSpinner(UIelements.toggleButton);
            UIelements.locationToggleButton.disabled = true;
            UIelements.locationToggleButton.style.backgroundColor = '#d3d3d3';
            UIelements.locationToggleButton.style.color = '#7d7d7d';
            UIelements.locationToggleButton.style.borderColor = '#d3d3d3';
            UIelements.locationToggleButton.style.cursor = 'not-allowed';
        } else { // Case for if AI has completed and switching TO std from AI
            activeQuads = stdQuads;
            if (stdNothingDetected) {
                UIelements.noOpeningsModal.style.display = 'block';
            } else {
                UIelements.noOpeningsModal.style.display = 'none';
            }
            UIelements.toggleButton.innerText = 'AI Detection';
            UIelements.locationToggleButton.disabled = false;
            UIelements.locationToggleButton.style.backgroundColor = 'rgb(243, 202, 62)';
            UIelements.locationToggleButton.style.color = 'rgb(22, 65, 108)';
            UIelements.locationToggleButton.style.borderColor = 'rgb(243, 202, 62)';
            UIelements.locationToggleButton.style.cursor = 'pointer';
            UIelements.forText.style.display = 'block';
            UIelements.locationToggleButton.style.display = 'block';
        }

        scaleAndDrawQuads(activeQuads, renderCanvas, image);
    };
    UIelements.toggleButton.addEventListener('click', onToggleButtonClick);

    // Make the overlay visible
    UIelements.overlayContainer.style.display = 'block';

    return new Promise((resolve) => {
        const onExitClick = () => {
            UIelements.exitButton.removeEventListener('click', onExitClick);
            UIelements.overlayCanvas.removeEventListener('click', onCanvasClick);
            window.removeEventListener('resize', onResizeScaleAndDrawQuads);
            UIelements.locationToggleButton.removeEventListener('click', onLocationToggleClick);
            UIelements.toggleButton.removeEventListener('click', onToggleButtonClick);
            UIelements.overlayContainer.style.display = 'none';
            resolve([]);
        }
        const onCanvasClick = (event) => {
            let scaledQuads = [];
            for (let quad of activeQuads) {
                let scaledQuad = scaleCoordinates(image.width, image.height, renderCanvas, quad);
                scaledQuads.push(scaledQuad);
            }

            const clickedQuad = detectClickedQuad(event, scaledQuads);
            if (clickedQuad) {
                UIelements.overlayContainer.style.display = 'none';
                UIelements.overlayCanvas.removeEventListener('click', onCanvasClick);  // Clean up event listener
                UIelements.exitButton.removeEventListener('click', onExitClick);
                window.removeEventListener('resize', onResizeScaleAndDrawQuads);
                UIelements.locationToggleButton.removeEventListener('click', onLocationToggleClick);
                UIelements.toggleButton.removeEventListener('click', onToggleButtonClick);
                resolve(clickedQuad);  // Return the clicked quad NOTE: these are scaled !!!!
            }
        };

        UIelements.exitButton.addEventListener('click', onExitClick);
        UIelements.overlayCanvas.addEventListener('click', onCanvasClick);
    });
};

function showLoadingSpinner(button) {
    button.innerText = 'Detecting...';
    const spinner = document.createElement('img');
    spinner.src = './Spinner.svg';
    spinner.style.width = '25px';
    spinner.style.height = '25px';
    spinner.style.marginLeft = '10px';
    spinner.classList.add('spinner'); // Adding a class in case you want to remove it later
    button.appendChild(spinner);
};

function hideLoadingSpinner(button) {
    button.innerText = 'Standard Detection'
    const spinner = button.querySelector('.spinner');
    if (spinner) spinner.remove();
};

function scaleAndDrawQuads(quads, renderCanvas, image){
    let scaledQuads = [];
    for (let quad of quads) {
        let scaledQuad = scaleCoordinates(image.width, image.height, renderCanvas, quad);
        scaledQuads.push(scaledQuad);
    }

    drawQuadsOnOverlay(scaledQuads);
};

function createUIElements(renderCanvas) {
    // Create the container div
    const overlayContainer = document.createElement('div');
    overlayContainer.id = 'overlayContainer';
    overlayContainer.style.position = 'absolute';
    overlayContainer.style.top = renderCanvas.offsetTop + 'px';
    overlayContainer.style.left = renderCanvas.offsetLeft + 'px';
    overlayContainer.style.zIndex = '10';
    overlayContainer.style.display = 'none';
    
    //create the overlayCanvas
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'overlayCanvas';
    overlayCanvas.width = renderCanvas.offsetWidth;
    overlayCanvas.height = renderCanvas.offsetHeight;
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.width = '100%';
    overlayCanvas.style.height = '100%';
    overlayCanvas.style.pointerEvents = 'auto';
    overlayCanvas.style.backgroundColor = 'white';
    overlayCanvas.style.opacity = '0.6';
    overlayContainer.appendChild(overlayCanvas);

    resizeOverlayContainer(overlayContainer, overlayCanvas, renderCanvas);

    // Create the message text box above the toggle button
    const messageBox = document.createElement('div');
    messageBox.id = 'messageBox';
    messageBox.innerText = "Didn't find the opening you are looking for? Try";
    messageBox.style.position = 'relative';
    messageBox.style.top = '20px';
    messageBox.style.width = '100%';
    messageBox.style.textAlign = 'center';
    messageBox.style.fontFamily = 'Roboto, sans-serif';
    messageBox.style.fontSize = '16px';
    messageBox.style.fontWeight = '400';
    messageBox.style.marginBottom = '20px';
    overlayContainer.appendChild(messageBox);

    // Create a container for the toggle buttons and the "for:" text
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'buttonContainer';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.alignItems = 'center';
    buttonContainer.style.position = 'relative';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.top = '10px';

    // Create the toggle button and center it
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggleButton';
    toggleButton.innerText = 'AI detection';
    styleButton(toggleButton);
    buttonContainer.appendChild(toggleButton);

    // Text box that says "for:"
    const forText = document.createElement('span');
    forText.id = 'forText'
    forText.innerText = 'for:';
    forText.style.fontFamily = "'Roboto', sans-serif";
    forText.style.fontWeight = '400';
    forText.style.fontSize = '16px';
    forText.style.color = '#16416C';
    forText.style.marginRight = '10px';
    forText.style.marginLeft = '10px';
    buttonContainer.appendChild(forText);

    // Toggle button for "Window" / "Patio"
    const locationToggleButton = document.createElement('button');
    locationToggleButton.id = 'locationToggleButton'
    locationToggleButton.innerText = 'Patio';
    locationToggleButton.value = 0;
    styleButton(locationToggleButton);
    buttonContainer.appendChild(locationToggleButton);
    
    overlayContainer.appendChild(buttonContainer);

    // Create the exit button
    const exitButton = document.createElement('button');
    exitButton.id = 'exitButton';
    exitButton.style.position = 'absolute';
    exitButton.style.top = '10px';
    exitButton.style.right = '10px';
    exitButton.style.width = '30px';
    exitButton.style.height = '30px';
    exitButton.style.border = 'none';
    exitButton.style.background = 'transparent';
    exitButton.style.cursor = 'pointer';
    exitButton.style.backgroundImage = 'url("./Exit.svg")';
    exitButton.style.backgroundSize = 'contain';
    exitButton.style.backgroundRepeat = 'no-repeat';
    exitButton.style.backgroundPosition = 'center';
    
    overlayContainer.appendChild(exitButton);

    // Modal for "No Openings Detected" message
    const modal = document.createElement('div');
    modal.id = 'noOpeningsModal';
    modal.innerText = 'No Openings Detected';
    modal.style.position = 'absolute';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '300px';
    modal.style.height = '60px';
    modal.style.padding = '20px';
    modal.style.paddingTop = '16px';
    modal.style.paddingBottom = '20px';
    modal.style.paddingLeft = '20px';
    modal.style.paddingRight = '20px';
    modal.style.backgroundColor = '#ffffff';
    modal.style.border = '2px solid red';
    modal.style.borderRadius = '6px';
    modal.style.boxShadow = 'rgba(0, 0, 0, 0.05) -2px -2px 10px 0px, rgba(0, 0, 0, 0.05) 2px 2px 10px 0px';
    modal.style.boxSizing = 'border-box';
    modal.style.color = 'rgb(85, 85, 85)';
    modal.style.fontFamily = 'Roboto, sans-serif';
    modal.style.fontSize = '16px';
    modal.style.fontWeight = '400';
    modal.style.textAlign = 'center';
    modal.style.lineHeight = '24px';
    modal.style.overflowX = 'hidden';
    modal.style.overflowY = 'hidden';
    modal.style.pointerEvents = 'auto';
    modal.style.unicodeBidi = 'isolate';
    modal.style.textSizeAdjust = '100%';
    modal.style.webkitTapHighlightColor = 'rgba(0, 0, 0, 0)';
    modal.style.display = 'none';
    overlayContainer.appendChild(modal);

    // Append the overlay canvas to the same parent as the renderCanvas
    renderCanvas.parentNode.appendChild(overlayContainer);

    // Ensure it resizes correctly when the window is resized
    const onResizeOverlayContainer = () => resizeOverlayContainer(overlayContainer, overlayCanvas, renderCanvas);
    window.addEventListener('resize', onResizeOverlayContainer);

    return {
        overlayContainer: overlayContainer,
        overlayCanvas: overlayCanvas,
        messageBox: messageBox,
        buttonContainer: buttonContainer,
        toggleButton: toggleButton,
        forText: forText,
        locationToggleButton: locationToggleButton,
        exitButton: exitButton,
        noOpeningsModal: modal        
    };
};

function resizeOverlayContainer(overlayContainer, overlayCanvas, renderCanvas) {
    renderCanvas.width = renderCanvas.clientWidth; // Ensure the internal canvas size matches the CSS size
    renderCanvas.height = renderCanvas.clientHeight;

    overlayContainer.style.top = renderCanvas.offsetTop + 'px';
    overlayContainer.style.left = renderCanvas.offsetLeft + 'px';
    overlayContainer.style.width = renderCanvas.offsetWidth + 'px';
    overlayContainer.style.height = renderCanvas.offsetHeight + 'px';
    overlayContainer.width = renderCanvas.width;
    overlayContainer.height = renderCanvas.height;

    overlayCanvas.width = renderCanvas.offsetWidth;
    overlayCanvas.height = renderCanvas.offsetHeight;
};

function styleButton(button) {
    const fontStyle = document.createElement('style');
    fontStyle.innerText = `
        @font-face {
            font-family: 'Roboto';
            font-weight: 500;
            font-style: normal;
            src: url('./fonts/Roboto-Medium.woff2') format('woff2');
        }
        @font-face {
            font-family: 'Roboto';
            font-weight: 400; /* Normal weight */
            font-style: normal;
            src: url('./fonts/Roboto-Regular.woff2') format('woff2');
        }
    `;
    document.head.appendChild(fontStyle);

    // Set button display and layout styles
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer';

    // Set appearance and box model
    button.style.appearance = 'button';
    button.style.boxSizing = 'border-box';

    // Set background properties
    button.style.backgroundColor = 'rgb(243, 202, 62)';
    button.style.backgroundImage = 'none';
    button.style.backgroundClip = 'border-box';
    button.style.backgroundOrigin = 'padding-box';
    button.style.backgroundAttachment = 'scroll';
    button.style.backgroundPosition = '0% 0%';
    button.style.backgroundRepeat = 'repeat';
    button.style.backgroundSize = 'auto';

    // Set border properties
    button.style.borderTopWidth = '1px';
    button.style.borderTopStyle = 'solid';
    button.style.borderTopColor = 'rgb(243, 202, 62)';
    button.style.borderBottomWidth = '1px';
    button.style.borderBottomStyle = 'solid';
    button.style.borderBottomColor = 'rgb(243, 202, 62)';
    button.style.borderLeftWidth = '1px';
    button.style.borderLeftStyle = 'solid';
    button.style.borderLeftColor = 'rgb(243, 202, 62)';
    button.style.borderRightWidth = '1px';
    button.style.borderRightStyle = 'solid';
    button.style.borderRightColor = 'rgb(243, 202, 62)';
    button.style.borderRadius = '100px';

    // Set color and text properties
    button.style.color = 'rgb(22, 65, 108)';
    button.style.fontFamily = 'Roboto, sans-serif';
    button.style.fontSize = '16px';
    button.style.fontWeight = '500';
    button.style.textTransform = 'capitalize';
    button.style.textAlign = 'center';
    button.style.textRendering = 'auto';
    button.style.textShadow = 'none';
    button.style.lineHeight = '24px';
    button.style.letterSpacing = 'normal';
    button.style.wordSpacing = '0px';
    button.style.whiteSpace = 'nowrap';

    // Set padding and margin
    button.style.paddingTop = '7px';
    button.style.paddingBottom = '7px';
    button.style.paddingLeft = '14px';
    button.style.paddingRight = '14px';
    button.style.margin = '0px';

    // Set size properties
    button.style.width = 'calc((100% - 10px) / 7)';
    button.style.minWidth = '175px';
    button.style.height = 'auto';

    // Additional font and layout-related properties for full compatibility
    button.style.fontKerning = 'auto';
    button.style.fontFeatureSettings = 'normal';
    button.style.fontOpticalSizing = 'auto';
    button.style.fontStretch = '100%';
    button.style.fontVariantAlternates = 'normal';
    button.style.fontVariantCaps = 'normal';
    button.style.fontVariantEastAsian = 'normal';
    button.style.fontVariantLigatures = 'normal';
    button.style.fontVariantNumeric = 'normal';
    button.style.fontVariantPosition = 'normal';
    button.style.fontVariationSettings = 'normal';
    button.style.fontSizeAdjust = 'none';
    button.style.textSizeAdjust = '100%';
    button.style.overflowX = 'visible';
    button.style.overflowY = 'visible';

    // Reset inherited user-agent styles that might differ
    button.style.webkitTapHighlightColor = 'rgba(0, 0, 0, 0)';
    button.style.textIndent = '0px';
    button.style.textWrapMode = 'nowrap';
    button.style.whiteSpaceCollapse = 'collapse';
    button.style.direction = 'ltr';

    button.addEventListener('mouseenter', () => {
        if (!button.disabled) {
            button.style.backgroundColor = 'rgb(245, 190, 9)';
            toggleButton.style.borderColor = 'rgb(245, 190, 9)';
        }        
    });
    
    button.addEventListener('mouseleave', () => {
        if (!button.disabled) {
            button.style.backgroundColor = 'rgb(243, 202, 62)';
            button.style.borderColor = 'rgb(243, 202, 62)';
        }
    });
}

function drawQuadsOnOverlay(quads) {
    const overlayCanvas = document.getElementById('overlayCanvas');
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    console.log("quads to draw: ", quads);

    quads.forEach(quad => { // Draw each detected quad
        ctx.beginPath();
        ctx.moveTo(quad[0], quad[1]);
        ctx.lineTo(quad[2], quad[3]);
        ctx.lineTo(quad[4], quad[5]);
        ctx.lineTo(quad[6], quad[7]);        
        ctx.closePath();
        ctx.stroke();
    });

    console.log("attempted to draw quads");
};

// Helper function to check which quad was clicked
function detectClickedQuad(event, quads) {
    const x = event.offsetX;
    const y = event.offsetY;

    let clickedQuads = [];

    for (let quad of quads) {
        if (isPointInQuad(x, y, quad)) {
            clickedQuads.push(quad);
        }
    }

    if (clickedQuads.length === 0) {
        return null;
    }

    // If only one quad was clicked, return it
    if (clickedQuads.length === 1) {
        return clickedQuads[0];
    }

    // If multiple quads were clicked, find and return the smallest one
    return getSmallestQuad(clickedQuads);
};

// Function to get the smallest quad by calculating the area
function getSmallestQuad(quads) {
    let smallestQuad = quads[0];
    let smallestArea = calculateQuadArea(smallestQuad);

    for (let i = 1; i < quads.length; i++) {
        const area = calculateQuadArea(quads[i]);
        if (area < smallestArea) {
            smallestArea = area;
            smallestQuad = quads[i];
        }
    }

    return smallestQuad;
};

// Function to calculate the area of a quadrilateral using the Shoelace formula
function calculateQuadArea(quad) {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = quad;

    return Math.abs( // Shoelace formula to calculate the area of a quadrilateral
        (x1 * y2 + x2 * y3 + x3 * y4 + x4 * y1) -
        (y1 * x2 + y2 * x3 + y3 * x4 + y4 * x1)
    ) / 2;
};

// Function to check if a point (x, y) is inside a quad (using Ray-Casting Algorithm)
function isPointInQuad(px, py, quad) {
    const polygon = [
        { x: quad[0], y: quad[1] },
        { x: quad[2], y: quad[3] },
        { x: quad[4], y: quad[5] },
        { x: quad[6], y: quad[7] }
        
    ];

    // Ray-Casting Algorithm to check if point is in polygon
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        //console.log("index: ", i, " (px,py): ", px,",", py, " (xi,yi): ", xi, ",", yi, " (xj,yj): ", xj, ",", yj,"isInside currently: ", isInside, "Between Ys: ", (yi > py) !== (yj > py), "Less than the X intersect: ", px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
        //console.log("new isInside: ", isInside);
    }

    return isInside;
};

function autoDetectQuads(image) {
    src = cv.imread(image); // Read the image as a cv.Mat

    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert the image to grayscale

    let blurred = new cv.Mat();
    let ksize = new cv.Size(7, 7)
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise and improve edge detection

    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 100, 250, 5, true); // Detect edges using Canny Algorithm

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // Find contours

    let contourSpecs = []; // area, perimeter etc.

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        let perimeter = cv.arcLength(contour, false);
        let boundingBox = cv.boundingRect(contour);
        contourSpecs.push({ index: i, area: area, boundingBox: boundingBox, perimeter: perimeter });
    }

    // sort by area
    contourSpecs.sort((a, b) => b.area - a.area);

    let contourSizeSpecs = [];

    let sizeFilteredContours = new cv.MatVector();
    let minArea = 0;
    let minPerimeter = 300; // this should be a proportion of the photo size not a static arbitrary
    for (let i = 0; i < contourSpecs.length; i++) { // Loop over all contours
        let contour = contourSpecs[i];

        if(contour.perimeter > minPerimeter && contour.area > minArea) {
            contourSizeSpecs.push(contour);
            sizeFilteredContours.push_back(contours.get(contour.index));
        }
    }

    let approx = new cv.MatVector();
    let approxPrecise = new cv.MatVector();
    for (let i = 0; i < sizeFilteredContours.size(); i++) {
        let tmp1 = new cv.Mat();
        let tmp2 = new cv.Mat();
        cv.approxPolyDP(sizeFilteredContours.get(i), tmp1, 0.01 * cv.arcLength(sizeFilteredContours.get(i), false), false); // Approximate the contour with a polygon
        cv.approxPolyDP(sizeFilteredContours.get(i), tmp2, 0.002 * cv.arcLength(sizeFilteredContours.get(i), false), false);

        approx.push_back(tmp1);
        tmp1.delete();
        approxPrecise.push_back(tmp2);
        tmp2.delete();
    }

    let contourCornerSpecs = [];
    let cornerFilteredContours = new cv.MatVector();

    for (let i = 0; i < sizeFilteredContours.size(); i++) {
        if((approx.get(i).rows === 5 || approx.get(i).rows === 4) && approxPrecise.get(i).rows < 10) {
            contourCornerSpecs.push(contourSizeSpecs[i]);
            cornerFilteredContours.push_back(sizeFilteredContours.get(i));
        }
    }

    function isContourClosed(contour, threshold = 10) {
        // Get the first and last points of the contour
        let firstPoint = contour.data32S.slice(0, 2);  // First point [x, y]
        let lastPoint = contour.data32S.slice(-2);     // Last point [x, y]
    
        // Calculate the Euclidean distance between the first and last points
        let distance = Math.sqrt(
            Math.pow(firstPoint[0] - lastPoint[0], 2) + 
            Math.pow(firstPoint[1] - lastPoint[1], 2)
        );

        // Check if the distance is within the threshold (default 10 pixels)
        if (distance <= threshold && cv.contourArea(contour) >= cv.arcLength(contour, false)) {
            return true;  // The contour is considered closed
        }

        // If the distance is greater than the threshold, check for x or y coordinate match
        if ((firstPoint[0] === lastPoint[0] || firstPoint[1] === lastPoint[1]) && cv.contourArea(contour) >= cv.arcLength(contour, false)) {
            return true;  // The contour is considered closed if x or y coordinates match
        }

        // If neither condition is met, the contour is considered open
        return false;
    }
    
    let contourClosedSpecs = [];
    let closedContours = new cv.MatVector();
    for (let i = 0; i < cornerFilteredContours.size(); i++) {
        if(isContourClosed(cornerFilteredContours.get(i))) {
            contourClosedSpecs.push(contourCornerSpecs[i]);
            closedContours.push_back(cornerFilteredContours.get(i));
        }
    }

    function boundingBoxIntersect(rectA, rectB) {
        return !(rectA.x > rectB.x + rectB.width ||
                 rectA.x + rectA.width < rectB.x ||
                 rectA.y > rectB.y + rectB.height ||
                 rectA.y + rectA.height < rectB.y);
    }
    
    function pointProximityCheck(contourA, contourB, threshold = 1) {
        for (let i = 0; i < contourA.rows; i++) {
            let pointA = contourA.data32S.slice(i * 2, i * 2 + 2);  // Get point [x, y] from contourA
            for (let j = 0; j < contourB.rows; j++) {
                let pointB = contourB.data32S.slice(j * 2, j * 2 + 2);  // Get point [x, y] from contourB
                // Check if points are within the threshold (±1 for x or y)
                if (Math.abs(pointA[0] - pointB[0]) <= threshold && Math.abs(pointA[1] - pointB[1]) <= threshold) {
                    return true;  // Points are close enough
                }
            }
        }
        return false;  // No points are close enough
    }
    
    function filterContours(matVector, contourClosedSpecs) {
        let n = matVector.size();
        let toKeep = new cv.MatVector();
        let keptIndices = [];  // List to store the original indices of the kept contours
        let visited = new Array(n).fill(false);  // Track visited contours
    
        // Iterate over contours
        for (let i = 0; i < n; i++) {
            if (visited[i]) continue;
            
            let contourA = matVector.get(i);
            let boundingRectA = cv.boundingRect(contourA);
            visited[i] = true;
            let collisionGroup = [contourA];
            let collisionGroupIndices = [contourClosedSpecs[i].index];  // Start with the current index
    
            // Check for nearby or colliding contours
            for (let j = i + 1; j < n; j++) {
                if (visited[j]) continue;
                
                let contourB = matVector.get(j);
                let boundingRectB = cv.boundingRect(contourB);
    
                // Check if bounding boxes intersect
                if (boundingBoxIntersect(boundingRectA, boundingRectB)) {
                    // If bounding boxes intersect, check point proximity
                    if (pointProximityCheck(contourA, contourB)) {
                        collisionGroup.push(contourB);
                        collisionGroupIndices.push(contourClosedSpecs[j].index);  // Record the original index
                        visited[j] = true;
                    }
                }
            }
    
            // Keep the largest contour from the collision group
            if (collisionGroup.length > 1) {
                let largestContour = findLargestContour(collisionGroup);
                toKeep.push_back(largestContour);
    
                // Find the index of the largest contour in the collision group and store it
                let largestIndex = findLargestContourIndex(collisionGroup, collisionGroupIndices, matVector);
                keptIndices.push(largestIndex);  // Store the original index
            } else {
                toKeep.push_back(contourA);  // No collision, keep this contour
                keptIndices.push(contourClosedSpecs[i].index);  // Store the original index
            }
        }
        
        let returns = [toKeep, keptIndices];
        return returns;
    }
    
    // Helper function to find the index of the largest contour in the collision group
    function findLargestContourIndex(collisionGroup, collisionGroupIndices, matVector) {
        let largestArea = 0;
        let largestIndex = -1;
    
        for (let i = 0; i < collisionGroup.length; i++) {
            let area = cv.contourArea(collisionGroup[i]);
            if (area > largestArea) {
                largestArea = area;
                largestIndex = collisionGroupIndices[i];  // Get the corresponding original index
            }
        }
    
        return largestIndex;
    }
    
    // Helper function to find the largest contour by area
    function findLargestContour(group) {
        let largestContour = group[0];
        let largestArea = cv.contourArea(largestContour);
        
        for (let i = 1; i < group.length; i++) {
            let area = cv.contourArea(group[i]);
            if (area > largestArea) {
                largestArea = area;
                largestContour = group[i];
            }
        }
        return largestContour;
    }


    let temp = filterContours(closedContours, contourClosedSpecs);
    let finalContours = temp[0];
    let finalIndices = temp[1];

    function extractQuadrilateralCorners(contour, angleThreshold = 30, distanceThreshold = 25) { // NOTE: currently will return outer bound because of find extreme method
        const points = contour.data32S;
        const corners = [];
    
        // Convert the contour points into an array of {x, y}
        const contourPoints = [];
        for (let i = 0; i < points.length; i += 2) {
            contourPoints.push({ x: points[i], y: points[i + 1] });
        }
    
        // Helper function to calculate angle between three points (A-B-C)
        function calculateAngle(A, B, C) {
            const AB = { x: B.x - A.x, y: B.y - A.y };
            const BC = { x: C.x - B.x, y: C.y - B.y };
            const dotProduct = AB.x * BC.x + AB.y * BC.y;
            const magnitudeAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
            const magnitudeBC = Math.sqrt(BC.x * BC.x + BC.y * BC.y);
            const angle = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
            return (angle * 180) / Math.PI; // Convert to degrees
        }
    
        // Detect potential corners based on the angle threshold
        for (let i = 0; i < contourPoints.length; i++) {
            const A = contourPoints[(i - 1 + contourPoints.length) % contourPoints.length];
            const B = contourPoints[i];
            const C = contourPoints[(i + 1) % contourPoints.length];
    
            const angle = calculateAngle(A, B, C);
            if (angle > angleThreshold) {
                corners.push(B);
            }
        }
    
        // Cluster nearby points using the distance threshold and classify them
        const clusteredCorners = [];
        const visited = new Array(corners.length).fill(false);
    
        function distance(point1, point2) {
            return Math.sqrt(
                Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
            );
        }
    
        for (let i = 0; i < corners.length; i++) {
            if (visited[i]) continue;
    
            const cluster = [corners[i]];
            visited[i] = true;
    
            for (let j = i + 1; j < corners.length; j++) {
                if (!visited[j] && distance(corners[i], corners[j]) < distanceThreshold) {
                    cluster.push(corners[j]);
                    visited[j] = true;
                }
            }
    
            clusteredCorners.push(cluster);
        }
    
        // Function to find the most extreme point for a given cluster and corner type
        function findExtremePoint(cluster, type) {
            if (type === 'top-left') {
                let extreme = {x: Infinity, y: Infinity};
                for (let i = 0; i < cluster.length; i++) {
                    if (cluster[i].x < extreme.x) {
                        extreme.x = cluster[i].x;
                    }
                    if (cluster[i].y < extreme.y) {
                        extreme.y = cluster[i].y;
                    }
                }
                return extreme;
            } else if (type === 'top-right') {
                let extreme = {x: -Infinity, y: Infinity};
                for (let i = 0; i < cluster.length; i++) {
                    if (cluster[i].x > extreme.x) {
                        extreme.x = cluster[i].x;
                    }
                    if (cluster[i].y < extreme.y) {
                        extreme.y = cluster[i].y;
                    }
                }
                return extreme;
            } else if (type === 'bottom-left') {
                let extreme = {x: Infinity, y: -Infinity};
                for (let i = 0; i < cluster.length; i++) {
                    if (cluster[i].x < extreme.x) {
                        extreme.x = cluster[i].x;
                    }
                    if (cluster[i].y > extreme.y) {
                        extreme.y = cluster[i].y;
                    }
                }
                return extreme;
            } else if (type === 'bottom-right') {
                let extreme = {x: -Infinity, y: -Infinity};
                for (let i = 0; i < cluster.length; i++) {
                    if (cluster[i].x > extreme.x) {
                        extreme.x = cluster[i].x;
                    }
                    if (cluster[i].y > extreme.y) {
                        extreme.y = cluster[i].y;
                    }
                }
                return extreme;
            }
        }
    
        // Classify clusters into each corner type and find the extreme point for each
        const cornerPoints = {
            'top-left': { x: Infinity, y: Infinity },
            'top-right': { x: -Infinity, y: Infinity },
            'bottom-left': { x: Infinity, y: -Infinity },
            'bottom-right': { x: -Infinity, y: -Infinity },
        };
    
        clusteredCorners.forEach(cluster => {
            const center = cluster.reduce(
                (acc, point) => ({
                    x: acc.x + point.x / cluster.length,
                    y: acc.y + point.y / cluster.length,
                }),
                { x: 0, y: 0 }
            );
    
            // Compare and assign the cluster with the most extreme values to the respective corners
            if (center.x <= cornerPoints['top-left'].x && center.y <= cornerPoints['top-left'].y) {
                cornerPoints['top-left'] = findExtremePoint(cluster, 'top-left');
            } else if (center.x + center.y < cornerPoints['top-left'].x + cornerPoints['top-left'].y) {
                cornerPoints['top-left'] = findExtremePoint(cluster, 'top-left');
            }
            if (center.x >= cornerPoints['top-right'].x && center.y <= cornerPoints['top-right'].y) {
                cornerPoints['top-right'] = findExtremePoint(cluster, 'top-right');
            } else if (center.x - center.y > cornerPoints['top-right'].x - cornerPoints['top-right'].y) {
                cornerPoints['top-right'] = findExtremePoint(cluster, 'top-right');
            }
            if (center.x <= cornerPoints['bottom-left'].x && center.y >= cornerPoints['bottom-left'].y) {
                cornerPoints['bottom-left'] = findExtremePoint(cluster, 'bottom-left');
            } else if (center.y - center.x > cornerPoints['bottom-left'].y - cornerPoints['bottom-left'].x) {
                cornerPoints['bottom-left'] = findExtremePoint(cluster, 'bottom-left');
            }
            if (center.x >= cornerPoints['bottom-right'].x && center.y >= cornerPoints['bottom-right'].y) {
                cornerPoints['bottom-right'] = findExtremePoint(cluster, 'bottom-right');
            } else if (center.x + center.y > cornerPoints['bottom-right'].x + cornerPoints['bottom-right'].y) {
                cornerPoints['bottom-right'] = findExtremePoint(cluster, 'bottom-right');
            }
        });
    
        // Extract the identified corner points
        const identifiedCorners = [
            cornerPoints['top-left'],
            cornerPoints['top-right'],
            cornerPoints['bottom-right'],
            cornerPoints['bottom-left']
        ];
    
        // Filter out any undefined points in case a corner wasn't detected
        return identifiedCorners.filter(point => point !== null);
    }

    let coordinates = []

    for (let i = 0; i < finalContours.size(); i++) {

        let contour = finalContours.get(i);
        
        let approxPrecise = new cv.Mat();
        cv.approxPolyDP(contour, approxPrecise, 0.0008 * cv.arcLength(sizeFilteredContours.get(i), false), false); // Approximate the contour with a polygon

        let corners = extractQuadrilateralCorners(approxPrecise);
        temp = []
        for (let j = 0; j < corners.length; j++) {
            temp.push(corners[j].x);
            temp.push(corners[j].y);
        }

        coordinates.push(temp);
    }

    return coordinates;
};

async function manualDetectBlindOpenings(canvas = 'renderCanvas') { // heavily assumed that AutoDetect has been run before this. Will not work atm if it hasn't
    if (globalAIpatio !== null && globalAIpatio.length === 0) {
        let AIcoordinates = await autoDetectBlindOpeningsByAI(file, 0, 0)
        let flattenedAIcoords = AIcoordinates.map(quad => quad.flat());
        globalAIpatio = flattenedAIcoords;
    }

    let overlayContainer = document.getElementById('overlayContainer');
    let overlayCanvas = document.getElementById('overlayCanvas');
    let buttonContainer = document.getElementById('buttonContainer');
    let toggleButton = document.getElementById('toggleButton');
    let locationToggleButton = document.getElementById('locationToggleButton');
    let forText = document.getElementById('forText');
    let messageBox = document.getElementById('messageBox');
    let exitButton = document.getElementById('exitButton');
    const renderCanvas = document.getElementById(canvas); // Get the renderCanvas

    const ctx = overlayCanvas.getContext('2d'); // need here or later !!!!
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    toggleButton.style.display = 'none';
    locationToggleButton.style.display = 'none';
    forText.style.display = 'none';
    messageBox.innerText = "Select the four corner of the opening you want";

    let resetButton = document.getElementById('resetButton')
    if (!resetButton) {
        resetButton = document.createElement('button');
        resetButton.id = 'resetButton';
        resetButton.innerText = 'reset';
        styleButton(resetButton);
        buttonContainer.appendChild(resetButton);
    } else {
        resetButton.style.display = 'block'
    }

    // Make the overlay visible
    overlayContainer.style.display = 'block';
    
    let userCoordinates = []; // Array to store the coordinates
    let unscaleUserCoordinates = [];
    let quad = [];

    function handleClick(event) {
        // Calculate the scale based on the canvas dimensions and the original image dimensions
        const canvasWidth = overlayCanvas.clientWidth;
        const canvasHeight = overlayCanvas.clientHeight;
        const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
        const scaledDiameter = 50 * scale; // Scaled diameter for the circle


        // Get the click coordinates relative to the canvas
        const rect = overlayCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Append the coordinates to the array
        userCoordinates.push(x);
        userCoordinates.push(y);
        console.log(`Click ${userCoordinates.length}: (${x}, ${y})`);

        unscaleUserCoordinates = unscaleCoordinates(image.width, image.height, renderCanvas, userCoordinates);

        // Draw a translucent circle at the click location
        ctx.beginPath();
        ctx.arc(x, y, scaledDiameter / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'; // Blue with 30% opacity
        ctx.fill();
        ctx.closePath();

        // Check if we have collected four coordinates
        if (userCoordinates.length === 8) {
            console.log('Collected four coordinates:', userCoordinates);
            // Remove the event listener after four clicks
            overlayCanvas.removeEventListener('click', handleClick);
            userCoordinates = unscaleCoordinates(image.width, image.height, overlayCanvas, userCoordinates);
            console.log('unscaled coordinates:', userCoordinates);
            quad = findQuadFromCoordinates(userCoordinates, globalAIpatio);
            console.log('returned quad: ', quad);
            let scaledQuad = scaleCoordinates(image.width, image.height, overlayCanvas, quad);
            console.log('rescaled quad: ', scaledQuad);
            drawQuadsOnOverlay([scaledQuad]); // janky
        }
    }
    overlayCanvas.addEventListener('click', handleClick);

    // Function to scale coordinates and redraw
    function handleResize() {
        // Clear the canvas
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        // Calculate the scale based on the new canvas dimensions
        const canvasWidth = overlayCanvas.clientWidth;
        const canvasHeight = overlayCanvas.clientHeight;
        const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
        const scaledDiameter = 50 * scale; // Scaled diameter for the circle

        // Scale userCoordinates
        userCoordinates = scaleCoordinates(image.width, image.height, renderCanvas, unscaleUserCoordinates);

        if (userCoordinates.length < 8) {
            // Redraw circles if userCoordinates has fewer than 8 points
            for (let i = 0; i < userCoordinates.length; i += 2) {
                const x = userCoordinates[i];
                const y = userCoordinates[i + 1];
                ctx.beginPath();
                ctx.arc(x, y, scaledDiameter / 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'; // Translucent blue
                ctx.fill();
                ctx.closePath();
            };
        } else if (userCoordinates.length === 8) {
            let scaledQuad = scaleCoordinates(image.width, image.height, overlayCanvas, quad);
            drawQuadsOnOverlay([scaledQuad]); // janky
        }
    }
    window.addEventListener('resize', handleResize);

    function reset() {
        userCoordinates = [];
        quad = [];
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCanvas.removeEventListener('click', handleClick); // use in case
        overlayCanvas.addEventListener('click', handleClick);
    }
    resetButton.addEventListener('click', reset);

    // Make the overlay visible
    overlayContainer.style.display = 'block';

    return new Promise((resolve) => {
        const onExitClick = () => {
            exitButton.removeEventListener('click', onExitClick);
            overlayCanvas.removeEventListener('click', onCanvasClick);
            resetButton.removeEventListener('click', reset);
            window.removeEventListener('resize', handleResize);
            overlayCanvas.removeEventListener('click', handleClick);
            resetButton.style.display = 'none'
            overlayContainer.style.display = 'none';
            resolve([]);
        }
        const onCanvasClick = (event) => {
            if (quad.length > 0) {
                let scaledQuad = scaleCoordinates(image.width, image.height, renderCanvas, quad);
                const clickedQuad = detectClickedQuad(event, [scaledQuad]);
                if (clickedQuad) {
                    resetButton.style.display = 'none'
                    overlayContainer.style.display = 'none';
                    overlayCanvas.removeEventListener('click', onCanvasClick);  // Clean up event listener
                    exitButton.removeEventListener('click', onExitClick);
                    resetButton.removeEventListener('click', reset);
                    window.removeEventListener('resize', handleResize);
                    overlayCanvas.removeEventListener('click', handleClick);
                    resolve(clickedQuad);  // Return the clicked quad NOTE: these are scaled !!!!
                }
            }
        };

        exitButton.addEventListener('click', onExitClick);
        overlayCanvas.addEventListener('click', onCanvasClick);
    });
}

function findQuadFromCoordinates(userCoordinates, AIcoords) {
    let clickPoints = []; // Store coordinates of the 4 boxes
  
    // Parse user input to create boxes based on coordinates
    for (let i = 0; i < userCoordinates.length; i += 2) {
        let x = userCoordinates[i];
        let y = userCoordinates[i + 1];
    
        const boxSize = 50;
        const halfBox = boxSize / 2;
    
        // Store the click point and box boundaries
        let box = {
            x: x - halfBox,
            y: y - halfBox,
            width: boxSize,
            height: boxSize,
            topLeft: { x: x - halfBox, y: y - halfBox },
            bottomRight: { x: x + halfBox, y: y + halfBox },
            center: { x, y }
        };
    
        clickPoints.push(box);
    }
  
    // Detect edges and lines in the global src image using OpenCV
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert to grayscale
  
    let blurred = new cv.Mat();
    let ksize = new cv.Size(7, 7);
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur
  
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 250, 3, true); // Detect edges using Canny
  
    let lines = new cv.Mat();
    cv.HoughLines(edges, lines, 1, Math.PI / 180, 150); // Detect lines using Hough transform
  
    // Store line parameters
    let allLines = [];
    for (let i = 0; i < lines.rows; i++) {
      let rho = lines.data32F[i * 2];       // Distance from the origin
      let theta = lines.data32F[i * 2 + 1]; // Angle in radians
      allLines.push({ rho, theta });
    }

    // Identify the bottom two boxes by their y position
    let bottomBoxes = getBottomTwoBoxes(clickPoints);
    bottomBoxes = [...bottomBoxes].sort((a, b) => a.x - b.x);

    let topBoxes = getTopTwoBoxes(clickPoints);
    topBoxes = [...topBoxes].sort((a, b) => a.x - b.x);
  
    // Filter the lines based on box intersections
    let filteredLines = allLines.filter((line) => doesLineIntersectTwoBoxes(line, clickPoints));
    
    // process the bottom 2 boxes
    filteredLines.push(processBottomBoxes(bottomBoxes));

    // Detect intersections between filtered lines
    let intersections = findLineIntersections(filteredLines, clickPoints);
  
    let outermostIntersections = getOutermostIntersections(intersections, topBoxes, bottomBoxes);
      
    // Create an array to store the result: [x1, y1, x2, y2, ...] for outermost intersections and bottom box centers
    let result = [];

    // Add the outermost intersections to the result array
    result.push(
      outermostIntersections.topLeft.x, outermostIntersections.topLeft.y,
      outermostIntersections.topRight.x, outermostIntersections.topRight.y,
      outermostIntersections.bottomRight.x, outermostIntersections.bottomRight.y,
      outermostIntersections.bottomLeft.x, outermostIntersections.bottomLeft.y
      
    );
  
    // Clean up
    gray.delete();
    blurred.delete();
    edges.delete();
    lines.delete();
  
    // Return the result array
    return result;
};
  
// Function to get the bottom two boxes based on their vertical position (y-coordinate)
function getBottomTwoBoxes(boxes) {
    // Sort boxes by the y-coordinate (center of the box)
    let sortedBoxes = [...boxes].sort((a, b) => b.center.y - a.center.y);
    return sortedBoxes.slice(0, 2); // Return the two boxes with the largest y values
};

function getTopTwoBoxes(boxes) {
    // Sort boxes by the y-coordinate (bottom of the box)
    let sortedBoxes = [...boxes].sort((a, b) => b.y - a.y);
    return sortedBoxes.slice(2, 4); // Return the two boxes with the lowest y values
};

// Function to process the bottom two boxes
function processBottomBoxes(bottomBoxes) {
    let srcCopy = src.clone();
    cv.cvtColor(srcCopy, srcCopy, cv.COLOR_RGBA2GRAY);
    let blank = new cv.Mat(srcCopy.rows, srcCopy.cols, cv.CV_8UC1, new cv.Scalar(0, 0, 0, 255)); // Black image

    for (let i = 0; i < bottomBoxes.length; i++){
        let x1 = bottomBoxes[i].topLeft.x;
        let y1 = bottomBoxes[i].topLeft.y;
        let x2 = bottomBoxes[i].bottomRight.x;
        let y2 = bottomBoxes[i].bottomRight.y;

        console.log(`ROI Coordinates: (${x1}, ${y1}), (${x2}, ${y2})`);
        console.log(`ROI Size: Width = ${x2 - x1}, Height = ${y2 - y1}`);

        if (x2 - x1 <= 0 || y2 - y1 <= 0) {
            console.error('Invalid ROI size. Check the coordinates.');
        }

        let roi = new cv.Rect(x1, y1, x2 - x1, y2 - y1);
        let srcRoi = srcCopy.roi(roi);

        let ksize = new cv.Size(7, 7)
        cv.GaussianBlur(srcRoi, srcRoi, ksize, 0, 0, cv.BORDER_DEFAULT); // Apply Gaussian blur to reduce noise and improve edge detection

        cv.Canny(srcRoi, srcRoi, 100, 250, 5, true);

        let blankRoi = blank.roi(roi); // Create the ROI on the blank image
        srcRoi.copyTo(blankRoi);       // Copy the ROI from the source to the corresponding blank region

        srcRoi.delete();
        blankRoi.delete();
    }
    
    // Perform Hough Line Transform
    let lines = new cv.Mat();
    cv.HoughLines(blank, lines, 1, Math.PI / 180, 30);

    console.log(lines);

    cv.cvtColor(blank, blank, cv.COLOR_GRAY2RGBA); // Not sure this is needed anymore

    // Define the center points of both bottom boxes
    let box1Center = {
        x: (bottomBoxes[0].topLeft.x + bottomBoxes[0].bottomRight.x) / 2,
        y: (bottomBoxes[0].topLeft.y + bottomBoxes[0].bottomRight.y) / 2
    };
    let box2Center = {
        x: (bottomBoxes[1].topLeft.x + bottomBoxes[1].bottomRight.x) / 2,
        y: (bottomBoxes[1].topLeft.y + bottomBoxes[1].bottomRight.y) / 2
    };

    // Filter the lines that go through both bottom boxes
    let filteredLines = [];
    for (let i = 0; i < lines.rows; i++) {
        let rho = lines.data32F[i * 2];
        let theta = lines.data32F[i * 2 + 1];
        let line = { rho, theta };

        if (doesLineIntersectTwoBoxes(line, bottomBoxes)) {
        filteredLines.push(line);
        }
    }

    let bestLine = null;
    let minTotalDifference = Infinity;  // Start with a high value

    // Loop through each line and calculate its y-value at the x-values of the two box centers
    for (let i = 0; i < filteredLines.length; i++) {
        let rho = filteredLines[i].rho;  // Distance from the origin to the line
        let theta = filteredLines[i].theta;  // Angle of the line

        // Calculate the y-value of the line for box1's and box2's center x-coordinates
        let yAtBox1Center = calculateYForX(rho, theta, box1Center.x);
        let yAtBox2Center = calculateYForX(rho, theta, box2Center.x);

        // Calculate the total difference between the line's y-values and the box centers' y-values
        let totalDifference = Math.abs(yAtBox1Center - box1Center.y) + Math.abs(yAtBox2Center - box2Center.y);

        // If this line has a smaller total difference, it's closer to both box centers
        if (totalDifference < minTotalDifference) {
            minTotalDifference = totalDifference;
            bestLine = { rho, theta };  // Keep track of the best line
        }
    }    

    // Clean up memory
    lines.delete();
    srcCopy.delete();
    blank.delete();

    return bestLine;
};

// Helper function to calculate the y-coordinate for a given x on the line
function calculateYForX(rho, theta, x) {
    let a = Math.cos(theta);
    let b = Math.sin(theta);
    let y = (rho - x * a) / b;
    return y;
};
  
// Function to check if a line intersects two boxes
function doesLineIntersectTwoBoxes(line, boxes) {
    let intersections = 0;
    boxes.forEach((box) => {
        if (lineIntersectsBox(line, box)) {
        intersections++;
        }
    });
    return intersections >= 2; // Line must intersect at least two boxes
};
  
// Function to check if a line intersects a single box
function lineIntersectsBox(line, box) {
    // Convert line's rho and theta to two points
    let rho = line.rho;
    let theta = line.theta;
    let a = Math.cos(theta);
    let b = Math.sin(theta);
    let x0 = a * rho;
    let y0 = b * rho;
    let scale = 2500; // Scale factor to extend the lines
  
    // Line points
    let x1 = Math.round(x0 + scale * (-b));
    let y1 = Math.round(y0 + scale * a);
    let x2 = Math.round(x0 - scale * (-b));
    let y2 = Math.round(y0 - scale * a);
  
    // Check if the line intersects the box
    return lineIntersectsRect(x1, y1, x2, y2, box.topLeft.x, box.topLeft.y, box.bottomRight.x, box.bottomRight.y);
};
  
// Function to check line-rectangle intersection
function lineIntersectsRect(x1, y1, x2, y2, left, top, right, bottom) {
    return (
      lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||  // Top edge
      lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) ||  // Bottom edge
      lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom) ||  // Left edge
      lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom)    // Right edge
    );
};
  
// Function to check if two lines intersect
function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    function ccw(px1, py1, px2, py2, px3, py3) {
      return (py3 - py1) * (px2 - px1) > (py2 - py1) * (px3 - px1);
    }
    return (
      ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
      ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
    );
};
  
// Function to find intersections between lines
function findLineIntersections(lines, boxes) {
    let intersections = [];
    for (let box of boxes) {
        let intersect = false
        for (let i = 0; i < lines.length - 1; i++) {
            for (let j = i + 1; j < lines.length; j++) {
                let intersection = getLineIntersection(lines[i], lines[j]);
                if (intersection && isPointInBox(intersection, box)) {
                    intersections.push(intersection);
                    intersect = true;
                }
            }
        }

        if (!intersect) {
            intersections.push(box.center);
        }
    }
    return intersections;
};
  
// Function to get the intersection of two lines (if exists)
function getLineIntersection(line1, line2) {
    let rho1 = line1.rho, theta1 = line1.theta;
    let rho2 = line2.rho, theta2 = line2.theta;
  
    let a1 = Math.cos(theta1), b1 = Math.sin(theta1);
    let a2 = Math.cos(theta2), b2 = Math.sin(theta2);
  
    let determinant = a1 * b2 - a2 * b1;
  
    if (Math.abs(determinant) < 1e-10) {
      return null; // Lines are parallel, no intersection
    }
  
    let x = (b2 * rho1 - b1 * rho2) / determinant;
    let y = (a1 * rho2 - a2 * rho1) / determinant;
  
    return { x, y };
};
  
// Function to check if a point is inside a box
function isPointInBox(point, box) {
    return (
        point.x >= box.topLeft.x &&
        point.x <= box.bottomRight.x &&
        point.y >= box.topLeft.y &&
        point.y <= box.bottomRight.y
    );
};

// Function to find the outermost intersections
function getOutermostIntersections(intersections, topBoxes, bottomBoxes) {
    if (intersections.length === 0) {
        return {
            topLeft: { x: 0, y: 0 },
            topRight: { x: 0, y: 0 },
            bottomLeft: { x: 0, y: 0 },
            bottomRight: { x: 0, y: 0 }
        };
    }

    let outermostIntersections = {
        topLeft: null,
        topRight: null,
        bottomLeft: null,
        bottomRight: null
    };

    intersections.forEach((point) => {
        if (isPointInBox(point, topBoxes[0])) {
            if (!outermostIntersections.topLeft || 
                (point.x <= outermostIntersections.topLeft.x && point.y <= outermostIntersections.topLeft.y)) {
            outermostIntersections.topLeft = point;
            }
        }
    
        if (isPointInBox(point, topBoxes[1])) {
            console.log(point);
            if (!outermostIntersections.topRight || 
                (point.x >= outermostIntersections.topRight.x - 1 && point.y <= outermostIntersections.topRight.y)) {
            outermostIntersections.topRight = point;
            }
        }
        
        if (isPointInBox(point, bottomBoxes[0])) {
            if (!outermostIntersections.bottomLeft || 
                (point.x <= outermostIntersections.bottomLeft.x && point.y >= outermostIntersections.bottomLeft.y)) {
            outermostIntersections.bottomLeft = point;
            }
        }
        
        if (isPointInBox(point, bottomBoxes[1])) {
            if (!outermostIntersections.bottomRight || 
                (point.x >= outermostIntersections.bottomRight.x && point.y >= outermostIntersections.bottomRight.y)) {
            outermostIntersections.bottomRight = point;
            }
        }
    });

    // If no valid intersection is found for any quadrant, set it to default {x: 0, y: 0}
    Object.keys(outermostIntersections).forEach(key => {
        if (!outermostIntersections[key]) {
            outermostIntersections[key] = { x: 0, y: 0 }; // Default if no intersection is found
        }
    });

    return outermostIntersections;
};