const canvaseBorderWidth = 2;
const canvaseBorderOffset = 2;

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


function setup() {
  canvasWidth = windowWidth/2;
  canvasHeight = windowWidth/2;
  createCanvas(canvasWidth * 2, canvasHeight);

  canvasL = createGraphics(canvasWidth, canvasHeight);
  canvasR = createGraphics(canvasWidth, canvasHeight);

  nextButton = createButton('Next');
  nextButton.size(100, 50);
  nextButton.mousePressed(nextButtonPressed);

  reference = new CurveSimpleLine(canvasL);
}

function nextButtonPressed() {
  // first clear each canvas
  canvasL.reset();
  canvasL.background(255);
  canvasR.reset();
  canvasR.background(255);
  reference = new CurveSimpleLine(canvasL);
  showReference = false;
  showFitToDrawing = false;
  drawingPoints = [];
}

function windowResized() {
  canvasWidth = windowWidth/2;
  canvasHeight = windowWidth/2;  
  resizeCanvas(windowWidth, windowWidth);
}

function touchStarted(event) {
  // console.log(event);
  showReference = false;
  showFitToDrawing = false;

  // Start a new line
  drawingPoints = [];
  drawingPoints.push(createVector(mouseX-canvasWidth, mouseY));}

function mousePressed() {
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight) {

    showReference = false;
    showFitToDrawing = false;

    // Start a new line
    drawingPoints = [];
    drawingPoints.push(createVector(mouseX-canvasWidth, mouseY));
  }
}

function mouseDragged() {
  // Add a new point to the line
  drawingPoints.push(createVector(mouseX-canvasWidth, mouseY));
}

function mouseReleased() {
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight) {
    showReference = true;
    showFitToDrawing = false;

  // // fit line to points
  // [a, b] = linearRegressionFit(drawingPoints);
  // fitToDrawing = [0, b, canvasWidth, a * canvasWidth + b];
  // // get line parameters
  // fitLineParameters = getLineParameters(fitToDrawing);
  // // compare line parameters
  // let angleDiff = abs(referenceLineParameters[1] - fitLineParameters[1]);
  // let lengthDiff = abs(referenceLineParameters[2] - fitLineParameters[2]);
  // let distance = dist(referenceLineParameters[0].x, referenceLineParameters[0].y, fitLineParameters[0].x, fitLineParameters[0].y);
  // // console.log("angleDiff: " + angleDiff, "lengthDiff: " + lengthDiff, "distance: " + distance);
  }
}

// // function that finds the linear regression fit parameters a, b for points
// function linearRegressionFit(points) {
//   let sumX = 0;
//   let sumY = 0;
//   let sumXY = 0;
//   let sumXX = 0;
//   let n = points.length;
//   for (let i = 0; i < n; i++) {
//     sumX += points[i].x;
//     sumY += points[i].y;
//     sumXY += points[i].x * points[i].y;
//     sumXX += points[i].x * points[i].x;
//   }
//   let a = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
//   let b = (sumY - a * sumX) / n;
//   return [a, b];
// }

// function getLineParameters(inputLine) {
//   // get center of line
//   let x = (inputLine[0] + inputLine[2]) / 2;
//   let y = (inputLine[1] + inputLine[3]) / 2;
//   // get angle of line
//   let angle = atan2(inputLine[3] - inputLine[1], inputLine[2] - inputLine[0]);
//   // convert to degrees
//   angle = angle * 180 / PI;
//   // get length of line
//   let length = dist(inputLine[0], inputLine[1], inputLine[2], inputLine[3]);
//   return [{x: x, y: y}, angle, length];
// }


function drawCanvasBorder(canvas) {
  // draw border around the canvas
  canvas.noFill();
  canvas.stroke(150);
  canvas.strokeWeight(3);
  canvas.rect(canvaseBorderOffset, canvaseBorderOffset, canvasWidth-2*canvaseBorderOffset, canvasHeight-2*canvaseBorderOffset);
}

function drawStudentCanvas(canvas, ref) {
  canvas.background(255);

  // Draw the reference line
  if (showReference) {
    ref.draw(canvas, "compare");
  }

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
  canvas.ellipse(mouseX-canvasWidth, mouseY, 8, 8);

  drawCanvasBorder(canvas);

  image(canvas, canvasWidth, 0);
}

function drawReferenceCanvas(canvas, ref) {
  ref.draw(canvas, "reference");
  
  drawCanvasBorder(canvas);
  image(canvas, 0, 0);
}

function draw() {

  drawReferenceCanvas(canvasL, reference);

  drawStudentCanvas(canvasR, reference);
}


