export default function drawImageProp({ctx, img} = {}) {
  let aspectRatio = img.width / img.height;
  let s;
  let cw = ctx.canvas.width;
  let ch = ctx.canvas.height;

  if (cw >= ch) {
    s = ch / img.height;
  } else {
    s = cw / img.width;
  }
  let nh = Math.round(s * img.height);
  let nw = Math.round(s * img.width);

  return [nw, nh]
}
