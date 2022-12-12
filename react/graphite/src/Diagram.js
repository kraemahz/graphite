// import ColorPicker, { useColor } from "react-color-palette";
import PropTypes from "prop-types";
import React from 'react';
import { LazyPoint } from "lazy-brush";
import CoordinateSystem from "./CoordinateSystem";
import drawImageExtents from "./drawImage";
import {Point, Polygon, Rectangle, biggestIntersectingFraction} from "./Polygon";

function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2,
  };
}

const canvasStyle = {
  display: "block",
  position: "absolute",
};

const canvasTypes = ["grid", "drawing", "interface"];
const dimensionsPropTypes = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.string,
]);

export default class Diagram extends React.Component {
  static propTypes = {
    onChange: PropTypes.func,
    canvasWidth: dimensionsPropTypes,
    canvasHeight: dimensionsPropTypes,
    imgSrc: PropTypes.string,
    fileData: PropTypes.string
  }

  static defaultProps = {
    onChange: null,
    canvasWidth: 1600,
    canvasHeight: 800,
    imgSrc: "",
    fileData: null
  }

  constructor(props) {
    super(props);

    this.canvas = {};
    this.ctx = {};
    this.coordSystem = new CoordinateSystem ({
      scaleExtents: props.zoomExtents,
      documentSize: { width: props.canvasWidth, height: props.canvasHeight },
    });

    this.mouseHasMoved = true;
    this.valuesChanged = true;

    this.mode = "";
    this.selected = null;
    this.boxes = [];
    this.lastPoint = null;
    this.scale = 1.0;

    this.imageSrc = this.props.imageSrc;
    this.fileInput = React.createRef();
  }

  componentDidMount() {
    this.point = new LazyPoint(window.innerWidth / 2, window.innerHeight / 2);
    this.canvasObserver = new ResizeObserver((entries, observer) =>
      this.handleCanvasResize(entries, observer)
    );
    this.canvasObserver.observe(this.canvasContainer);
    this.extentsWidth = this.props.canvasWidth;
    this.extentsHeight = this.props.canvasHeight;
  }

  componentDidUpdate() {
  }

  saveData = () => {
    console.log("TODO");
  }
  
  /// Canvas rendering

  drawImage = () => {
    if (!this.imageSrc) return;

    // Load the image
    this.image = new Image();

    // Prevent SecurityError "Tainted canvases may not be exported." #70
    this.image.crossOrigin = "anonymous";

    // Draw the image once loaded
    this.image.onload = this.redrawImage;
    this.image.src = this.imageSrc;
    this.boxes = [];
  };

  redrawImage = () => {
    if (this.image && this.image.complete) {
      // First reset the canvas to its maximum dimensions
      this.setCanvasSize(this.canvas.grid, this.extentsWidth, this.extentsHeight); 
      let [w, h] = drawImageExtents({ ctx: this.ctx.grid, img: this.image });
      // fill image in dest. rectangle
      this.resizeAllCanvases(w, h);
      this.ctx.grid.drawImage(this.image, 0, 0, w, h);
      this.redrawPolygons();
    }
  };

  redrawPolygons = () => {
    let canvas = this.canvas.drawing;
    let ctx = this.ctx.drawing;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < this.boxes.length; i++) {
      if (this.selected === i) {
        ctx.fillStyle = 'rgba(144, 238, 144, 0.3)';
      } else {
        ctx.fillStyle = 'rgba(238, 144, 238, 0.3)';
      }
      let box = this.boxes[i];
      ctx.beginPath();
      let firstPoint = box.vertices[0];
      ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let j = 1; j < box.vertices.length; j++) {
        let point = box.vertices[j];
        ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  handleFileChange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    const parent = this;

    reader.onload = function(event) {
      parent.imageSrc = event.target.result;
      parent.drawImage();
    }
    
    reader.readAsDataURL(file);
  }
  
  resizeAllCanvases = (width, height) => {
      this.setCanvasSize(this.canvas.interface, width, height);
      this.setCanvasSize(this.canvas.drawing, width, height);
      this.setCanvasSize(this.canvas.grid, width, height);
  }

  handleCanvasResize = (entries) => {
    this.deferRedrawOnViewChange = true;
    try {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.resizeAllCanvases(width, height);
        this.coordSystem.documentSize = { width, height };

        this.drawImage();
      }
    } finally {
      this.deferRedrawOnViewChange = false;
    }
  };

  setCanvasSize = (canvas, width, height) => {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width;
    canvas.style.height = height;
  };

  handleDrawStart = (e) => {
    const canvas = this.canvas.interface;
    const point = pointFromEvent(e, canvas);
    const context = this.ctx.interface;

    // Extents edge
    context.globalCompositeOperation = "destination-over";
    context.lineWidth = 2;
    context.strokeStyle="#FF0000";
    context.strokeRect(0, 0, canvas.width, canvas.height);//for white background
    this.mode = "draw";

    if (this.selected !== null) {
      const box = this.boxes[this.selected];
      if (box.contains(point)) {
        this.mode = "move";
      }
      for (let i = 0; i < box.vertices.length; i++) {
        const vertex = box.vertices[i];
        if (point.near(vertex, 9)) {
          this.mode = "resize";
          this.corner = i;
        }
      }
    }
    console.log("mode", this.mode);

    this.lastPoint = point;
    if (this.mode === "draw") {
      this.boxes.push(new Rectangle(point, point));
    }
  }

  handleDrawMove = (e) => {
    let canvas = this.canvas.interface;
    let point = pointFromEvent(e, canvas);
    if (this.mode === "draw") {
      let box = this.boxes[this.boxes.length - 1];
      box.setBottomRight(point);
    } else if (this.mode === "move") {
      let diff = point.diff(this.lastPoint);
      let box = this.boxes[this.selected];
      box.translate(diff);
      this.lastPoint = point;
    } else if (this.mode === "resize") {
      let diff = point.diff(this.lastPoint);
      let box = this.boxes[this.selected];
      this.corner = box.translatePoint(diff, this.corner);
      this.lastPoint = point;
    }
    this.redrawPolygons();
  }

  handleDrawEnd = (e) => {
    let canvas = this.canvas.interface
    this.ctx.interface.clearRect(0, 0, canvas.width, canvas.height);
    let point = pointFromEvent(e, canvas);

    if (this.mode === "draw") {
      let dist = this.lastPoint.manhattanDistance(point);
      if (dist < 3) {
        this.boxes.pop();
        let selected_candidates = [];
        for (let i = 0; i < this.boxes.length; i++) {
          const box = this.boxes[i];
          if (box.contains(point)) {
            selected_candidates.push([i, box]);
          }
        }

        if (selected_candidates.length > 1) {
          // Pick the rectangle which contributes largest fraction to the intersection area.
          // We do this so small rectangles can be selected from under bigger rectangles.
          this.selected = biggestIntersectingFraction(selected_candidates)[0];
        } else if (selected_candidates.length === 1) {
          this.selected = selected_candidates[0][0];
        }

      } else {
        // Select the newly created rectangle.
        this.selected = this.boxes.length - 1;
      }
    }

    this.mode = "";
    this.lastPoint = null;
    this.corner = null;
    this.redrawPolygons();
  }

  render() {
    return (
      <div className={this.props.className}>
        <div>
          <input type="file" ref={this.fileInput} onChange={this.handleFileChange} />
          <button onClick={this.saveData}>Save</button>
        </div>
        <div
          ref={(container) => {
            if (container) {
              this.canvasContainer = container;
            }
          }}
          style={{
            display: "block",
            background: this.props.backgroundColor,
            touchAction: "none",
            width: this.props.canvasWidth,
            height: this.props.canvasHeight,
            ...this.props.style,
          }}
        >
          {canvasTypes.map((name) => {
            return (
              <canvas
                key={name}
                ref={(canvas) => {
                  if (canvas) {
                    this.canvas[name] = canvas;
                    this.ctx[name] = canvas.getContext("2d");
                    this.coordSystem.canvas = canvas;
                  }
                }}
                style={{ ...canvasStyle }}
                onMouseDown={this.handleDrawStart}
                onMouseMove={this.handleDrawMove}
                onMouseUp={this.handleDrawEnd}
                onMouseOut={this.handleDrawEnd}
                onTouchStart={this.handleDrawStart}
                onTouchMove={this.handleDrawMove}
                onTouchEnd={this.handleDrawEnd}
                onTouchCancel={this.handleDrawEnd}
              />
            );
          })}
        </div>
      </div>
    );
  }
}

export class SyntheticEvent {
  constructor({ clientX, clientY }) {
    this.clientX = clientX;
    this.clientY = clientY;
    this.touches = [ { clientX, clientY } ];
  }

  preventDefault = () => {};
}

export function pointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    let point = clientPointFromEvent(e);
    return new Point(point.x - rect.left, point.y - rect.top);
}

export function clientPointFromEvent(e) {
  // use cursor pos as default
  let clientX = e.clientX;
  let clientY = e.clientY;

  // use first touch if available
  if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  }

  return new Point(clientX, clientY);
}
