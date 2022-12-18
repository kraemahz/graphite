import {Point, Polygon} from "./Polygon"

export function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2,
  };
}


export class Coordinates {
  constructor(width, height, display_width, display_height) {
    this.width = width;
    this.height = height;
    this.display_width = display_width;
    this.display_height = display_height;
  }

  from_display_point = (p: Point) => {
    const x_fract = this.width / this.display_width;
    const y_fract = this.height / this.display_height;

    return new Point(Math.round(p.x * x_fract),
                     Math.round(p.y * y_fract));
  }

  to_display_point = (p: Point) => {
    const x_scale = this.display_width / this.width;
    const y_scale = this.display_height / this.height;

    return new Point(Math.round(p.x * x_scale),
                     Math.round(p.y * y_scale));
  }

  from_display_poly = (p: Polygon): Polygon => {
    return p.scale(this.from_display_point);
  }

  to_display_poly = (p: Polygon): Polygon => {
    return p.scale(this.to_display_point);
  }
}
