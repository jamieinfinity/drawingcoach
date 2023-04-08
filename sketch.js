const canvaseBorderWidth = 2;
const canvaseBorderOffset = 2;
const headerHeight = 60;
const scoreRowHeight = 70;
const canvasOffset = headerHeight + scoreRowHeight;

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
let selectedScoreHistory = 'overall';
let scoreHistories = {
  'Oval': {
    'location': [],
    'size': [],
    'orientation': [],
    'fidelity': [],
    'overall': []
  },
  'Line': {
    'location': [],
    'size': [],
    'orientation': [],
    'fidelity': [],
    'overall': []
  }
}
let currentScores = {};

let rootCanvas;
let canvasWidth;
let canvasHeight;
let canvasL;
let canvasR;

let nextButton;

let reference;
let showReference = false;
let referenceShapeType = "Line";
let fitToDrawing;
let showFitToDrawing = false;
let drawingPoints = [];
let showGridLines = false;
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
  if(windowWidth/2 < windowHeight - headerHeight - scoreRowHeight - 50) {
    size = windowWidth / 2;
  } else {
    size = windowHeight - headerHeight - scoreRowHeight - 50;
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

  let buttonXOffset = 10; // canvasWidth
  nextButton = createButton('Next');
  nextButton.size(100, 40);
  nextButton.mousePressed(nextButtonPressed);
  nextButton.position(canvasWidth - 110, canvasHeight + canvasOffset + 10);

  // add a dropdown menu to select the reference shape type
  let dropdown = createSelect();
  dropdown.option('Line');
  dropdown.option('Oval');
  dropdown.changed(dropdownChanged);
  dropdown.value(referenceShapeType);
  dropdown.position(buttonXOffset, canvasHeight + canvasOffset + 10);
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
  label.position(buttonXOffset + 110, canvasHeight + canvasOffset + 13);
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
  label2.position(buttonXOffset + 180, canvasHeight + canvasOffset + 13);
  checkbox2.changed(toggleBlobs);

  let similarityScores = {
    overall: '-',
    location: '-',
    orientation: '-',
    size: '-',
    fidelity: '-'
  };
  displayScores(similarityScores);
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

  displayHistory(scoreHistories[referenceShapeType][selectedScoreHistory]);

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

function updateScoreHistory() {
  scoreHistories[referenceShapeType].location.push(currentScores.location);
  scoreHistories[referenceShapeType].orientation.push(currentScores.orientation);
  scoreHistories[referenceShapeType].size.push(currentScores.size);
  scoreHistories[referenceShapeType].fidelity.push(currentScores.fidelity);
  scoreHistories[referenceShapeType].overall.push(currentScores.overall);
}

function nextButtonPressed() {
  updateScoreHistory();
  
  resetCanvas();
  resetScoreDiv();

  reference.resetWithRandomParams(canvasL);
  showReference = false;
  showFitToDrawing = false;
  drawingPoints = [];

  displayHistory(scoreHistories[referenceShapeType][selectedScoreHistory]);
}

function windowResized() {
  let size;
  if(windowWidth/2 < windowHeight - headerHeight - scoreRowHeight - 50) {
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
  if (mouseY < canvasHeight && mouseX > canvasWidth) {
    showReference = false;
    showFitToDrawing = false;

    // Start a new line
    drawingPoints = [];
    drawingPoints.push(createVector(mouseX - canvasWidth, mouseY));
  }
}

function mousePressed() {
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight && mouseX > canvasWidth) {

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
  if (mouseY < canvasHeight && mouseButtonPressed && mouseX > canvasWidth) {
    // Add a new point to the line
    drawingPoints.push(createVector(mouseX - canvasWidth, mouseY));
  }
}

function mouseReleased() {
  // only do something if mouse is within the canvas
  if (mouseY < canvasHeight && mouseX > canvasWidth) {

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
    currentScores = similarityScores;
    displayScores(similarityScores);
  }
}

function resetScoreDiv() {
  let scoreDiv = select("#scoreDiv");
  if (scoreDiv) {
    scoreDiv.remove();
  }
  let similarityScores = {
    overall: '-',
    location: '-',
    orientation: '-',
    size: '-',
    fidelity: '-'
  };
  displayScores(similarityScores);    
}

// 720007,952816,b95025,dc7934,ffa143,e5af4a,ccbd52,
// b2cb59,98d960,84c655,
// 70b24a,5d9f3e,498c33

function colorForScorePanel(score) {
  if (score === '-') {
    return '#ddd';
  } else if (score < 6) {
    return '#952816'; // 0 to 6
  } else if (score < 7) {
    return '#dc7934'; // 6 to 7
  } else if (score < 8) {
    return '#e9c864'; // 7 to 8
  } else if (score < 9) {
    return '#b3d361'; // 8 to 9
  } else {
    return '#63a642'; // 9 to 10
  }
}
function colorForScoreLabel(score) {
  if (score === '-') {
    return '#888';
  } else if (score < 6) {
    return 'white'; // 0 to 6
  } else if (score < 7) {
    return 'white'; // 6 to 7
  } else if (score < 8) {
    return 'white'; // 7 to 8
  } else if (score < 9) {
    return 'white'; // 8 to 9
  } else {
    return 'white'; // 9 to 10
  }
}

function scoreCardClicked(event, scoreType) {
  selectedScoreHistory = scoreType;
  displayHistory(scoreHistories[referenceShapeType][selectedScoreHistory]);
}

function displayScores(scores) {
  let scoreDiv = select("#scoreDiv");
  if (scoreDiv) {
    scoreDiv.remove();
  }
  scoreDiv = createDiv();
  scoreDiv.position(canvasWidth + 2, headerHeight);
  scoreDiv.id("scoreDiv");
  scoreDiv.style("display", "flex");
  scoreDiv.style("flex-wrap", "wrap");
  // scoreDiv.style("justify-content", "center");
  scoreDiv.style("justify-content", "space-around");
  scoreDiv.style("width", windowWidth / 2 - 20 + "px");
  scoreDiv.style("gap", "10px");
  
  for (let key of similarityScoreKeys) {
    let score = scores[key];
    let scoreContainer = createDiv();
    scoreContainer.mousePressed((event) => scoreCardClicked(event, key));
    scoreContainer.style("display", "flex");
    scoreContainer.style("flex-direction", "column");
    scoreContainer.style("align-items", "center");
    scoreContainer.style("background-color", colorForScorePanel(score));
    scoreContainer.style("border-radius", "5px");
    scoreContainer.style("padding", "10px");
    scoreContainer.style("box-shadow", "0 2px 4px rgba(0, 0, 0, 0.1)");
    scoreContainer.style("max-height", (scoreRowHeight-5) + "px");
    scoreContainer.style("min-width", "100px");
    if(key === selectedScoreHistory) {
      scoreContainer.style("border", "3px solid #555");
    }

    let labelDiv = createDiv(similarityScoreLabels[key]);
    labelDiv.style("color", colorForScoreLabel(score));
    labelDiv.style("margin-bottom", "5px");
    scoreContainer.child(labelDiv);

    let valueDiv = createDiv(scores[key]);
    valueDiv.style("color", colorForScoreLabel(score));
    valueDiv.style("font-size", "1.5em");
    valueDiv.style("font-weight", "bold");
    scoreContainer.child(valueDiv);

    scoreDiv.child(scoreContainer);
  }

}

function displayHistory(history) {
  const chartWidth = windowWidth / 2 - 20;
  const chartHeight = (scoreRowHeight-5);
  const barSpacing = 2;
  const barWidth = min(20, chartWidth / history.length - barSpacing);

  let historyDiv = select("#historyDiv");
  if (historyDiv) {
    historyDiv.remove();
  }

  historyDiv = createDiv();
  historyDiv.id("historyDiv");
  historyDiv.style("position", "absolute");
  historyDiv.style("left", "10px");
  historyDiv.style("top", headerHeight + "px");
  historyDiv.style("width", chartWidth + "px");
  historyDiv.style("height", chartHeight + "px");

  let historyCanvas = createGraphics(history.length * (barWidth + barSpacing), chartHeight);
  historyCanvas.parent(historyDiv);
  historyCanvas.style("position", "relative");
  historyCanvas.style("display", "block");

  historyCanvas.background(255);
  for (let i = 0; i < history.length; i++) {
    let score = history[i];
    let barHeight = map(score, 0, 10, 0, chartHeight);
    let color = colorForScorePanel(score);
    historyCanvas.fill(color);
    historyCanvas.noStroke();
    historyCanvas.rect(i * (barWidth + barSpacing), chartHeight - barHeight, barWidth, barHeight);
    // display the score on the rect as a tooltip
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
  // let c = color("#2196F3");
  let c = color('#999');
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


