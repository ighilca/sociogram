import Sigma from "sigma";
import FileSaver from "file-saver";
import { COLLABORATION_COLORS } from "../types/graph";
import coefLogo from '../assets/coef.png';

export default async function saveAsPNG(renderer: Sigma, legendContainer: HTMLElement | null) {
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
  const legendHeight = legendContainer ? 60 * pixelRatio : 0; // Height for legend
  canvas.width = width * pixelRatio;
  canvas.height = (height + legendHeight) * pixelRatio;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    tmpRenderer.kill();
    tmpRoot.remove();
    return;
  }

  // Draw white background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width * pixelRatio, (height + legendHeight) * pixelRatio);

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

  // Add logo
  try {
    const logoImg = new Image();
    logoImg.src = coefLogo;
    await new Promise((resolve) => {
      logoImg.onload = resolve;
    });

    // Calculate logo dimensions (80px height - doubled from 40px)
    const logoHeight = 80 * pixelRatio;
    const logoWidth = (logoImg.width / logoImg.height) * logoHeight;

    // Draw logo in bottom right corner with 5px margin
    ctx.drawImage(
      logoImg,
      width * pixelRatio - logoWidth - 5 * pixelRatio,
      height * pixelRatio - logoHeight - 5 * pixelRatio,
      logoWidth,
      logoHeight
    );
  } catch (error) {
    console.warn('Failed to load logo:', error);
  }

  // Draw legend
  if (legendContainer) {
    const legendY = height * pixelRatio;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, legendY, width * pixelRatio, legendHeight);
    
    // Draw border
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1 * pixelRatio;
    ctx.strokeRect(0, legendY, width * pixelRatio, legendHeight);

    // Draw legend items
    const itemWidth = width * pixelRatio / 5; // 5 colors
    const dotSize = 12 * pixelRatio;
    const textY = legendY + (legendHeight / 2);
    
    Object.entries(COLLABORATION_COLORS).forEach(([score, color], index) => {
      const x = (itemWidth * index) + (itemWidth / 2);
      
      // Draw dot
      ctx.beginPath();
      ctx.arc(x - (dotSize * 1.5), textY, dotSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1 * pixelRatio;
      ctx.fill();
      ctx.stroke();

      // Draw text
      ctx.fillStyle = "#000";
      ctx.font = `${12 * pixelRatio}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const text = score === '0' ? 'Aucune' :
                   score === '1' ? 'Minimale' :
                   score === '2' ? 'Modérée' :
                   score === '3' ? 'Bonne' :
                   'Optimale';
      ctx.fillText(text, x - dotSize, textY);
    });
  }

  // Save as PNG
  canvas.toBlob((blob) => {
    if (blob) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      FileSaver.saveAs(blob, `sociogram-${timestamp}.png`);
    }
    
    // Cleanup
    tmpRenderer.kill();
    tmpRoot.remove();
  }, "image/png");
} 