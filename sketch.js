const canvaseBorderWidth = 2;
const canvaseBorderOffset = 2;
const headerHeight = 60;
const canvasLabelHeight = 40;
const canvasOffset = headerHeight + canvasLabelHeight;

const similarityScoreKeys = [
  "location",
  "size",
  "orientation",
  "fidelity",
  "overall"
];
const similarityScoreLabels = {
  location: "Location",
  size: "Size",
  orientation: "Orientation",
  fidelity: "Fidelity",
  overall: "Overall"
};

let rootCanvas;
let canvasWidth;
let canvasHeight;
let canvasL;
let canvasR;

let nextButton;

let reference;
let showReference = false;
let referenceShapeType = "Oval";
let fitToDrawing;
let showFitToDrawing = false;
let drawingPoints = [];
let showGridLines = true;
let showBlobs = true;

let blobs = [];

function createBlobs() {
  let noiseScale = 200;
  let numBaseVertices = 14;
  let blobs = [];
  // create a bunch of blobs to draw on the canvas
  for (let i = 0; i < 9; i++) {
    blobs.push(new ShapeRandomBlob(i+1, canvasWidth, numBaseVertices, noiseScale));
  }
  // randomly remove some blobs
  for (let i = 0; i < 5; i++) {
    let index = floor(random(blobs.length));
    blobs.splice(index, 1);
  }
  // check if any canvas sector rows or columns are empty
  let unOccupiedRows = [0,1,2];
  let unOccupiedColumns = [0,1,2];
  for (let i = 0; i < blobs.length; i++) {
    let row = Math.floor((blobs[i].canvasSector - 1) / 3);
    let column = (blobs[i].canvasSector - 1) % 3;
    if (unOccupiedRows.includes(row)) {
      unOccupiedRows.splice(unOccupiedRows.indexOf(row), 1);
    }
    if (unOccupiedColumns.includes(column)) {
      unOccupiedColumns.splice(unOccupiedColumns.indexOf(column), 1);
    }
  }
  // if any rows or columns are empty, add a blob to fill it
  if (unOccupiedRows.length > 0) {
    let row = unOccupiedRows[0];
    let column = floor(random(3));
    let canvasSector = row * 3 + column + 1;
    blobs.push(new ShapeRandomBlob(canvasSector, canvasWidth, numBaseVertices, noiseScale));
  }
  if (unOccupiedColumns.length > 0) {
    let column = unOccupiedColumns[0];
    let row = floor(random(3));
    let canvasSector = row * 3 + column + 1;
    blobs.push(new ShapeRandomBlob(canvasSector, canvasWidth, numBaseVertices, noiseScale));
  }
  return blobs;
}

function createNewShape(shapeType, canvas) {
  let shape;
  if (shapeType === "Line") {
    shape = new CurveSimpleLine();
  } else if (shapeType === "Oval") {
    shape = new ShapeEllipse();
  }
  shape.resetWithRandomParams(canvas);
  return shape;
}

function resetCanvas() {
  canvasL.reset();
  canvasL.background(255);
  canvasR.reset();
  canvasR.background(255);
}

function setup() {
  colorMode(RGB, 255, 255, 255, 255);
  let size;
  if(windowWidth/2 < windowHeight - headerHeight - canvasLabelHeight - 50) {
    size = windowWidth / 2;
  } else {
    size = windowHeight - headerHeight - canvasLabelHeight - 50;
  }  
  canvasWidth = size;
  canvasHeight = size;
  rootCanvas = createCanvas(canvasWidth * 2, canvasHeight);
  rootCanvas.position(0, canvasOffset);

  canvasL = createGraphics(canvasWidth, canvasHeight);
  canvasR = createGraphics(canvasWidth, canvasHeight);

  reference = createNewShape(referenceShapeType, canvasL);
  fitToDrawing = createNewShape(referenceShapeType, canvasL);

  blobs = createBlobs();

  // create a header above the canvas
  let header = createDiv();
  header.addClass('header');
  header.position(0, 0);
  // assign styles for height and line-height based on headerHeight variable
  header.style('height', headerHeight + 'px');
  header.style('line-height', headerHeight + 'px');
  let title = createDiv();
  title.addClass('title');
  title.parent(header);
  let titleH1 = createElement('h1', 'Drawing Dojo');
  titleH1.parent(title);

  // create a div to hold canvas labels
  // then within that create two divs, one for each canvas label
  // within each of those an h2 for the label text
  let canvasLabels = createDiv();
  canvasLabels.addClass('canvas-labels');
  canvasLabels.position(0, headerHeight);
  canvasLabels.style('height', canvasLabelHeight + 'px');
  canvasLabels.style('line-height', canvasLabelHeight + 'px');
  let canvasLabelL = createDiv();
  canvasLabelL.addClass('canvas-label');
  canvasLabelL.parent(canvasLabels);
  let canvasLabelLH2 = createElement('h2', 'REFERENCE');
  canvasLabelLH2.parent(canvasLabelL);
  let canvasLabelR = createDiv();
  canvasLabelR.addClass('canvas-label');
  canvasLabelR.parent(canvasLabels);
  let canvasLabelRH2 = createElement('h2', 'DRAWING');
  canvasLabelRH2.parent(canvasLabelR);

  nextButton = createButton('Next');
  nextButton.size(100, 40);
  nextButton.mousePressed(nextButtonPressed);
  nextButton.position(canvasWidth + 10, canvasHeight + canvasOffset + 10);

  // add a dropdown menu to select the reference shape type
  let dropdown = createSelect();
  dropdown.option('Line');
  dropdown.option('Oval');
  dropdown.changed(dropdownChanged);
  dropdown.value(referenceShapeType);
  dropdown.position(canvasWidth + 120, canvasHeight + canvasOffset + 10);
  dropdown.size(100, 40);
  // dropdown.style('font-size', '20px');
  
  // add toggle to show grid lines
  let label = createElement(
    'label',
    `<input id="toggle" type="checkbox" />
     <span class="slider round"></span>`
  );
  label.addClass('switch');
  checkbox = select('#toggle');
  checkbox.checked(showGridLines);
  label.position(canvasWidth + 230, canvasHeight + canvasOffset + 13);
  checkbox.changed(toggleGridLines);

  // add toggle to show blobs
  let label2 = createElement(
    'label',
    `<input id="toggle2" type="checkbox" />
      <span class="slider round"></span>`
  );
  label2.addClass('switch');
  checkbox2 = select('#toggle2');
  checkbox2.checked(showBlobs);
  label2.position(canvasWidth + 300, canvasHeight + canvasOffset + 13);
  checkbox2.changed(toggleBlobs);
}

function dropdownChanged() {
  resetCanvas();
  resetScoreDiv();
  showReference = false;
  showFitToDrawing = false;
  drawingPoints = [];

  referenceShapeType = this.value();
  reference = createNewShape(referenceShapeType, canvasL);
  fitToDrawing = createNewShape(referenceShapeType, canvasL);

  draw();
}

function toggleBlobs() {
  showBlobs = checkbox2.checked();
  draw();
}

function toggleGridLines() {
  showGridLines = checkbox.checked();
  draw();
}

function nextButtonPressed() {
  resetCanvas();
  resetScoreDiv();

  reference.resetWithRandomParams(canvasL);
  showReference = false;
  showFitToDrawing = false;
  drawingPoints = [];
}

function windowResized() {
  let size;
  if(windowWidth/2 < windowHeight - headerHeight - canvasLabelHeight - 50) {
    size = windowWidth / 2;
  } else {
    size = windowHeight;
  }  
  canvasWidth = size;
  canvasHeight = size; 
  resizeCanvas(2*size, size);
}

function touchStarted(event) {
  // console.log(event);

  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight) {
    showReference = false;
    showFitToDrawing = false;

    // Start a new line
    drawingPoints = [];
    drawingPoints.push(createVector(mouseX - canvasWidth, mouseY));
  }
}

function mousePressed() {
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight) {

    showReference = false;
    showFitToDrawing = false;

    // Start a new line
    drawingPoints = [];
    drawingPoints.push(createVector(mouseX - canvasWidth, mouseY));
  }
}

function mouseDragged(event) {
  // console.log(event);
  let mouseButtonPressed = true;
  // check if event class is MouseEvent
  if (event.constructor.name === 'MouseEvent') {
    mouseButtonPressed = event.buttons === 1;
  }
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight && mouseButtonPressed) {
    // Add a new point to the line
    drawingPoints.push(createVector(mouseX - canvasWidth, mouseY));
  }
}

function mouseReleased() {
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight) {

    fitToDrawing.updateWithFitToDrawing(drawingPoints);

    if (drawingPoints.length <= 3 || isNaN(fitToDrawing.getShapeParameters().size)) {
      drawingPoints = [];
      canvasR.reset();
      canvasR.background(255);
      resetScoreDiv();
      return;
    }

    showReference = true;
    showFitToDrawing = true;
    let similarityScores = reference.getSimilarityScores(fitToDrawing, canvasL);
    displayScores(similarityScores);
  }
}

function resetScoreDiv() {
  let scoreDiv = select("#scoreDiv");
  if (scoreDiv) {
    scoreDiv.remove();
  }
}

function displayScores(scores) {
  resetScoreDiv();
  scoreDiv = createDiv();
  scoreDiv.position(10, canvasHeight + canvasOffset + 20);
  scoreDiv.id("scoreDiv");
  scoreDiv.style("display", "flex");
  scoreDiv.style("flex-direction", "row");
  scoreDiv.style("column-gap", ".1em");
  scoreDiv.style("font-size", "1em");
  scoreDiv.style("justify-content", "space-between");
  scoreDiv.style("width", windowWidth / 2 - 20 + "px");
  for (let key of similarityScoreKeys) {
    // display the label and score in their own divs so they can be styled separately
    let div = createDiv(similarityScoreLabels[key]);
    div.style("color", "#888");
    scoreDiv.child(div);
    div = createDiv(scores[key]);
    div.style("font-weight", "bold");
    scoreDiv.child(div);
    // add a separator
    if (key != similarityScoreKeys[similarityScoreKeys.length - 1]) {
      scoreDiv.child(createDiv("|"));
    }
  }
}

function drawCanvasBorder(canvas) {
  // draw border around the canvas
  canvas.noFill();
  canvas.stroke(150);
  canvas.strokeWeight(3);
  canvas.rect(canvaseBorderOffset, canvaseBorderOffset, canvasWidth - 2 * canvaseBorderOffset, canvasHeight - 2 * canvaseBorderOffset);
}

function drawGridLines(canvas) {
  if (!showGridLines) {
    return;
  }
  // light blue lines
  let c = color("#2196F3");
  c.setAlpha(40);
  canvas.stroke(c);
  canvas.strokeWeight(3);
  for (let i = 1; i < 3; i++) {
    canvas.line(0, canvasHeight / 3 * i, canvasWidth, canvasHeight / 3 * i);
    canvas.line(canvasWidth / 3 * i, 0, canvasWidth / 3 * i, canvasHeight);
  }
  canvas.strokeWeight(1);
  for (let i = 1; i < 6; i++) {
    canvas.line(0, canvasHeight / 6 * i, canvasWidth, canvasHeight / 6 * i);
    canvas.line(canvasWidth / 6 * i, 0, canvasWidth / 6 * i, canvasHeight);
  }
}

function drawStudentCanvas(canvas, ref, fit) {
  canvas.background(255);

  drawGridLines(canvas);

  if (showBlobs) {
    for (let i = 0; i < blobs.length; i++) {
      blobs[i].draw(canvas);
    }
  }

  // // Draw the fit line
  // if (showFitToDrawing) {
  //   fit.draw(canvas, "fit");
  // }

  // Draw the student's drawing
  canvas.noFill();
  // canvas.stroke("#2ec4b6");
  canvas.stroke(0);
  canvas.strokeWeight(4);
  canvas.beginShape();
  for (let i = 0; i < drawingPoints.length; i++) {
    canvas.curveVertex(drawingPoints[i].x, drawingPoints[i].y);
  }
  canvas.endShape();

  // let resampledPoints = ramerDouglasPeucker(drawingPoints, 1);
  // for (let i = 0; i < resampledPoints.length; i++) {
  //   canvas.noStroke();
  //   canvas.fill(255, 0, 0);
  //   canvas.ellipse(resampledPoints[i].x, resampledPoints[i].y, 4, 4);
  // }

  // Draw the current point
  canvas.fill(200);
  canvas.noStroke();
  canvas.ellipse(mouseX - canvasWidth, mouseY, 8, 8);

  // Draw the reference line
  if (showReference) {
    ref.draw(canvas, "reference");
  }

  drawCanvasBorder(canvas);

  image(canvas, canvasWidth, 0);
}

function drawReferenceCanvas(canvas, ref) {
  canvas.background(255);

  drawGridLines(canvas);

  if (showBlobs) {
    for (let i = 0; i < blobs.length; i++) {
      blobs[i].draw(canvas);
    }
  }

  ref.draw(canvas, "normal");

  drawCanvasBorder(canvas);
  image(canvas, 0, 0);
}

function draw() {

  drawReferenceCanvas(canvasL, reference);

  drawStudentCanvas(canvasR, reference, fitToDrawing);
}


