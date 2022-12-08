// import ColorPicker, { useColor } from "react-color-palette";
import PropTypes from "prop-types";
import React from 'react';
import { LazyPoint } from "lazy-brush";

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

const canvasTypes = ["drawing", "interface"];
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
    saveData: PropTypes.string
  }

  static defaultProps = {
    onChange: null,
    canvasWidth: 1600,
    canvasHeight: 800,
    imgSrc: "",
    saveData: ""
  }

  constructor(props) {
    super(props);

    this.canvas = {};
    this.ctx = {};
    this.mouseHasMoved = true;
    this.valuesChanged = true;
    this.isDrawing = false;
    this.isPressing = false;
  }

  componentDidMount() {
    this.point = new LazyPoint(window.innerWidth / 2, window.innerHeight / 2);
  }

  componentDidUpdate() {
  }

  handleDrawStart(e) {
  }

  handleDrawMove(e) {
  }

  handleDrawEnd(e) {
  }

  render() {
    return (
            <div
        className={this.props.className}
        style={{
          display: "block",
          background: this.props.backgroundColor,
          touchAction: "none",
          width: this.props.canvasWidth,
          height: this.props.canvasHeight,
          ...this.props.style,
        }}
        ref={(container) => {
          if (container) {
            this.canvasContainer = container;
          }
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

export function clientPointFromEvent(e) {
  // use cursor pos as default
  let clientX = e.clientX;
  let clientY = e.clientY;

  // use first touch if available
  if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  }

  return { clientX, clientY };
}
