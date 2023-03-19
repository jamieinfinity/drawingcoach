const canvaseBorderWidth = 2;
const canvaseBorderOffset = 2;

const similarityScoreKeys = [
  "location",
  "length",
  "angle",
  "smoothness",
  "overall"
];
const similarityScoreLabels = {
  location: "Location",
  length: "Length",
  angle: "Orientation",
  smoothness: "Smoothness",
  overall: "Overall"
};

let canvasWidth;
let canvasHeight;
let canvasL;
let canvasR;

let nextButton;

let reference;
let showReference = false;
let fitToDrawing;
let showFitToDrawing = false;
let drawingPoints = [];
let showGridLines = true;


function setup() {
  colorMode(RGB, 255, 255, 255, 255);
  canvasWidth = windowWidth / 2;
  canvasHeight = windowWidth / 2;
  createCanvas(canvasWidth * 2, canvasHeight);

  canvasL = createGraphics(canvasWidth, canvasHeight);
  canvasR = createGraphics(canvasWidth, canvasHeight);

  nextButton = createButton('Next');
  nextButton.size(80, 40);
  nextButton.mousePressed(nextButtonPressed);
  nextButton.position(canvasWidth + 10, canvasHeight + 10);

  // add toggle to show grid lines
  let label = createElement(
    'label',
    `<input id="toggle" type="checkbox" />
     <span class="slider round"></span>`
  );
  label.addClass('switch');
  checkbox = select('#toggle');
  checkbox.checked(showGridLines);
  label.position(canvasWidth + 110, canvasHeight + 13);
  checkbox.changed(toggleGridLines);

  reference = new CurveSimpleLine();
  reference.updateWithRandomCurve(canvasL);
  fitToDrawing = new CurveSimpleLine();
}

function toggleGridLines() {
  showGridLines = checkbox.checked();
  draw();
}

function nextButtonPressed() {
  // first clear each canvas
  canvasL.reset();
  canvasL.background(255);
  canvasR.reset();
  canvasR.background(255);
  resetScoreDiv();

  reference.updateWithRandomCurve(canvasL);
  showReference = false;
  showFitToDrawing = false;
  drawingPoints = [];
}

function windowResized() {
  canvasWidth = windowWidth / 2;
  canvasHeight = windowWidth / 2;
  resizeCanvas(windowWidth, canvasHeight);
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

function mouseDragged() {
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight) {  
    // Add a new point to the line
    drawingPoints.push(createVector(mouseX - canvasWidth, mouseY));
  }
}

function mouseReleased() {
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight) {

    fitToDrawing.updateWithFitToDrawing(drawingPoints);

    if (drawingPoints.length <= 3 || isNaN(fitToDrawing.getCurveParameters().length)) {
      drawingPoints = [];
      canvasR.reset();
      canvasR.background(255);
      resetScoreDiv();
      return;
    }

    showReference = true;
    showFitToDrawing = false;
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
  scoreDiv.position(10, canvasHeight + 20);
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

  // Draw the fit line
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

  ref.draw(canvas, "normal");

  drawCanvasBorder(canvas);
  image(canvas, 0, 0);
}

function draw() {

  drawReferenceCanvas(canvasL, reference);

  drawStudentCanvas(canvasR, reference, fitToDrawing);
}


