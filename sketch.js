const lineGrayLevel = 50;
const lineThickness = 4;
let canvasWidth;
let canvasHeight;
let points = [];
let canvasL;
let canvasR;
let referenceLine;
let referenceLineParameters;
let showReference = false;
let fitLine;
let fitLineParameters;
let showFit = false;

function setup() {
  canvasWidth = windowWidth/2;
  canvasHeight = windowHeight/2;
  createCanvas(canvasWidth * 2, canvasHeight);
  canvasL = createGraphics(canvasWidth, canvasHeight);
  canvasR = createGraphics(canvasWidth, canvasHeight);

  referenceLine = generateRandomLine();
  referenceLineParameters = getLineParameters(referenceLine);
}

function windowResized() {
  canvasWidth = windowWidth/2;
  canvasHeight = windowHeight/2;  
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  showReference = false;
  showFit = false;
  // Start a new line
  points = [];
  points.push(createVector(mouseX-canvasWidth, mouseY));
}

function mouseReleased() {
  showReference = true;
  showFit = false;
  // fit line to points
  [a, b] = linearRegressionFit(points);
  fitLine = [0, b, canvasWidth, a * canvasWidth + b];
  // get line parameters
  fitLineParameters = getLineParameters(fitLine);
  // compare line parameters
  let angleDiff = abs(referenceLineParameters[1] - fitLineParameters[1]);
  let lengthDiff = abs(referenceLineParameters[2] - fitLineParameters[2]);
  let distance = dist(referenceLineParameters[0].x, referenceLineParameters[0].y, fitLineParameters[0].x, fitLineParameters[0].y);
  // console.log("angleDiff: " + angleDiff, "lengthDiff: " + lengthDiff, "distance: " + distance);
}

// function that finds the linear regression fit parameters a, b for points
function linearRegressionFit(points) {
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let n = points.length;
  for (let i = 0; i < n; i++) {
    sumX += points[i].x;
    sumY += points[i].y;
    sumXY += points[i].x * points[i].y;
    sumXX += points[i].x * points[i].x;
  }
  let a = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  let b = (sumY - a * sumX) / n;
  return [a, b];
}

function mouseDragged() {
  // Add a new point to the line
  points.push(createVector(mouseX-canvasWidth, mouseY));
}

function generateRandomLine() {
  let x1 = random(0, canvasWidth);
  let y1 = random(0, canvasHeight);
  let x2 = random(0, canvasWidth);
  let y2 = random(0, canvasHeight);
  return [x1, y1, x2, y2];
}

function getLineParameters(inputLine) {
  // get center of line
  let x = (inputLine[0] + inputLine[2]) / 2;
  let y = (inputLine[1] + inputLine[3]) / 2;
  // get angle of line
  let angle = atan2(inputLine[3] - inputLine[1], inputLine[2] - inputLine[0]);
  // convert to degrees
  angle = angle * 180 / PI;
  // get length of line
  let length = dist(inputLine[0], inputLine[1], inputLine[2], inputLine[3]);
  return [{x: x, y: y}, angle, length];
}

function drawStudentCanvas(canvas, referenceLine, fitLine) {
  // Draw the right canvas
  canvas.background(255);

  // Draw the reference line
  if (showReference) {
    canvas.stroke(200);
    canvas.strokeWeight(lineThickness);
    canvas.line(...referenceLine);
  }
  // Draw the fit line
  if (showFit) {
    canvas.stroke(0, 255, 0);
    canvas.strokeWeight(lineThickness);
    canvas.line(...fitLine);
  }

  // Draw the smooth line
  canvas.noFill();
  // canvas.stroke("#2ec4b6");
  canvas.stroke(lineGrayLevel);
  canvas.strokeWeight(lineThickness);
  canvas.beginShape();
  for (let i = 0; i < points.length; i++) {
    canvas.curveVertex(points[i].x, points[i].y);
  }
  canvas.endShape();

  // Draw the current point
  canvas.fill(255, 0, 0);
  canvas.noStroke();
  canvas.ellipse(mouseX-canvasWidth, mouseY, 8, 8);

  // draw border around the canvas
  canvas.noFill();
  canvas.stroke(150);
  canvasR.strokeWeight(3);
  canvas.rect(0, 0, canvasWidth, canvasHeight);

  image(canvas, canvasWidth, 0);
}

function drawReferenceCanvas(canvas, referenceLine) {
  canvas.stroke(lineGrayLevel);
  canvas.strokeWeight(lineThickness);
  canvas.line(...referenceLine);

  // draw border around the canvas
  canvas.noFill();
  canvas.stroke(150);
  canvasR.strokeWeight(3);
  canvas.rect(0, 0, canvasWidth, canvasHeight);

  image(canvas, 0, 0);
}

function draw() {

  drawReferenceCanvas(canvasL, referenceLine);

  drawStudentCanvas(canvasR, referenceLine, fitLine);
}


