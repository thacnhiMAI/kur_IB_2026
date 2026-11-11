import * as THREE from "three";

import { DEFAULT_AR_COVER, type ARBookPayload } from "@/lib/ar/types";

function makeLabel(book: ARBookPayload) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#67e8f9";
  ctx.font = "bold 40px system-ui";
  ctx.fillText(book.title, 34, 67, 700);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "32px system-ui";
  const lines: string[] = [];
  let line = "";
  for (const word of book.description.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > 700) {
      lines.push(line);
      line = word;
      if (lines.length === 9) break;
    } else {
      line = next;
    }
  }
  if (lines.length < 9 && line) lines.push(line);
  lines.forEach((value, index) => {
    ctx.fillText(index === 8 ? `${value}…` : value, 34, 129 + index * 40, 700);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBookDisplay(book: ARBookPayload) {
  const geometry = new THREE.BoxGeometry(.16, .23, .035);
  const labelGeometry = new THREE.PlaneGeometry(.28, .187);
  const labelTexture = makeLabel(book);
  const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture });
  const pages = new THREE.MeshBasicMaterial({ color: "#e8dfcb" });
  const binding = new THREE.MeshBasicMaterial({ color: book.dominantColor || "#0f172a" });
  const cover = new THREE.MeshBasicMaterial({ color: "#0f172a" });
  const volume = new THREE.Mesh(geometry, [pages, binding, pages, pages, cover, binding]);
  volume.rotation.y = -.24;
  volume.position.set(-.15, 0, 0);
  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.position.set(.08, 0, 0);
  const display = new THREE.Group();
  display.add(volume, label);
  let disposed = false;
  const loader = new THREE.TextureLoader();
  const applyTexture = (texture: THREE.Texture) => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    cover.map = texture;
    cover.color.set("white");
    cover.needsUpdate = true;
  };
  loader.load(book.coverImage || DEFAULT_AR_COVER, applyTexture, undefined, () => {
    if (!disposed && book.coverImage && book.coverImage !== DEFAULT_AR_COVER) {
      loader.load(DEFAULT_AR_COVER, applyTexture);
    }
  });

  function dispose() {
    if (disposed) return;
    disposed = true;
    geometry.dispose();
    labelGeometry.dispose();
    labelTexture.dispose();
    cover.map?.dispose();
    for (const material of [cover, binding, pages, labelMaterial]) material.dispose();
  }
  return { display, dispose };
}
