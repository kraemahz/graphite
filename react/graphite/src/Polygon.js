export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  diff = (other: Point): Point => {
    return new Point(this.x - other.x, this.y - other.y);
  }

  // Returns the Manhattan distance between two points
  manhattanDistance = (other: Point) => {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  near = (other: Point, dist: number) => {
    return this.manhattanDistance(other) < dist;
  }

  dot = (other: Point): number => {
    return this.x * other.x + this.y * other.y
  }

  cross = (other: Point): number => {
    return this.x * other.y - this.y * other.x;
  }

  slope = (other: Point): number => {
    return (other.y - this.y) / (other.x - this.x);
  }

  offset = (other: Point): number => {
    let s = this.slope(other);
    return this.y - s * this.x
  }
}


// Represents convex polygons on the canvas
export class Polygon {
  vertices: Point[];

  constructor(vertices: Point[]) {
    this.vertices = vertices;
    this.text = "";
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
    let bounding = this.boundingRect();
    if (!bounding.contains(point)) {
      return false;
    }

    // Create a ray from the point in question to any point outside the
    // polygon. We have arbitrarily chosen the origin.
    const ray = new Point(0, 0);
    let intersections = 0;

    for (let i = 0; i < this.vertices.length; i++) {
      const p1 = this.vertices[i];
      const p2 = this.vertices[(i + 1) % this.vertices.length];

      // Check if the ray intersects with the current edge
      if (this.rayIntersectsSegment(point, ray, p1, p2)) {
        intersections += 1;
      }
    }
    return (intersections % 2) === 1;
  }

  // Check if a ray intersects with a line segment.
  rayIntersectsSegment(p: Point, t: Point, q: Point, u: Point): boolean {
    let m1 = p.slope(t);
    let m2 = q.slope(u);

    if (m1 === Number.POSITIVE_INFINITY ||
        m1 === Number.NEGATIVE_INFINITY ||
        m2 === Number.NEGATIVE_INFINITY ||
        m2 === Number.POSITIVE_INFINITY) {
      // Slope is straight up and down, check that the y crosses through it.
      if (q.y > u.y) {
        return p.y >= u.y && p.y <= q.y;
      } else {
        return p.y >= q.y && p.y <= u.y;
      }
    }

    let b1 = p.offset(t);
    let b2 = q.offset(u);

    // Parallel lines cannot cross. (Also this divides by 0)
    if (m1 === m2) {
      return false;
    }

    let x = (b1 - b2) / (m2 - m1);
    let y = (b1 * m2 - b2 * m1) / (m2 - m1);
    let x0, x1;

    // Point is on the line between segments.
    if (q.x > u.x) {
      x0 = u.x;
      x1 = q.x;
    } else {
      x0 = q.x;
      x1 = u.x;
    }

    let onSegment;
    if (m2 < 0) {
      let y0 = m2 * x1 + b2;
      let y1 = m2 * x0 + b2;
      onSegment = ((x >= x0 && x <= x1) && (y >= y0 && y <= y1));
    } else {
      let y0 = m2 * x0 + b2;
      let y1 = m2 * x1 + b2;
      onSegment = ((x >= x0 && x <= x1) && (y >= y0 && y <= y1));
    }
    let onRay = ((x / p.x) < 1 && (y / p.y) < 1);
    return onSegment && onRay;
  }

  boundingRect() {
    let xmin = this.vertices[0].x;
    let xmax = this.vertices[0].x;
    let ymin = this.vertices[0].y;
    let ymax = this.vertices[0].y;
    
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
      if (vert.y > ymax) {
        ymax = vert.y;
      }
    }

    return new Rectangle(new Point(xmin, ymin), new Point(xmax, ymax));
  }

  scale = (func) => {
    let vertices = [];
    for (let i = 0; i < this.vertices.length; i++) {
      vertices.push(func(this.vertices[i]));
    }
    return new Polygon(vertices);
  };
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
        let a1 = rect1_area / inter_area;
        let a2 = rect2_area / inter_area;
        
        if (a1 >= a2 || !max_intersection || a1 > max_intersection[1]) {
          max_intersection = [index1, box1];
        } else if (!max_intersection || a2 > max_intersection[1]) {
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
  }

  left() {
    return this.vertices[0].x;
  }

  right() {
    return this.vertices[1].x;
  }

  top() {
    return this.vertices[0].y;
  }

  bottom() {
    return this.vertices[2].y;
  }

  width() {
    return this.vertices[1].x - this.vertices[0].x
  }

  height() {
    return this.vertices[2].y - this.vertices[0].y
  }

  boundingRect() {
    return this;
  }

  scale = (func): Rectangle => {
    let tl = func(this.vertices[0]);
    let br = func(this.vertices[2]);
    return new Rectangle(tl, br);
  }

  contains(point: Point): bool {
    let left = this.vertices[0].x;
    let top = this.vertices[0].y;
    let right = this.vertices[2].x;
    let bottom = this.vertices[2].y;
    let has_point = ((point.x >= left && point.x <= right) &&
      (point.y >= top && point.y <= bottom));
    return has_point;
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
