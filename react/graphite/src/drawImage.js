export default function drawImageProp({ctx, img} = {}) {
  let s;
  let cw = ctx.canvas.width;
  let ch = ctx.canvas.height;

  if (cw >= ch) {
    s = ch / img.height;
  } else {
    s = cw / img.width;
  }
  if (!s) {
    s = 1.0;
  }
  let nh = Math.round(s * img.height);
  let nw = Math.round(s * img.width);

  return [nw, nh]
}
