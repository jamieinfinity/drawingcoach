
const styleParameters = {
    normal: {
        lineColor: 0,
        lineOpacity: 255,
        lineThickness: 5,
    },
    reference: {
        // make line orange
        lineColor: "#ffc300",
        lineOpacity: 200,
        lineThickness: 5,
    },
    fit: {
        // make line green
        lineColor: "#2ec4b6",
        lineOpacity: 255,
        lineThickness: 5,
    }
}
const similarityScoreWeights = {
    location: 1.5,
    size: 1,
    orientation: 1,
    fidelity: 0.75
}
const similarityScoreSensitivities = {
    "CurveSimpleLine": { "location": 300, "size": 30, "orientation": 100 },
    "ShapeEllipse": { "location": 300, "size": 30, "orientation": 100 }
};

function fitLineToPoints(points) {
    // see https://en.wikipedia.org/wiki/Deming_regression
    let n = points.length;
    let meanX = 0;
    let meanY = 0;
    for (let i = 0; i < n; i++) {
        meanX += points[i].x;
        meanY += points[i].y;
    }
    meanX /= n;
    meanY /= n;

    let covXX = 0;
    let covXY = 0;
    let covYY = 0;
    for (let i = 0; i < n; i++) {
        let xDiff = points[i].x - meanX;
        let yDiff = points[i].y - meanY;
        covXX += xDiff * xDiff;
        covXY += xDiff * yDiff;
        covYY += yDiff * yDiff;
    }
    covXX /= n;
    covXY /= n;
    covYY /= n;

    let diff = covYY - covXX;
    let beta1 = (diff + sqrt(diff * diff + 4 * covXY * covXY)) / (2 * covXY);
    let beta0 = meanY - beta1 * meanX;

    function lineFunction(p) {
        let x = p.x;
        let y = p.y;
        let xprime = x + beta1 * (y - beta0 - beta1 * x) / (1 + beta1 * beta1);
        let yprime = beta0 + beta1 * xprime;
        return { x: xprime, y: yprime };
    }
    let pstart = lineFunction({ x: points[0].x, y: points[0].y });
    let pend = lineFunction({ x: points[n - 1].x, y: points[n - 1].y });

    let mae = 0;
    for (let i = 0; i < n; i++) {
        let p = points[i];
        let pprime = lineFunction(p);
        mae += dist(p.x, p.y, pprime.x, pprime.y);
    }
    mae /= n;
    let fidelity =  Math.exp(-mae / (dist(pend.x, pend.y, pstart.x, pstart.y) / 40));

    return { line: [pstart, pend], fidelity: fidelity }
}

function chaikin(points, iterations) {
    for (let k = 0; k < iterations; k++) {
        let newPoints = [];
        for (let i = 0; i < points.length; i++) {
            let p1 = points[i];
            let p2 = points[(i + 1) % points.length];

            let q = {
                x: 0.75 * p1.x + 0.25 * p2.x,
                y: 0.75 * p1.y + 0.25 * p2.y,
            };

            let r = {
                x: 0.25 * p1.x + 0.75 * p2.x,
                y: 0.25 * p1.y + 0.75 * p2.y,
            };

            newPoints.push(q);
            newPoints.push(r);
        }
        points = newPoints;
    }
    return points;
}

class ShapeRandomBlob {
    constructor(canvasSector, canvasSize, numBaseVertices, noiseScale) {
        let noiseOffset = random(100000);
        this.canvasSector = canvasSector;
        this.blobSize = random(canvasSize / 14., canvasSize / 8);
        this.position = this.getPosition(canvasSector, canvasSize);
        this.vertices = this.generateBlob(numBaseVertices, noiseScale, noiseOffset);
    }
    getPosition(canvasSector, canvasSize) {
        const sectorSize = canvasSize / 3;
        const sectorX = (canvasSector - 1) % 3;
        const sectorY = Math.floor((canvasSector - 1) / 3);
        const x = random(this.blobSize / 2, sectorSize - this.blobSize / 2) + sectorX * sectorSize;
        const y = random(this.blobSize / 2, sectorSize - this.blobSize / 2) + sectorY * sectorSize;
        return { x: x, y: y };
    }
    generateBlob(numBaseVertices, noiseScale, noiseOffset) {
        let vertices = [];
        let blobSize = this.blobSize; // to avoid using this.blobSize in the function
        function getPoint(i) {
            let angle = map(i, 0, numBaseVertices, 0, TWO_PI);
            let r = blobSize * (0.25 + 0.75 * noise(noiseScale * cos(angle) + noiseOffset, noiseScale * sin(angle) + noiseOffset));
            let x = r * cos(angle);
            let y = r * sin(angle);
            return { x, y };
        }
        for (let i = 0; i < numBaseVertices; i++) {
            let point = getPoint(i);
            vertices.push(point);
        }
        vertices = chaikin(vertices, 7); // Increase the second parameter for a smoother curve
        return vertices;
    }
    draw(canvas) {
        canvas.push();
        canvas.stroke(180);
        canvas.strokeWeight(1);
        canvas.fill(235);
        canvas.translate(this.position.x, this.position.y);
        canvas.beginShape();
        for (let point of this.vertices) {
            canvas.vertex(point.x, point.y);
        }
        canvas.endShape(CLOSE);
        canvas.pop();
    }
}

class CurveSimpleLine {
    constructor(points = []) {
        this.points = points;
        this.fidelity = null;
    }
    draw(canvas, style = "normal") {
        let c = color(styleParameters[style].lineColor);
        c.setAlpha(styleParameters[style].lineOpacity);
        canvas.stroke(c);
        canvas.strokeWeight(styleParameters[style].lineThickness);
        canvas.line(this.points[0].x, this.points[0].y, this.points[1].x, this.points[1].y);
    }
    resetWithRandomParams(canvas) {
        let x1, x2, y1, y2;
        let xmin = canvas.width / 10;
        let xmax = canvas.width - canvas.width / 10;
        let ymin = canvas.height / 10;
        let ymax = canvas.height - canvas.height / 10;
        let len = 0;
        while (len < canvas.width / 3) {
            x1 = random(xmin, xmax);
            y1 = random(ymin, ymax);
            x2 = random(xmin, xmax);
            y2 = random(ymin, ymax);
            len = dist(x1, y1, x2, y2);
        }
        this.points = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        this.fidelity = null;
    }
    updateWithFitToDrawing(drawingPoints) {
        let { line, fidelity } = fitLineToPoints(drawingPoints);
        this.points = line;
        this.fidelity = fidelity;
    }
    getShapeParameters() {
        let x = (this.points[0].x + this.points[1].x) / 2;
        let y = (this.points[0].y + this.points[1].y) / 2;
        let dx = (this.points[1].x - this.points[0].x);
        let dy = (this.points[1].y - this.points[0].y);
        let slope = dy / dx;
        let angle = degrees(atan(-1 / slope));
        let length = dist(this.points[0].x, this.points[0].y, this.points[1].x, this.points[1].y);
        return { centerPosition: { x: x, y: y }, size: length, orientation: angle };
    }
    getSimilarityScores(curve, canvas) {
        return getSimilarityScores(this, curve, canvas);
    }
}

function getSimilarityScores(refShape, fitShape, canvas) {
    // log the shape type via the class name
    let shapeType = refShape.constructor.name;
    let sss = similarityScoreSensitivities[shapeType];
    let refParams = refShape.getShapeParameters();
    let fitParams = fitShape.getShapeParameters();
    let distance = dist(refParams.centerPosition.x, refParams.centerPosition.y, fitParams.centerPosition.x, fitParams.centerPosition.y);
    let orientationDifference = abs(refParams.orientation - fitParams.orientation);
    // console.log("ref angle: " + refParams.orientation + ", fit angle: " + fitParams.orientation + ", diff: " + orientationDifference);
    let sizeDifference = abs(refParams.size - fitParams.size);

    let decimals = 1;
    let locationScore = round(10 * Math.exp(-distance * distance / (canvas.width * canvas.width / sss.location )), decimals);
    let orientationScore = round(10 * Math.exp(-orientationDifference * orientationDifference / sss.orientation), decimals);
    // if shape is an ellipse, adjust orientation score to account for case of circle
    if (shapeType == "ShapeEllipse") {
        let aspectRatioRef = refShape.width / refShape.height;
        let aspectRatioFit = fitShape.width / fitShape.height;
        let aspectRatioDifference = abs(aspectRatioRef - aspectRatioFit);
        let aspectRatioScore = round(10 * Math.exp(-aspectRatioDifference * aspectRatioDifference / 0.1), decimals);
        let mixingFactor = 1 - aspectRatioRef; // 0 for circle, 1 for extreme ellipse
        // console.log("aspect ratio ref: " + aspectRatioRef + ", fit: " + aspectRatioFit + ", diff: " + aspectRatioDifference + ", score: " + aspectRatioScore);
        orientationScore = round((1-mixingFactor) * aspectRatioScore + mixingFactor * orientationScore, decimals);
    }
    let sizeScore = round(10 * Math.exp(-sizeDifference * sizeDifference / (refParams.size * refParams.size / sss.size)), decimals);
    let fidelity = round(10*fitShape.fidelity, decimals);
    let sumOfWeights = similarityScoreWeights.location + similarityScoreWeights.size + similarityScoreWeights.orientation + similarityScoreWeights.fidelity;
    let overallScore = round((locationScore * similarityScoreWeights.location
        + sizeScore * similarityScoreWeights.size
        + orientationScore * similarityScoreWeights.orientation
        + fidelity * similarityScoreWeights.fidelity) / sumOfWeights, decimals, decimals);
    return { overall: overallScore, location: locationScore, orientation: orientationScore, size: sizeScore, fidelity: fidelity };
}

function checkShapeFitsInCanvas(centerPosition, meanRadius, canvas, padding = 35) {
    let xmin = centerPosition.x - meanRadius - padding;
    let xmax = centerPosition.x + meanRadius + padding;
    let ymin = centerPosition.y - meanRadius - padding;
    let ymax = centerPosition.y + meanRadius + padding;
    if (xmin < 0 || xmax > canvas.width || ymin < 0 || ymax > canvas.height) {
        return false;
    }
    return true;
}

function normalizePoints(points) {
    let sumX = 0, sumY = 0;
    for (const point of points) {
        sumX += point.x;
        sumY += point.y;
    }

    const centroid = createVector(sumX / points.length, sumY / points.length);
    const normalizedPoints = points.map(p => p5.Vector.sub(p, centroid));

    return { normalizedPoints, centroid };
}

function covarianceMatrix(points) {
    const n = points.length;
    let sumX = 0, sumY = 0;

    for (const point of points) {
        sumX += point.x;
        sumY += point.y;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    let xx = 0, xy = 0, yy = 0;
    for (const point of points) {
        const dx = point.x - meanX;
        const dy = point.y - meanY;
        xx += dx * dx;
        xy += dx * dy;
        yy += dy * dy;
    }

    return { xx: xx / (n - 1), xy: xy / (n - 1), yy: yy / (n - 1) };
}

function solveEigenvalueProblem(matrix) {
    const A = [
        [matrix.xx, matrix.xy],
        [matrix.xy, matrix.yy]
    ];

    const { lambda, E } = numeric.eig(A);
    const eigenvalues = lambda.x;
    const eigenvectors = E.x;

    const eigenvalue1 = eigenvalues[0];
    const eigenvalue2 = eigenvalues[1];
    const eigenvector1 = createVector(eigenvectors[0][0], eigenvectors[1][0]);
    const eigenvector2 = createVector(eigenvectors[0][1], eigenvectors[1][1]);

    let majorEigenvalue, minorEigenvalue, majorEigenvector, minorEigenvector;

    if (eigenvalue1 > eigenvalue2) {
        majorEigenvalue = eigenvalue1;
        minorEigenvalue = eigenvalue2;
        majorEigenvector = eigenvector1;
        minorEigenvector = eigenvector2;
    } else {
        majorEigenvalue = eigenvalue2;
        minorEigenvalue = eigenvalue1;
        majorEigenvector = eigenvector2;
        minorEigenvector = eigenvector1;
    }

    return {
        majorEigenvalue,
        minorEigenvalue,
        majorEigenvector,
        minorEigenvector
    };
}

function bestFitEllipse(points) {
    let { normalizedPoints, centroid } = normalizePoints(points);
    let matrix = covarianceMatrix(normalizedPoints);
    let { majorEigenvalue, minorEigenvalue, majorEigenvector, minorEigenvector } = solveEigenvalueProblem(matrix);

    let a = Math.sqrt(2 * majorEigenvalue);
    let b = Math.sqrt(2 * minorEigenvalue);
    let angle = Math.atan2(majorEigenvector.y, majorEigenvector.x) - PI/2.0;
    if (angle < 0) {
        angle += PI;
    }
    if (angle < 0) {
        angle += PI;
    }    

    return {
        center: centroid,
        width: b * 2,
        height: a * 2,
        angle: angle
    };
}

// this function returns a value between 0 and 1
// 1 indicates a good fit, 0 indicates a bad fit
function computeRSquared(points, ellipse) {
    const { center, width, height, angle } = ellipse;
    const n = points.length;
    let sumX = 0, sumY = 0;
  
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
    }
  
    const centroid = createVector(sumX / n, sumY / n);
  
    let totalSumOfSquares = 0;
    let sumOfSquaredResiduals = 0;
  
    for (const point of points) {
      const dx = point.x - centroid.x;
      const dy = point.y - centroid.y;
      totalSumOfSquares += dx * dx + dy * dy;
  
      const angleToPoint = Math.atan2(dy, dx) - angle;
      const xRotated = Math.cos(angleToPoint) * Math.sqrt(dx * dx + dy * dy);
      const yRotated = Math.sin(angleToPoint) * Math.sqrt(dx * dx + dy * dy);
  
      const ellipseEquation = (xRotated * xRotated) / ((width / 2) * (width / 2)) + (yRotated * yRotated) / ((height / 2) * (height / 2));
      const distanceToEllipse = Math.abs(ellipseEquation - 1) * Math.sqrt((width * width + height * height) / 4);
      sumOfSquaredResiduals += distanceToEllipse * distanceToEllipse;
    }
    return Math.exp(-(sumOfSquaredResiduals / totalSumOfSquares)/0.2);
  }

class ShapeEllipse {
    constructor(centerPosition = { x: 0, y: 0 }, width = 10, height = 10, rotationAngle = 0) {
        this.centerPosition = centerPosition;
        this.width = width;
        this.height = height;
        this.rotationAngle = rotationAngle;
        this.meanRadius = sqrt(width * height / 4); // there are other equally valid ways to calculate this
        this.fidelity = null;
    }
    resetWithRandomParams(canvas) {
        let x = 0, y = 0, w, h;
        let xmin = canvas.width / 10;
        let xmax = canvas.width - canvas.width / 10;
        let ymin = canvas.height / 10;
        let ymax = canvas.height - canvas.height / 10;
        let radius = 10000;
        while (!checkShapeFitsInCanvas({ x: x, y: y }, radius, canvas)) {
            x = random(xmin, xmax);
            y = random(ymin, ymax);
            let d1 = random(canvas.width / 10, canvas.width / 3);
            let d2 = random(canvas.height / 10, canvas.height / 3);
            w = min(d1, d2);
            h = max(d1, d2);
            radius = sqrt(w * h / 4);
        }
        this.centerPosition = { x: x, y: y };
        this.width = w;
        this.height = h;
        let angle = random(0, PI);
        this.rotationAngle = random(0, PI);
        this.meanRadius = sqrt(this.width * this.height / 4)
    }
    updateWithFitToDrawing(drawingPoints) {
        let ellipse = bestFitEllipse(drawingPoints);
        this.centerPosition = { x: ellipse.center.x, y: ellipse.center.y };
        this.width = ellipse.width;
        this.height = ellipse.height;
        this.rotationAngle = ellipse.angle;
        this.meanRadius = sqrt(this.width * this.height / 4)
        this.fidelity = computeRSquared(drawingPoints, ellipse);
    }
    draw(canvas, style = "normal") {
        let c = color(styleParameters[style].lineColor);
        c.setAlpha(styleParameters[style].lineOpacity);
        canvas.push();
        canvas.noFill();
        canvas.stroke(c);
        canvas.strokeWeight(styleParameters[style].lineThickness);
        canvas.translate(this.centerPosition.x, this.centerPosition.y);
        canvas.rotate(this.rotationAngle);
        canvas.ellipse(0, 0, this.width, this.height);
        canvas.pop();
    }
    getShapeParameters() {
        return {
            centerPosition: this.centerPosition,
            size: this.meanRadius,
            orientation: degrees(this.rotationAngle)
        }
    }
    getSimilarityScores(shape, canvas) {
        return getSimilarityScores(this, shape, canvas);
    }
}


