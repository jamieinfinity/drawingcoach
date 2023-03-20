
const styleParameters = {
    normal: {
        lineColor: 0,
        lineOpacity: 255,
        lineThickness: 4,
    },
    reference: {
        // make line orange
        lineColor: "#ffc300",
        lineOpacity: 200,
        lineThickness: 4,
    },
    fit: {
        // make line green
        lineColor: "#2ec4b6",
        lineOpacity: 255,
        lineThickness: 5,
    }
}
const scoreWeights = {
    location: 2,
    length: 1,
    angle: 1,
    smoothness: 0.5
}

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

    function lineFunctin(p) {
        let x = p.x;
        let y = p.y;
        let xprime = x + beta1 * (y - beta0 - beta1 * x) / (1 + beta1 * beta1);
        let yprime = beta0 + beta1 * xprime;
        return { x: xprime, y: yprime };
    }
    let pstart = lineFunctin({ x: points[0].x, y: points[0].y });
    let pend = lineFunctin({ x: points[n - 1].x, y: points[n - 1].y });

    // find the RMSE by using lineFunction to find the distance from each point to the line
    let rmse = 0;
    for (let i = 0; i < n; i++) {
        let p = points[i];
        let pprime = lineFunctin(p);
        rmse += dist(p.x, p.y, pprime.x, pprime.y);
    }
    rmse /= n;

    return { line: [pstart, pend], rmse: rmse }
}

class CurveSimpleLine {
    constructor(points = []) {
        this.points = points;
        this.rmse = null;
    }
    draw(canvas, style = "normal") {
        let c = color(styleParameters[style].lineColor);
        c.setAlpha(styleParameters[style].lineOpacity);
        canvas.stroke(c);
        canvas.strokeWeight(styleParameters[style].lineThickness);
        canvas.line(this.points[0].x, this.points[0].y, this.points[1].x, this.points[1].y);
    }
    updateWithRandomCurve(canvas) {
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
        this.rmse = null;
    }
    updateWithFitToDrawing(drawingPoints) {
        let { line, rmse } = fitLineToPoints(drawingPoints);
        this.points = line;
        this.rmse = rmse;
    }
    getCurveParameters() {
        let x = (this.points[0].x + this.points[1].x) / 2;
        let y = (this.points[0].y + this.points[1].y) / 2;
        let dx = (this.points[1].x - this.points[0].x);
        let dy = (this.points[1].y - this.points[0].y);
        let slope = dy / dx;
        let angle = degrees(atan(-1 / slope));
        let length = dist(this.points[0].x, this.points[0].y, this.points[1].x, this.points[1].y);
        return { centerPosition: { x: x, y: y }, length: length, angle: angle };
    }
    getSimilarityScores(curve, canvas) {
        let parameters1 = this.getCurveParameters();
        let parameters2 = curve.getCurveParameters();
        let distance = dist(parameters1.centerPosition.x, parameters1.centerPosition.y, parameters2.centerPosition.x, parameters2.centerPosition.y);
        let angleDifference = abs(parameters1.angle - parameters2.angle);
        let lengthDifference = abs(parameters1.length - parameters2.length);
        // console.log("distance: " + distance + ", angleDifference: " + angleDifference + ", lengthDifference: " + lengthDifference, ", rmse: " + curve.rmse);

        let decimals = 1;
        let locationScore = round(10 * Math.exp(-distance * distance / (canvas.width * canvas.width / 300)), decimals);
        let angleScore = round(10 * Math.exp(-angleDifference * angleDifference / (10 * 10)), decimals);
        let lengthScore = round(10 * Math.exp(-lengthDifference * lengthDifference / (parameters1.length * parameters1.length / 40)), decimals);
        let smoothnessScore = round(10 * Math.exp(-curve.rmse / (parameters1.length / 40)), decimals);
        let sumOfWeights = scoreWeights.location + scoreWeights.length + scoreWeights.angle + scoreWeights.smoothness;
        let overallScore = round((locationScore * scoreWeights.location
            + lengthScore * scoreWeights.length
            + angleScore * scoreWeights.angle
            + smoothnessScore * scoreWeights.smoothness) / sumOfWeights, decimals, decimals);
        return { overall: overallScore, location: locationScore, angle: angleScore, length: lengthScore, smoothness: smoothnessScore };
    }
}

class BlobShape {
    constructor(canvasSize, noiseScale, canvasSector) {
        this.noiseScale = noiseScale;
        this.canvasSize = canvasSize;
        this.vertices = this.generateBlob(canvasSize, noiseScale, canvasSector);
    }
    // canvasSector is an integer between 1 and 9 representing the 3x3 grid of the canvas
    generateBlob(canvasSize, noiseScale, canvasSector) {
        // set random values for numVertices, radius, x, y
        const numVertices = 10;
        const radius = random(canvasSize / 10., canvasSize / 5.)
        const sectorSize = canvasSize / 3;
        const sectorX = (canvasSector - 1) % 3;
        const sectorY = Math.floor((canvasSector - 1) / 3);
        // assign random location within the canvas sector
        const x = random(radius/2, sectorSize - radius/2) + sectorX*sectorSize;
        const y = random(radius/2, sectorSize - radius/2) + sectorY*sectorSize;

        // Generate a set of random angles to use as the base for the vertices
        const angles = [];
        for (let i = 0; i < numVertices; i++) {
            angles.push(Math.random() * Math.PI * 2);
        }

        // Generate a set of noise values to use as the offsets from the base vertices
        const offsets = [];
        for (let i = 0; i < numVertices; i++) {
            const nx = x + radius * Math.cos(angles[i]);
            const ny = y + radius * Math.sin(angles[i]);
            offsets.push(noise(nx * noiseScale, ny * noiseScale));
        }

        // Create the vertices of the blob
        const vertices = [];
        for (let i = 0; i < numVertices; i++) {
            const angle = angles[i];
            const offset = offsets[i];
            const vx = x + radius * Math.cos(angle) * offset;
            const vy = y + radius * Math.sin(angle) * offset;
            vertices.push(createVector(vx, vy));
        }

        vertices.sort((a, b) => Math.atan2(b.y - y, b.x - x) - Math.atan2(a.y - y, a.x - x));

        // Apply the Chaikin algorithm to smooth the boundary
        let numIterations = 10;
        for (let i = 0; i < numIterations; i++) {
            const newVertices = [];
            const n = vertices.length;

            for (let j = 0; j < n; j++) {
                const p0 = vertices[j];
                const p1 = vertices[(j + 1) % n];

                const q0 = p5.Vector.lerp(p0, p1, 1 / 4);
                const q1 = p5.Vector.lerp(p0, p1, 3 / 4);

                newVertices.push(q0, q1);
            }
            vertices.splice(0, vertices.length, ...newVertices);
        }
        vertices.sort((a, b) => Math.atan2(b.y - y, b.x - x) - Math.atan2(a.y - y, a.x - x));

        return vertices;
    }
    draw(canvas) {
        canvas.stroke(180);
        canvas.strokeWeight(1);
        canvas.fill(235);
        canvas.beginShape();
        for (let i = 0; i < this.vertices.length; i++) {
            canvas.curveVertex(this.vertices[i].x, this.vertices[i].y);
        }
        canvas.endShape(CLOSE);
    }
}