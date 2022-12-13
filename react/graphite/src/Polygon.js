export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  diff = (other:Point): Point => {
    return new Point(this.x - other.x, this.y - other.y);
  }

  // Returns the Manhattan distance between two points
  manhattanDistance = (other: Point) => {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  near = (other: Point, dist: number) => {
    return this.manhattanDistance(other) < dist;
  }
}

// Represents convex polygons on the canvas
export class Polygon {
  vertices: Point[];

  constructor(vertices: Point[]) {
    this.vertices = vertices;
  }

  translate(diff: Point) {
    for (let i = 0; i < this.vertices.length; i++) {
      let vert = this.vertices[i];
      vert.x += diff.x;
      vert.y += diff.y;
    }
  }

  translatePoint(diff: Point, i: number): number {
    let vert = this.vertices[i];
    vert.x += diff.x;
    vert.y += diff.y;
    return i;
  }

  // This method determines if a point is inside the polygon using a ray
  // casting algorithm.
  contains(point: Point): boolean {
    // Create a ray from the point in question to any point outside the
    // polygon. We have arbitrarily chosen the origin.
    const ray = new Point(0, 0);

    let intersections = 0;
    for (let i = 0; i < this.vertices.length; i++) {
      const p1 = this.vertices[i];
      const p2 = this.vertices[(i + 1) % this.vertices.length];

      // Check if the ray intersects with the current edge
      if (this.rayIntersectsSegment(point, ray, p1, p2)) {
        intersections++;
      }
    }

    // If the number of intersections is odd, the point is inside the polygon
    return intersections % 2 === 1;
  }

  // Check if a ray intersects with a line segment.
  rayIntersectsSegment(p: Point, r: Point, p1: Point, p2: Point): boolean {
    // Check if the ray is parallel to the line segment
    if ((r.y - p.y) / (r.x - p.x) === (p2.y - p1.y) / (p2.x - p1.x)) {
      return false;
    }
    // Check if the ray intersects with the line segment
    const t = (p1.x + (p2.y - p1.y) * (r.x - p.x) / (r.y - p.y) - p.x) / (p2.x - p1.x);
    return t >= 0 && t <= 1;
  }

  boundingRect() {
    let xmin = this.vertices[0];
    let xmax = this.vertices[0];
    let ymin = this.vertices[0];
    let ymax = this.vertices[0];
    
    for (let i = 1; i < this.vertices.length; i++) {
      let vert = this.vertices[i];
      if (vert.x < xmin) {
        xmin = vert.x;
      }
      if (vert.x > xmax) {
        xmax = vert.x;
      }
      if (vert.y < ymin) {
        ymin = vert.y;
      }
      if (vert.y < ymax) {
        ymax = vert.y;
      }
    }

    return new Rectangle(xmin, ymin, xmax, ymax);
  }
}

export function biggestIntersectingFraction(boxes: Array<[number, Polygon]>) {
  let max_intersection = null;
  for (let i = 0; i < boxes.length; i++) {
    let [index1, box1] = boxes[i];
    let rect1 = box1.boundingRect();
    let rect1_area = rect1.area();

    for (let j = 0; j < boxes.length; j++) {
      if (j === i) { continue; }
      let [index2, box2] = boxes[j];
      let rect2 = box2.boundingRect();
      let intersect = rect1.getIntersection(rect2);
      if (intersect) {
        let rect2_area = rect2.area();

        let inter_area = intersect.area();
        console.log("inter", intersect);
        let a1 = rect1_area / inter_area;
        let a2 = rect2_area / inter_area;
        
        if (a1 >= a2 || !max_intersection || a1 > max_intersection[1]) {
          console.log("a1", a1);
          max_intersection = [index1, box1];
        } else if (!max_intersection || a2 > max_intersection[1]) {
          console.log("a2", a2);
          max_intersection = [index1, box1];
          max_intersection = [index2, box2];
        }
      }
    }
  }
  return max_intersection
}

export class Rectangle extends Polygon {
  // The constructor takes the coordinates of the upper-left and lower-right
  // corners of the rectangle as input
  constructor(pTL: Point, pBR: Point) {
    // Initialize the vertices array with the four corners of the rectangle
    let pTR = new Point(pBR.x, pTL.y); 
    let pBL = new Point(pTL.x, pBR.y);
    super([pTL, pTR, pBR, pBL]);
  }

  translatePoint(diff: Point, i: number): number {
    let top = this.vertices[0].y;
    let left = this.vertices[0].x;
    let right = this.vertices[1].x;
    let bottom = this.vertices[2].y;

    if (i === 0) {
      //topLeft
      top += diff.y;
      left += diff.x;
    } else if (i === 1) {
      //topRight
      top += diff.y;
      right += diff.x;
    } else if (i === 2) {
      //bottomRight
      bottom += diff.y
      right += diff.x;
    } else {
      //bottomLeft
      bottom += diff.y
      left += diff.x;
    }

    if (left > right) {
      let tmp = left;
      left = right;
      right = tmp;

      if (i === 0) {
        i = 1;
      } else if (i === 1) {
        i = 0;
      } else if (i === 2) {
        i = 3;
      } else {
        i = 2;
      }
    }

    if (top > bottom) {
      let tmp = top;
      top = bottom;
      bottom = tmp;

      if (i === 0) {
        i = 3;
      } else if (i === 1) {
        i = 2;
      } else if (i === 2) {
        i = 1;
      } else {
        i = 0;
      }
    }

    this.vertices[0] = new Point(left, top);
    this.vertices[1] = new Point(right, top);
    this.vertices[2] = new Point(right, bottom);
    this.vertices[3] = new Point(left, bottom);
    return i;
  }

  setBottomRight = (bottomRight: Point) => {
    this.vertices[2] = bottomRight;
    this.sortPoints();
  }

  sortPoints() {
    let topLeft = this.vertices[0];
    let topRight = this.vertices[1];
    let bottomRight = this.vertices[2];
    let bottomLeft = this.vertices[3];

    let left = Math.min(topLeft.x, topRight.x, bottomRight.x, bottomLeft.x);
    let right = Math.max(topLeft.x, topRight.x, bottomRight.x, bottomLeft.x);
    let top = Math.min(topLeft.y, topRight.y, bottomRight.y, bottomLeft.y); 
    let bottom = Math.max(topLeft.y, topRight.y, bottomRight.y, bottomLeft.y); 

    this.vertices = [
      new Point(left, top),
      new Point(right, top),
      new Point(right, bottom),
      new Point(left, bottom)
    ];
  };

  width() {
    return this.vertices[1].x - this.vertices[0].x
  }

  height() {
    return this.vertices[2].y - this.vertices[0].y
  }

  boundingRect() {
    return this;
  }

  contains(point: Point): bool {
    let left = this.vertices[0].x;
    let right = this.vertices[1].x;
    let top = this.vertices[0].y;
    let bottom = this.vertices[2].y;
    return ((point.x >= left && point.x <= right) &&
      (point.y >= top && point.y <= bottom));
  }

  area() {
    return this.height() * this.width();
  }

  getIntersection = (rect: Rectangle): Rectangle | null => {
    let left1 = this.vertices[0].x;
    let right1 = this.vertices[1].x;
    let top1 = this.vertices[0].y;
    let bottom1 = this.vertices[2].y;

    let left2 = this.vertices[0].x;
    let right2 = this.vertices[1].x;
    let top2 = this.vertices[0].y;
    let bottom2 = this.vertices[2].y;

    // Check if the rectangles intersect
    if (
      left1 > right2 ||
      right1 < left2 ||
      top1 > bottom2 ||
      bottom1 < top2
    ) {
      return null;
    }

    // The rectangles intersect, so calculate the coordinates of the intersection
    let left = Math.max(left1, left2);
    let right = Math.min(right1, right2);
    let top = Math.max(top1, top2);
    let bottom = Math.min(bottom1, bottom2);

    // Create and return a new Rect object representing the intersection of the two rectangles
    return new Rectangle(
      new Point(left, top),
      new Point(bottom, right),
    );
  }
}
