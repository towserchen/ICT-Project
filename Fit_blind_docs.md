# Fitting Blind Model to Quadrilateral System
**Documentation**

---

## Contents
- [Key Terms](#key-terms)
- [Fitting Functions (in order of appearance)](#fitting-functions)
  - [fitModelToQuad](#fitmodeltoquad-rawcoords-)
  - [getViewportSizeAtDepth](#getviewportsizeatdepth)
  - [optimiseRotationCLR](#optimiserotationclr-coords-axis-clockwiserotation-leftinclination-rightinclination-)
  - [optimiseRotationCTB](#optimiserotationctb-coords-axis-clockwiserotation-topinclination-bottominclination-)
  - [setOptimise](#setoptimise-optimise-axis-clockwiserotation-topmodelinclination-topinclination-bottommodelinclination-bottominclination-)
  - [setReverseRotation](#setreverserotation-axis-clockwiserotation-topmodelinclination-topinclination-bottommodelinclination-bottominclination-)
  - [adjustYscaling](#adjustyscaling-babcoords-)
  - [adjustXscaling](#adjustxscaling-babcoords-)
  - [scaleFromOneSide](#scalefromoneside-distance-scaleaxis-direction-)
  - [getProjectedCorners](#getprojectedcorners-rotationquaternion--thisboundingboxrotationquaternion-)
  - [getModelBabCorners](#getmodelbabcorners-rotationquaternion-)
  - [getDimensions](#getdimensions)
- [Utility Functions (Util.service)](#utility-functions-utilservice)

---
## Key Terms
- **Quad:** Short for quadrilateral, referring to a detected blind opening represented by four corner coordinates. "Quad" and "opening" may be used interchangeably.
- **Diff:** Abbreviation for "difference," referring to the difference in inclination between a side of the model and the corresponding side of the quad. For example, "top diff" refers to the inclination difference between the top of the model and the top of the quad.
- **Converge:** In this context, "converge" refers to minimising the difference between a pair of diffs (e.g., top diff and bottom diff or left diff and right diff) until they are equal (or below a tolerance). The remaining difference between them is referred to as the "error."
- **Total Error:** The sum of a pair of diffs (e.g., top diff + bottom diff) when attempting to converge them. It represents how far the corresponding sides of the model and the quad are from being perfectly aligned.
- **Relative Inclination:** The angle of inclination of a side of the model compared to its corresponding side on the quad. For example if the top inclination of the model is higher than the top inclination of the quad than the top has a positive relative inclination. If the top inclination of the model is lower than the top inclination of the quad than it has a negative relative inclination.
- **Babylon world space:** The coordinate system that babylon.js uses in relation to the world origin. It uses a more or less arbitary scale and originates from the centre of the scene (The scale is technically metres I think but may as well be arbitary for our purposes).
- **Babylon local space:** The coordinate system that babylon.js uses in relation to the origin of the model. May be referred to as just "local space" or "local coordinates". (Technically these are never used in this system but for some cases it is better to refer to them as such)
- **Screen space** The coordiante system that DOM elements such as the `renderCanvas` use. Is in pixel and originates from the top left. 

---

## Fitting Functions

---

### fitModelToQuad( *rawCoords* )

This function is the entry point of the fitting system and governs the fitting process. The fitting process follows these steps:
1. **Z-Axis Rotation Adjustment** – If the quad has significant Z rotation, optimises the model’s Z rotation to converge the top and bottom diffs while minimising the total error.
2. **Height Adjustment** – Scales the model’s height to match the quad.
3. **Y-Axis Rotation Adjustment** – Optimises the Y rotation to converge the top and bottom diffs while ensuring both sides have the same inclination trend (both have either positive or negative relative inclinations).
4. **Final Z-Axis Rotation Adjustment** – Ensures the model’s top inclination matches the quad’s top inclination, fully aligning the top and bottom edges.
5. **Width Adjustment** – Scales the model’s width to match the quad.
6. **X-Axis Rotation Adjustment** – Optimizes the X rotation to converge the left and right diffs while minimising total error.
7. **Final Height Adjustment** – Re-scales the model’s height to compensate for the X rotation's effect on the perceived height.

#### Parameters
- **rawCoords**: An array representing the corner coordinates of a detected opening, scaled to screen space. Format:  `[x1, y1, x2, y2, x3, y3, x4, y4]` (Coordinates follow a clockwise order starting from the top-left.)

#### Returns
- **None** – Directly manipulates the model.

---

### getViewportSizeAtDepth()
Calculates the size of the viewport at the depth of the camera's radius in babylon world units.

#### Parameters
- **None**

#### Returns
- An object with the following properties:
  - **width** (`number`) - The width of the viewport in babylon world units.
  - **height** (`number`) - The height of the viewport in babylon world units.

---
### optimiseRotationCLR( *coords, axis, clockwiseRotation, leftInclination, rightInclination* )
Rotates the model on the specified axis for **C**onvergence of **L**eft and **R**ight diff (CLR).

- Ensures convergence occurs near zero total error rather than at a local minima where the left and right diffs are equal but total error is high.
- **Note:** Currently optimised for X-axis rotation (can be easily adapted for Z-axis as well).

#### Parameters
- **coords**: The quad’s screen-space corner coordinates (`array` of 4`{x, y}` objects).
- **axis**: Axis for rotation (`BABYLON.Axis.X` or `.Z`).
- **clockwiseRotation**: `boolean` – Rotation direction.
- **leftInclination**: `number` – Left quad side inclination in degrees.
- **rightInclination**: `number` – Right quad side inclination in degrees.

#### Returns
- **None** – Directly manipulates the model.

---
### optimiseRotationCTB( *coords, axis, clockwiseRotation, topInclination, bottomInclination* )
Rotates the model on the specified axis for **C**onvergence of **T**op and **B**ottom diff (CTB).
- Ensures convergence occurs near zero total error rather than at a local minima where the top and bottom diffs are equal but total error is high.
- **Note:** Only applicable for Y- and Z-axis rotations.

#### Parameters
- **coords**: The quad’s screen-space corner coordinates (`array` of 4`{x, y}` objects).
- **axis**: Rotation axis (`BABYLON.Axis.Y` or `.Z`).
- **clockwiseRotation**: `boolean` – Rotation direction.
- **topInclination**: `number` – Quad top side inclination in degrees.
- **bottomInclination**: `number` – Quad bottom side inclination in degrees.

#### Returns
- **None** – Directly manipulates the model.

---
### setOptimise( *optimise, axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination* )
Used by `optimiseRotationCTB` to determine if it should begin optimising for convergence yet.
Contains conditions for Y and Z axis.

#### Parameters
- **optimise:** A `boolen` for if `optimiseRotationCTB` is currently in the optimise state or not.
- **axis:** The current rotation axis. Expects `.Y` or `.Z` property of `BABYLON.Axis` object which equates to a `BABYLON.Vector3` with the corresponding coordinate propetry set to `1`.
- **clockwiseRotation:** A `boolen` representing the direction of rotation
- **topModelInclination:** The angle of inclination in degrees of the top side of the model. Expects a `number`.
- **topInclination:** The angle of inclination in degrees of the top side of the quad. Expects a `number`.
- **bottomModelInclination:** The angle of inclination in degrees of the bottom side of the model. Expects a `number`.
- **bottomInclination:** The angle of inclination in degree of the bottom side of the quad. Expects a `number`.

#### Returns
- **optimise:** A  `boolen` representing the new or unchanged state of `optimiseRotationCTB` optimisation.

---
### setReverseRotation( *axis, clockwiseRotation, topModelInclination, topInclination, bottomModelInclination, bottomInclination* )
Used by `optimiseRotationCTB` to determine if it should reverse the direction of rotation i.e. it has rotated the model too far for proper convergence.
Contains conditions for Y and Z axis.

#### Parameters
- **axis:** The current rotation axis. Expects `.Y` or `.Z` property of `BABYLON.Axis` object which equates to a `BABYLON.Vector3` with the corresponding coordinate propetry set to `1`.
- **clockwiseRotation:** A `boolen` representing the direction of rotation
- **topModelInclination:** The angle of inclination in degrees of the top side of the model. Expects a `number`.
- **topInclination:** The angle of inclination in degrees of the top side of the quad. Expects a `number`.
- **bottomModelInclination:** The angle of inclination in degrees of the bottom side of the model. Expects a `number`.
- **bottomInclination:** The angle of inclination in degree of the bottom side of the quad. Expects a `number`.

#### Returns
- **reverse:** A  `boolen` representing if `optimiseRotationCTB` should reverse the direction of rotation or not.

---
### adjustYscaling( *babCoords* )
Calculates the difference in height visually between the model and opening and calls functions to change the scaling of the model to match.

#### Parameters
- **babCoords:** The corner coordinates of the quad in babylon world space. Expects an array of the from `[{x: x1, y: y1}, {x: x2, y: y2}, {x: x3, y: y3}, {x: x4, y: y4}]` where the coordinates are in a clockwise direction starting at the top left. 

#### Returns
- **No returns**: Directly manipulates the model

---
### adjustXscaling( *babCoords* )
Calculates the difference in width visually between the model and opening and calls functions to change the scaling of the model to match.

#### Parameters
- **babCoords:** The corner coordinates of the quad in babylon world space. Expects an array of the from `[{x: x1, y: y1}, {x: x2, y: y2}, {x: x3, y: y3}, {x: x4, y: y4}]` where the coordinates are in a clockwise direction starting at the top left.

#### Returns
- **No returns**: Manipulates the model (through use of other functions)

---
### scaleFromOneSide( *distance, scaleAxis, direction* )
Applies scaling to the model to adjust its size by a certain distance in a certain direction. Mimics the behaviour of the scaling preformed by dragging the gizmo.

#### Parameters
- **distance:** The distance by which the model will be grown or shrunk by. positive values will grow the model while negative values will shrink it. Expects a `number`.
- **scaleAxis:** The axis the model will be grown along. Expects `.X` or `.Y` property of `BABYLON.Axis` object which equates to a `BABYLON.Vector3` with the corresponding coordinate propetry set to `1`. (Will be interperted as the models local axis)
- **direction:** The direction along the `scaleAxis` that the model will be grown or shrunk. Expects `scaleDirection.positive` or `scaleDirection.negative`. Positive corresponding to the coordinate system positive direction and negative corresponding to the coordinates system negative direction. 

---
### getProjectedCorners( *rotationQuaternion = this.boundingBox.rotationQuaternion* )
Gets the screen space coordinates of the corners of the model, for a given rotation, as the user visually sees them.

#### Parameters
- **rotationQuaternion:** The rotation of the model the projection will be for. Is by default the models current rotation. Expects a `BABYLON.Quaternion`.

#### Returns
- **projectedCorners:** An array of the form `[{x: x1, y: y1, z: z1}, {x: x2, y: y2, z: z2}, {x: x3, y: y3, z: z3}, {x: x4, y: y4, z: z4}]` where the coordinates are in an  anti-clockwise direction starting at the top right (artefact of development, will be changed to be consistant later). **Note:** `.x` and `.y` are the actual coordinates while `.z` is a measure of if the point is in frustrum with `0 < z < 1` indicating that it is. `.z` is not used.

---
### getModelBabCorners( *rotationQuaternion* )
Gets the babylon world space coordinates of the corners of the model for a given rotation.

#### Parameters
- **rotationQuaternion:** The rotation of the model the coordinates will be found for. Expects a `BABYLON.Quaternion`.

#### Returns
- **rotatedCorners:** An array of the form `[{x: x1, y: y1, z: z1}, {x: x2, y: y2, z: z2}, {x: x3, y: y3, z: z3}, {x: x4, y: y4, z: z4}]` where the coordinates are in an  anti-clockwise direction starting at the top right (artefact of development, will be changed to be consistant later).

---
### getDimensions()
Gets the model's local extremes i.e. the maximum values for `X` `Y` `Z` and the minimum values for `X` `Y` `Z`. From these values the dimensions of the model as well as its local corner coordinates can be inferred.

#### Parameters
- **No parameter**

#### Returns
- An object with the following properties:
  - **localMin** (`{x: , y: , z: }`): The mimimum `X` `Y` `Z` value of the model.
  - **localMax** (`{x: , y: , z: }`): The maximum `X` `Y` `Z` value of the model.

---

## Utility Functions (Util.service)