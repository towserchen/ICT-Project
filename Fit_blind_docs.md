# Fitting Blind Model to Quadrilateral System
**Documentation**

---

## Contents
- [Key Terms](#key-terms)
- [Fitting Functions](#fitting-functions)
  - [fitModelToQuad](#fitmodeltoquad)
  - [getViewportSizeAtDepth](#getviewportsizeatdepth)
  - [optimiseRotationCLR](#optimiserotationclr)
  - [optimiseRotationCTB](#optimiserotationctb)
  - [setOptimise](#setoptimise)
  - [setReverseRotationTrue](#setreverserotationtrue)
  - [setreverseRotationFalse](#setreverserotationfalse)
  - [finalZRotation](#finalzrotation)
  - [adjustYscaling](#adjustyscaling)
  - [adjustXscaling](#adjustxscaling)
  - [scaleFromOneSide](#scalefromoneside)
  - [getProjectedCorners](#getprojectedcorners)
  - [getModelBabCorners](#getmodelbabcorners)
  - [getDimensions](#getdimensions)
- [Utility Functions (Util.service)](#utility-functions-utilservice)
  - [getQuadCenter](#getquadcenter)
  - [scaleToBabylonSpace](#scaletobabylonspace)
  - [calculateAngleBetweenLines](#calculateanglebetweenlines)
  - [getMidpoint](#getmidpoint)
  - [getPlaneLineIntersection](#getplanelineintersection)
  - [getLineLength](#getlinelength)
- [Testing Functions (To be removed later)](#testing-functions-to-be-removed-later)
  - [testFittingAlgo](#testfittingalgo)

---
## Key Terms
- **Model:** Throughout this documentation, references to rotating or scaling the "model" specifically refer to transformations applied to the `boundingBox` mesh. This mesh encapsulates the model’s `root mesh`, meaning all transformations affect the bounding box rather than the root mesh directly. 
- **Quad:** Short for quadrilateral, referring to a detected blind opening represented by four corner coordinates. "Quad" and "opening" may be used interchangeably.
- **Diff:** Abbreviation for "difference," referring to the difference in inclination between a side of the model and the corresponding side of the quad. For example, "top diff" refers to the inclination difference between the top of the model and the top of the quad.
- **Converge:** In this context, "converge" refers to minimising the difference between a pair of diffs (e.g., top diff and bottom diff or left diff and right diff) until they are equal (or below a tolerance). The remaining difference between them is referred to as the "error."
- **Total Error:** The sum of a pair of diffs (e.g., top diff + bottom diff) when attempting to converge them. It represents how far the corresponding sides of the model and the quad are from being perfectly aligned.
- **Relative Inclination:** The angle of inclination of a side of the model compared to its corresponding side on the quad. For example if the top inclination of the model is higher than the top inclination of the quad than the top has a positive relative inclination. If the top inclination of the model is lower than the top inclination of the quad than it has a negative relative inclination.
- **Babylon world space:** The coordinate system that babylon.js uses in relation to the world origin. It uses a more or less arbitary scale and originates from the centre of the scene (The scale is technically metres I think but may as well be arbitary for our purposes).
- **Babylon local space:** The coordinate system that babylon.js uses in relation to the origin of the model. May be referred to as just "local space" or "local coordinates". (Technically these are never used in this system but for some cases it is better to refer to them as such)
- **Screen space:** The coordiante system that DOM elements such as the `renderCanvas` use. Is in pixel and originates from the top left. 

---

## Fitting Functions

---
### fitModelToQuad
#### fitModelToQuad( *rawCoords* )

This function is the entry point of the fitting system and governs the fitting process. The fitting process follows these steps:
1. **Z-Axis Rotation Adjustment** – If the quad has significant Z rotation, optimises the model’s Z rotation to converge the top and bottom diffs while minimising the total error.
2. **Height Adjustment** – Scales the model’s height to match the quad.
3. **Y-Axis Rotation Adjustment** – Optimises the Y rotation to converge the top and bottom diffs while ensuring both sides have the same inclination trend (both have either positive or negative relative inclinations).
4. **Final Z-Axis Rotation Adjustment** – Ensures the model’s top inclination matches the quad’s top inclination, fully aligning the top and bottom edges.
5. **Width Adjustment** – Scales the model’s width to match the quad.
6. **X-Axis Rotation Adjustment** – Optimizes the X rotation to converge the left and right diffs while minimising total error.
7. **Final Height Adjustment** – Re-scales the model’s height to compensate for the X rotation's effect on the perceived height.

#### Parameters
- **rawCoords:** An array representing the corner coordinates of a detected opening, scaled to screen space. Format:  `[x1, y1, x2, y2, x3, y3, x4, y4]` (Coordinates follow a clockwise order starting from the top-left.)

#### Returns
- **None** - Directly manipulates the model.

#### Exceptions
- **Currently throws: None**
- **Future: TBA** - May desire an exception to be thrown so that it can be caught by the calling code in order to display something to the UI to tell the user the fitting failed.
- **Internal Exception Handling:** This function **catches** any exceptions thrown during the fitting process. These may occur if the quad has **impossible geometry** that prevents a valid fit or if the process **fails to find rotational convergence** within a reasonable time. If an exception is caught, the function will handle it internally, preventing crashes or hangs and but will reset the model to the default.

---
### getViewportSizeAtDepth
#### getViewportSizeAtDepth()
Calculates the size of the viewport at the depth of the camera's radius in babylon world units.

#### Parameters
- **None**

#### Returns
- An object with the following properties:
  - **width** (`number`) - The width of the viewport in babylon world units.
  - **height** (`number`) - The height of the viewport in babylon world units.

---

### optimiseRotationCLR
#### optimiseRotationCLR( *coords, axis, clockwiseRotation* )
Rotates the model on the specified axis for **C**onvergence of **L**eft and **R**ight diff (CLR).

- Ensures convergence occurs near zero total error rather than at a local minima where the left and right diffs are equal but total error is high.
- **Note:** Currently optimised for X-axis rotation (can be easily adapted for Z-axis as well).

#### Parameters
- **coords:** The quad’s screen-space corner coordinates. 
Expects format: 
  ```json
  [
    {x: x1, y: y1},
    {x: x2, y: y2},
    {x: x3, y: y3},
    {x: x4, y: y4}
  ]
  ```
  - Coordinates follow a clockwise order starting from the top-left.
- **axis:** Axis for rotation (`BABYLON.Axis.X` or `.Z`).
- **clockwiseRotation:** `boolean` – Rotation direction.

#### Returns
- **None** - Directly manipulates the model.

#### Exceptions
- Throws an error if an acceptable **convergence isn't found** within **3 reversal cycles** (i.e. forwards, backwards and forwards again)

---

### optimiseRotationCTB
#### optimiseRotationCTB( *coords, axis, clockwiseRotation, topInclination, bottomInclination* )
Rotates the model on the specified axis for **C**onvergence of **T**op and **B**ottom diff (CTB).
- Ensures convergence occurs near zero total error rather than at a local minima where the top and bottom diffs are equal but total error is high.
- **Note:** Only applicable for Y- and Z-axis rotations.

#### Parameters
- **coords:** The quad’s screen-space corner coordinates.
Expects format: 
  ```json
  [
    {x: x1, y: y1},
    {x: x2, y: y2},
    {x: x3, y: y3},
    {x: x4, y: y4}
  ]
  ```
    - Coordinates follow a clockwise order starting from the top-left.
- **axis:** Rotation axis (`BABYLON.Axis.Y` or `.Z`).
- **clockwiseRotation:** `boolean` – Rotation direction.
- **topInclination:** `number` – Quad top side inclination in degrees.
- **bottomInclination:** `number` – Quad bottom side inclination in degrees.

#### Returns
- **None** - Directly manipulates the model.

#### Exceptions
- Throws an error if an acceptable **convergence isn't found** within **1000 iterations**.

---

### setOptimise
#### setOptimise( *optimise, axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination* )
- Used by `optimiseRotationCTB` to determine if it should begin optimising for convergence yet.
- Contains conditions for Y- and Z-axis rotations.

#### Parameters
- **optimise:** `boolen` - For if `optimiseRotationCTB` is currently in the optimise state or not.
- **axis:** Rotation axis (`BABYLON.Axis.Y` or `.Z`).
- **clockwiseRotation:** `boolen` - Represents the direction of rotation
- **topModelInclination:** `number` - Model top side inclination in degrees.
- **topInclination:** `number` – Quad top side inclination in degrees.
- **bottomModelInclination:** `number` - Model bottom side inclination in degrees.
- **bottomInclination:** `number` – Quad bottom side inclination in degrees.

#### Returns
- **`boolen`** - updated optimisation state for `optimiseRotationCTB`.

---

### setReverseRotationTrue
#### setReverseRotationTrue( *axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination* )
- Used by `optimiseRotationCTB` to check whether it has rotated the model too far and should reverse direction to achieve better alignment.
- Contains conditions for Y- and Z-axis rotations.

#### Parameters
- **axis:** Rotation axis (`BABYLON.Axis.Y` or `.Z`).
- **clockwiseRotation:** `boolean` – Rotation direction.
- **topModelInclination:** `number` - Model top side inclination in degrees.
- **topInclination:** `number` – Quad top side inclination in degrees.
- **bottomModelInclination:** `number` - Model bottom side inclination in degrees.
- **bottomInclination:** `number` – Quad bottom side inclination in degrees.

#### Returns
- An object with the following properties:
  - **reverse** (`boolen`) - Whether to reverse rotation.
  - **smaller** (`string`) - If rotation should be reversed, the side with the smaller diff. Possible values `'top'` or `'bottom'`

---

### setReverseRotationFalse
#### setReverseRotationFalse( *smaller, topDiff, bottomDiff* )
- Used by `optimiseRotationCTB` when rotation is reversed to check if rotation should be un-reversed

#### Parameters
- **smaller:** The side of the model that had a smaller diff when rotation was original reversed.
- **topDiff:** The top diff. Used to evaluate if the smaller diff is still smaller or not.
- **bottomDiff:** the bottom diff. Used to evalate if the smaller diff is still smaller or not.

#### Returns
- **`boolean`** - Whether to reverse rotation. `true` means the reversed rotation continues, `false` means the rotation is un-reversed.

---

### finalZRotation
#### finalZRotation( *coords, topInclination* )
- Adjusts the model’s rotation along the Z-axis to align the top and bottom edges with the quad. 
- Intended to be the final Z-axis adjustment.

#### **Parameters**
- **coords:** The quad’s screen-space corner coordinates.
Expects format: 
  ```json
  [
    {x: x1, y: y1},
    {x: x2, y: y2},
    {x: x3, y: y3},
    {x: x4, y: y4}
  ]
  ```
    - Coordinates follow a clockwise order starting from the top-left.
- **topInclination**: `number` – The inclination angle in degrees of the quads top edge.

#### Returns
- **None** - Directly manipulates the model.

---

### adjustYscaling
#### adjustYscaling( *babCoords* )
Calculates the difference in height visually between the model and opening and calls functions to change the scaling of the model to match.

#### Parameters
- **babCoords:** The corner coordinates of the quad in babylon world space. 
Expects format: 
  ```json
  [
    {x: x1, y: y1, z: z1},
    {x: x2, y: y2, z: z2},
    {x: x3, y: y3, z: z3},
    {x: x4, y: y4, z: z4}
  ]
  ```
    - Coordinates follow a clockwise order starting from the top-left.

#### Returns
- **None** - Manipulates the model (through use of other functions)

---

### adjustXscaling
#### adjustXscaling( *babCoords* )
Calculates the difference in width visually between the model and opening and calls functions to change the scaling of the model to match.

#### Parameters
- **babCoords:** The corner coordinates of the quad in babylon world space. 
Expects format: 
  ```json
  [
    {x: x1, y: y1, z: z1},
    {x: x2, y: y2, z: z2},
    {x: x3, y: y3, z: z3},
    {x: x4, y: y4, z: z4}
  ]
  ```
    - Coordinates follow a clockwise order starting from the top-left.

#### Returns
- **None** - Manipulates the model (through use of other functions)

---

### scaleFromOneSide
#### scaleFromOneSide( *distance, scaleAxis, direction* )
- Adjusts the size of the model by scaling it along a specified axis and direction. 
- This function simulates the behavior of manually dragging the gizmo to resize the model.

#### Parameters
- **distance:** `number` - The amount by which the model should be scaled. Positive values increase the size, while negative values decrease it.
- **scaleAxis:** The model's local axis along which scaling occurs (`BABYLON.Axis.Y` or `.Z`).
- **direction:** `scaleDirection` – Defines the scaling direction. Accepts `scaleDirection.positive` or `scaleDirection.negative`, corresponding to the positive or negative direction of the coordinate system.

#### **Returns**
- **None** - Directly manipulates the model’s scaling along the specified axis and direction.

---

### getProjectedCorners
#### getProjectedCorners( *rotationQuaternion = this.boundingBox.rotationQuaternion* )
Computes the screen-space coordinates of the model's corners as seen from the user's perspective for a given rotation.

#### Parameters
- **rotationQuaternion:** `BABYLON.Quaternion` – The rotation for which the projection will be calculated. Defaults to the model’s current rotation.

#### Returns
- **projectedCorners:** An array of `BABYLON.Vector3` objects representing the projected screen-space coordinates of the model’s corners. For clarity can be thought of as:
  ```json
  [
    {x: x1, y: y1, z: z1},
    {x: x2, y: y2, z: z2},
    {x: x3, y: y3, z: z3},
    {x: x4, y: y4, z: z4}
  ]
  ```
  - **Coordinates are in an anti-clockwise direction starting at the top right.** _(This is a development artifact and will be standardized in a future update.)_
  - **Note:**
    - `.x` and `.y` represent the actual screen-space coordinates.
    - `.z` represents the depth value, indicating whether the point is within the camera frustum (`0 < z < 1`). This value is not used in calculations.

---

### getModelBabCorners
#### getModelBabCorners( *rotationQuaternion* )
Computes the Babylon.js world-space coordinates of the model's corners for a given rotation.

#### Parameters
- **rotationQuaternion:** `BABYLON.Quaternion` – The rotation for which the world-space coordinates will be computed.

#### Returns
- **rotatedCorners:** An array of `BABYLON.Vector3` objects representing the world-space coordinates of the model’s corners. For clarity can be thought of as:
  ```json
  [
    {x: x1, y: y1, z: z1},
    {x: x2, y: y2, z: z2},
    {x: x3, y: y3, z: z3},
    {x: x4, y: y4, z: z4}
  ]
  ```
  - **Coordinates are in an anti-clockwise direction starting at the top right.** _(This is a development artifact and will be standardized in a future update.)_

---
### getDimensions
#### getDimensions()
Retrieves the model’s local bounding box, providing the minimum and maximum values for each axis (`X`, `Y`, and `Z`). These values define the model’s overall dimensions and local corner coordinates.

#### Parameters
- **None**

#### Returns
- An object with the following properties:
  - **localMin** (`{x: , y: , z: }`): The mimimum `X` `Y` `Z` value of the model.
  - **localMax** (`{x: , y: , z: }`): The maximum `X` `Y` `Z` value of the model.

---

## Utility Functions (Util.service)

---

### getQuadCenter
#### getQuadCenter( *p1, p2, p3, p4* )
Computes the center point of a quadrilateral in 3D space by determining the intersection of its diagonals.

#### Parameters
- **p1:** `{x: x1, y: y1, z: z1}` – First corner of the quad.
- **p2:** `{x: x2, y: y2, z: z2}` – Second corner of the quad.
- **p3:** `{x: x3, y: y3, z: z3}` – Third corner of the quad.
- **p4:** `{x: x4, y: y4, z: z4}` – Fourth corner of the quad.

#### Returns
- An object representing the center point of the quad:
  ```json
  {
    x: centerX,
    y: centerY,
    z: centerZ
  }

#### Exceptions
- Throws an error if the diagonals are **parallel**, meaning no unique center can be determined.

---
### scaleToBabylonSpace
#### scaleToBabylonSpace( *cornerCoords, imageWidth, imageHeight, viewportWidth, viewportHeight* )
Converts a set of screen-space coordinates (DOM pixel values) into Babylon world space coordinates, mapping them to the viewport.

- **Swaps the X and Z axes**, assuming `camera.alpha = Math.PI`
- **Inverts Y** to match Babylon’s coordinate system, where positive Y is up.

#### Parameters
- **cornerCoords:** `Array<number>` – A **flat array** of screen-space corner coordinates.
  - Format: `[x1, y1, x2, y2, x3, y3, x4, y4]`
  - Coordinates follow a **clockwise order starting from the top-left**.
- **imageWidth:** `number` – The width of the source image in pixels.
- **imageHeight:** `number` – The height of the source image in pixels.
- **viewportWidth:** `number` – The width of the Babylon viewport in **Babylon world units**.
- **viewportHeight:** `number` – The height of the Babylon viewport in **Babylon world units**.

#### Returns
- An **array of objects**, where each object represents a **Babylon world-space coordinate**:
  ```json
  [
    { x: 0, y: babylonY1, z: babylonX1 },
    { x: 0, y: babylonY2, z: babylonX2 },
    { x: 0, y: babylonY3, z: babylonX3 },
    { x: 0, y: babylonY4, z: babylonX4 }
  ]

---
### calculateAngleBetweenLines
#### calculateAngleBetweenLines( *p1, p2, q1, q2* )
Calculates the **angle** (in degrees) between two **2D lines** using the dot product formula.

#### Parameters
- **p1:** `{x: px1, y: py1}` – First point of the first line.
- **p2:** `{x: px2, y: py2}` – Second point of the first line.
- **q1:** `{x: qx1, y: qy1}` – First point of the second line.
- **q2:** `{x: qx2, y: qx2}` – Second point of the second line.

#### Returns
- **`number`** – The angle between the two lines in **degrees** (Will always return a positive number).

#### Exceptions
- Throws an error if either line has **zero lenght**

---
### getMidpoint
#### getMidpoint( *point1, point2* )
Computes the **midpoint** between two points.

#### Parameters
Inputs can be `BABYLON.Vector3`
- **point1:** `{x: x1, y: y1, z: z1}` – First point.
- **point2:** `{x: x2, y: y2, z: z2}` – Second point.

#### Returns
- An object representing the **midpoint**:
  ```json
  {
    x: midpointX,
    y: midpointY,
    z: midpointZ
  }

---
### getPlaneLineIntersection
#### getPlaneLineIntersection( *planePoint1, planePoint2, planePoint3, linePoint1, linePoint2* )
Computes the **intersection point** between a **plane** (defined by three points) and a **line** (defined by two points) in 3D space.

#### Parameters
Inputs can be `BABYLON.Vector3`
- **planePoint1:** `{x: px1, y: py1, z: pz1}` – First point on the plane.
- **planePoint2:** `{x: px2, y: py2, z: pz2}` – Second point on the plane.
- **planePoint3:** `{x: px3, y: py3, z: pz3}` – Third point on the plane.
- **linePoint1:** `{x: qx1, y: qy1, z: qz1}` – First point of the line.
- **linePoint2:** `{x: qx2, y: qy2, z: qz2}` – Second point of the line.

#### Returns
- An object representing the **intersection point**:
  ```json
  {
    x: intersectionX,
    y: intersectionY,
    z: intersectionZ
  }

#### Exceptions
- Throws an error if the line is **parallel to the plane** or **lies within it**, meaning there is no unique intersection

---
### getLineLength
#### getLineLength( *point1, point2* )
Calculates the **Euclidean distance** (length) between two points in 3D space.



#### Parameters
Inputs can be `BABYLON.Vector3`
- **point1:** `{x: x1, y: y1, z: z1}` – First point.
- **point2:** `{x: x2, y: y2, z: z2}` – Second point.

#### Returns
- **`number`** – The **distance** between `point1` and `point2`.

---

## Testing Functions (To be removed later)

---

### testFittingAlgo
#### testFittingAlgo()
A temporary testing function for evaluating the fitting system by allowing users to manually select quadrilateral corners.

#### **Usage:**
1. Press the **'T'** key to enter test mode after the model has loaded.
2. Click four corners of an opening in the following order:
   - **Top-left corner**
   - **Top-right corner**
   - **Bottom-right corner**
   - **Bottom-left corner**
3. Repeat for additional quadrilaterals if wanted.
4. Press **'T'** again to exit test mode.

#### **Behavior:**
- While in test mode, the system records mouse clicks and displays a visual overlay.
- Once four points are selected, a quadrilateral is drawn, and `fitModelToQuad` is called.
- If the fitting process fails, the model resets to its default position, and an error message is logged in the console.
- The overlay is removed when exiting test mode.

#### **Limitations:**
- This is a temporary test function with some quirks.
- The click order **must** follow the pattern above, or the fitting process will not work.

#### Parameters
- **None**

#### **Returns:**
- **None** – Overlays test visuals on the canvas.

---

#### *End Document*