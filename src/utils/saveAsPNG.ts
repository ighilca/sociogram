import Sigma from "sigma";
import FileSaver from "file-saver";

export default async function saveAsPNG(renderer: Sigma) {
  const { width, height } = renderer.getDimensions();
  const pixelRatio = window.devicePixelRatio || 1;

  // Create temporary container
  const tmpRoot = document.createElement("DIV");
  tmpRoot.style.width = `${width}px`;
  tmpRoot.style.height = `${height}px`;
  tmpRoot.style.position = "absolute";
  tmpRoot.style.right = "101%";
  tmpRoot.style.bottom = "101%";
  document.body.appendChild(tmpRoot);

  // Create temporary renderer
  const tmpRenderer = new Sigma(renderer.getGraph(), tmpRoot, renderer.getSettings());

  // Copy camera state and force render
  tmpRenderer.getCamera().setState(renderer.getCamera().getState());
  tmpRenderer.refresh();

  // Create canvas for final image
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    tmpRenderer.kill();
    tmpRoot.remove();
    return;
  }

  // Draw white background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width * pixelRatio, height * pixelRatio);

  // Draw grid
  ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
  ctx.beginPath();
  for (let x = 0; x <= width * pixelRatio; x += 20 * pixelRatio) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height * pixelRatio);
  }
  for (let y = 0; y <= height * pixelRatio; y += 20 * pixelRatio) {
    ctx.moveTo(0, y);
    ctx.lineTo(width * pixelRatio, y);
  }
  ctx.stroke();

  // Draw each layer
  const canvases = tmpRenderer.getCanvases();
  const layers = ["edges", "nodes", "edgeLabels", "labels", "hovers", "mouse"];

  layers.forEach((id) => {
    const canvas = canvases[id];
    if (canvas) {
      ctx.drawImage(
        canvas,
        0,
        0,
        width * pixelRatio,
        height * pixelRatio,
        0,
        0,
        width * pixelRatio,
        height * pixelRatio
      );
    }
  });

  // Save as PNG
  canvas.toBlob((blob) => {
    if (blob) FileSaver.saveAs(blob, "sociogram.png");
    
    // Cleanup
    tmpRenderer.kill();
    tmpRoot.remove();
  }, "image/png");
} 