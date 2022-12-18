import PropTypes from "prop-types";
import React, {useRef} from 'react';
import drawImageExtents from "./drawImage";
import {Point, Polygon, Rectangle, biggestIntersectingFraction} from "./Polygon";
import Modal from './Modal';
import {midPointBtw, Coordinates} from "./Coordinates";
import * as piexif from "./piexif";


const canvasStyle = {
  display: "block",
  position: "absolute",
};

const canvasTypes = ["grid", "drawing", "interface"];
const dimensionsPropTypes = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.string,
]);

function debounce(func, timeout) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const modalStyle = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

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
    this.mouseHasMoved = true;
    this.valuesChanged = true;

    this.mode = "";
    this.selected = null;
    this.boxes = [];
    this.lastPoint = null;
    this.scale = 1.0;
    this.lastKeyTimeStamp = 0;
    this.cursorPositon = new Point(0, 0);
    this.state = {
      enteringText: "",
      modalIsVisible: false, 
    };

    this.imageSrc = this.props.imageSrc;
    this.exifData = {"Exif": {}};
    this.fileInput = React.createRef();
  }

  componentDidMount() {
    this.canvasObserver = new ResizeObserver((entries, observer) =>
      this.handleCanvasResize(entries, observer)
    );
    this.canvasObserver.observe(this.canvasContainer);
    this.extentsWidth = this.props.canvasWidth;
    this.extentsHeight = this.props.canvasHeight;

    let deleteBox = debounce((visible, selected) => {
      if (!visible && selected !== null) {
        this.boxes.splice(selected, 1);
        this.selected = null;
        this.redrawPolygons();
      }
    }, 300);

    let addPoint = debounce((visible, selected) => {
      if (!visible && selected !== null) {
        let box = this.boxes[selected];
        if (box instanceof Polygon) {
          this.boxes[selected].vertices.push(this.cursorPositon);
        }
        this.redrawPolygons();
      }
    }, 300);

    let togglePolygon = debounce((visible, selected) => {
      if (!visible && selected !== null) {
        let box = this.boxes[selected];
        if (box instanceof Rectangle) {
          this.boxes[selected] = new Polygon(box.vertices);
        } else {
          this.boxes[selected] = box.boundingRect();
        }
        this.redrawPolygons();
      }
    }, 300);

    let setBoxText = debounce((visible, selected) => {
      if (!visible) {
        this.setState({modalIsVisible: true});
      }
    }, 300);

    window.addEventListener("keydown",  (event) => {
      if (this.selected !== null && event.timeStamp !== this.lastKeyTimeStamp) {
        this.lastKeyTimeStamp = event.timeStamp;
        if (event.key === "Delete" || event.key === "Backspace") {
          deleteBox(this.state.modalIsVisible, this.selected);
        } else if (event.key === "a") {
          addPoint(this.state.modalIsVisible, this.selected);
        } else if (event.key === "f") {
          togglePolygon(this.state.modalIsVisible, this.selected);
        } else if (event.key === "Enter") {
          setBoxText(this.state.modalIsVisible, this.selected);
        }
      }
    });
  }

  componentDidUpdate() {
  }

  saveData = () => {
    let blob = {"boxes": []};
    for (let i = 0; i < this.boxes.length; i++) {
      let box = this.boxes[i];
      if (box instanceof Rectangle) {
        let tl = box.vertices[0];
        let br = box.vertices[2];
        blob["boxes"].push(
          {"top_left": [tl.x, tl.y], "bottom_right": [br.x, br.y], "text": box.text}
        );
      } else {
        let points = [];
        for (let i = 0; i < box.vertices.length; i++) {
          let point = box.vertices[i];
          points.push([point.x, point.y]);
        }
        blob["boxes"].push(
          {"points": points, "text": box.text}
        );
      }
    }

    let json_blob = JSON.stringify(blob);
    this.exifData["Exif"]["65000"] = json_blob;
    const exifString = piexif.dump(this.exifData);
    const newSrc = piexif.insert(exifString, this.image.src);

    // Do some horrific DOM manipulation. Seriously look away, this is gross.
    const anchor = document.createElement('a');
    anchor.href = newSrc;
    anchor.download = "result.jpg";
    anchor.click();
  }
  
  /// Canvas rendering

  drawImage = () => {
    if (!this.imageSrc) return;

    // Clear stored data
    this.boxes = [];
    this.selected = null;

    // Load the image
    this.image = new Image();

    // Prevent SecurityError "Tainted canvases may not be exported." #70
    this.image.crossOrigin = "anonymous";

    // Draw the image once loaded
    this.image.onload = this.redrawImage;
    this.image.src = this.imageSrc;

    this.exifData = piexif.load(this.image.src);
    let blob = this.exifData["Exif"]["65000"];
    if (!blob) {
      return;
    }
    let metadata = JSON.parse(blob);

    if (metadata) {
      for (let i = 0; i < metadata.boxes.length; i++) {
        let box = metadata.boxes[i];
        if ('points' in box) { // Corners for rectangle
          let points = [];
          for (let i = 0; i < box.points.length; i++) {
            let point = box.points[i];
            points.push(new Point(point[0], point[1]));
          }
          let poly = new Polygon(points);
          poly.text = box.text;
          this.boxes.push(poly);
        } else {
          let rect = new Rectangle(new Point(box.top_left[0], box.top_left[1]),
                                   new Point(box.bottom_right[0], box.bottom_right[1]));
          rect.sortPoints();
          rect.text = box.text;
          this.boxes.push(rect);
        }
      }
    }
  };

  redrawImage = () => {
    if (this.image && this.image.complete) {
      // First reset the canvas to its maximum dimensions
      this.setCanvasSize(this.canvas.grid, this.extentsWidth, this.extentsHeight); 
      let [w, h] = drawImageExtents({ ctx: this.ctx.grid, img: this.image });
      // fill image in dest. rectangle
      this.resizeAllCanvases(w, h);
      this.coords = new Coordinates(
        this.image.width,
        this.image.height,
        w,
        h
      );
      this.ctx.grid.drawImage(this.image, 0, 0, w, h);
      this.redrawPolygons();
    }
  };

  redrawPolygons = () => {
    if (!this.coords) {
      return;
    }

    let canvas = this.canvas.drawing;
    let ctx = this.ctx.drawing;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < this.boxes.length; i++) {
      if (this.selected === i) {
        ctx.fillStyle = 'rgba(144, 238, 144, 0.3)';
      } else {
        ctx.fillStyle = 'rgba(238, 144, 238, 0.3)';
      }
      let box = this.coords.to_display_poly(this.boxes[i]);
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
    if (!this.coords) {
      return;
    }

    const canvas = this.canvas.interface;
    const point = pointFromEvent(e, canvas, this.coords);
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

    this.lastPoint = point;
    if (this.mode === "draw") {
      this.boxes.push(new Rectangle(point, point));
    }
  }

  handleDrawMove = (e) => {
    if (!this.coords) {
      return;
    }

    let canvas = this.canvas.interface;
    let point = pointFromEvent(e, canvas, this.coords);
    if (this.mode === "draw") {
      let box = this.boxes[this.boxes.length - 1];
      if (box) {
        box.setBottomRight(point);
        this.redrawPolygons();
      }
    } else if (this.mode === "move") {
      let diff = point.diff(this.lastPoint);
      let box = this.boxes[this.selected];
      if (box) {
        box.translate(diff);
        this.lastPoint = point;
        this.redrawPolygons();
      }
    } else if (this.mode === "resize") {
      let diff = point.diff(this.lastPoint);
      let box = this.boxes[this.selected];
      if (box) {
        this.corner = box.translatePoint(diff, this.corner);
        this.lastPoint = point;
        this.redrawPolygons();
      }
    }
    this.cursorPositon = point;
  }

  updateBoxText = (text) => {
    if (this.selected !== null) {
      this.boxes[this.selected].text = text;
    }
    this.setState({modalIsVisible: false, enteringText: text});
  }

  handleDrawEnd = (e) => {
    if (!this.coords) {
      return;
    }

    let canvas = this.canvas.interface
    this.ctx.interface.clearRect(0, 0, canvas.width, canvas.height);
    let point = pointFromEvent(e, canvas, this.coords);

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
        const box = this.boxes[this.selected];
        if (box) {
          this.setState({modalIsVisible: false, enteringText: box.text});
        }
      } else {
        // Select the newly created rectangle.
        this.selected = this.boxes.length - 1;
        this.setState({modalIsVisible: false, enteringText: ""});
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
          {this.state.modalIsVisible &&
            <Modal enteringText={this.state.enteringText} setBoxText={this.updateBoxText} />}
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

export function pointFromEvent(e, canvas, coords) {
    const rect = canvas.getBoundingClientRect();
    let point = clientPointFromEvent(e);
    let p = new Point(point.x - rect.left, point.y - rect.top);
    return coords.from_display_point(p);
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
