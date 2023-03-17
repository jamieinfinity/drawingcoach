
const styleParameters = {
    reference: {
        lineColor: 0,
        lineThickness: 4,
    },
    compare: {
        lineColor: 200,
        lineThickness: 4,
    }
}

class CurveSimpleLine {
    constructor(canvas, points=[]) {
        this.points = points;
        if (this.points.length == 0) {
            this.makeRandomCurve(canvas);
        }
    }
    makeRandomCurve(canvas) {
        let x1 = random(0, canvas.width);
        let y1 = random(0, canvas.height);
        let x2 = random(0, canvas.width);
        let y2 = random(0, canvas.height);
        this.points = [{x: x1, y: y1}, {x: x2, y: y2}];
    }
    getCurveParameters() {
        let x = (this.points[0].x + this.points[1].x) / 2;
        let y = (this.points[0].y + this.points[1].y) / 2;
        let angle = atan2(this.points[1].y - this.points[0].y, this.points[1].x - this.points[0].x);
        angle = angle * 180 / PI;
        let length = dist(this.points[0].x, this.points[0].y, this.points[1].x, this.points[1].y);
        return {centerPosition: {x: x, y: y}, length: length, angle: angle};
    }
    draw(canvas, style="reference") {
        canvas.stroke(styleParameters[style].lineColor);
        canvas.strokeWeight(styleParameters[style].lineThickness);
        canvas.line(this.points[0].x, this.points[0].y, this.points[1].x, this.points[1].y);
    }

}