import * as THREE from "three";
import { pdfjs } from "react-pdf";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export async function attachReaderScene(session: XRSession, pdfUrl: string) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const panel = new THREE.Group();
  panel.visible = false;
  scene.add(panel);

  const pageMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const pageMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pageMaterial);
  pageMesh.visible = false;
  pageMesh.position.y = .035;
  panel.add(pageMesh);

  const controls = new Map<THREE.Mesh, () => void>();
  function makeControl(label: string, x: number, y: number, width: number, action?: () => void) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, .062), material);
    mesh.position.set(x, y, .002);
    panel.add(mesh);
    if (action) controls.set(mesh, action);
    function draw(text: string, enabled = true) {
      context.fillStyle = enabled ? "#142749" : "#374151";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.font = "bold 62px system-ui";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 256, 64, 470);
      texture.needsUpdate = true;
    }
    draw(label);
    return { draw, dispose() { mesh.geometry.dispose(); material.dispose(); texture.dispose(); } };
  }

  let disposed = false;
  let busy = false;
  let currentPage = 0;
  let pdf: PDFDocumentProxy | undefined;
  let loading: ReturnType<typeof pdfjs.getDocument> | undefined;
  let rendering: RenderTask | undefined;
  const previous = makeControl("‹", -.178, -.312, .088, () => void showPage(currentPage - 1));
  const status = makeControl("Загрузка PDF…", 0, -.312, .25);
  const next = makeControl("›", .178, -.312, .088, () => void showPage(currentPage + 1));
  const exit = makeControl("Выйти из AR", 0, .365, .20, () => { void session.end().catch(() => {}); });
  previous.draw("‹", false);
  next.draw("›", false);

  async function showPage(number: number) {
    if (disposed || busy || !pdf || number < 1 || number > pdf.numPages) return;
    busy = true;
    status.draw("Загрузка…");
    previous.draw("‹", false);
    next.draw("›", false);
    try {
      const page = await pdf.getPage(number);
      if (disposed) return;
      try {
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 1600 / Math.max(base.width, base.height) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        rendering = page.render({ canvas, canvasContext: context, viewport, background: "#ffffff" });
        await rendering.promise;
        if (disposed) return;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const scale = Math.min(.44 / canvas.width, .57 / canvas.height);
        pageMaterial.map?.dispose();
        pageMaterial.map = texture;
        pageMaterial.needsUpdate = true;
        pageMesh.scale.set(canvas.width * scale, canvas.height * scale, 1);
        pageMesh.visible = true;
        currentPage = number;
        status.draw(`${number} / ${pdf.numPages}`);
      } finally {
        page.cleanup();
      }
    } catch {
      if (!disposed) status.draw("Страница недоступна");
    } finally {
      rendering = undefined;
      busy = false;
      if (!disposed && pdf) {
        previous.draw("‹", currentPage > 1);
        next.draw("›", currentPage < pdf.numPages);
      }
    }
  }

  const raycaster = new THREE.Raycaster();
  function select(event: XRInputSourceEvent) {
    const reference = renderer.xr.getReferenceSpace();
    if (!reference || !panel.visible) return;
    const pose = event.frame.getPose(event.inputSource.targetRaySpace, reference);
    if (!pose) return;
    const { position, orientation } = pose.transform;
    raycaster.ray.origin.set(position.x, position.y, position.z);
    raycaster.ray.direction.set(0, 0, -1).applyQuaternion(
      new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w)
    );
    const hit = raycaster.intersectObjects([...controls.keys()], false)[0];
    if (hit) controls.get(hit.object as THREE.Mesh)?.();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    session.removeEventListener("select", select);
    session.removeEventListener("end", dispose);
    renderer.setAnimationLoop(null);
    rendering?.cancel();
    void loading?.destroy().catch(() => {});
    pageMesh.geometry.dispose();
    pageMaterial.map?.dispose();
    pageMaterial.dispose();
    for (const control of [previous, status, next, exit]) control.dispose();
    renderer.dispose();
  }

  session.addEventListener("end", dispose, { once: true });
  try {
    await renderer.xr.setSession(session);
    if (disposed) return;
    session.addEventListener("select", select);
    renderer.setAnimationLoop((_time, frame) => {
      const reference = renderer.xr.getReferenceSpace();
      if (!panel.visible && frame && reference) {
        const pose = frame.getViewerPose(reference);
        if (pose) {
          const { position, orientation } = pose.transform;
          panel.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
          panel.position.set(0, 0, -.86).applyQuaternion(panel.quaternion);
          panel.position.add(new THREE.Vector3(position.x, position.y, position.z));
          panel.visible = true;
        }
      }
      renderer.render(scene, camera);
    });
    loading = pdfjs.getDocument({ url: pdfUrl, disableAutoFetch: true, disableStream: true, rangeChunkSize: 256 * 1024 });
    void loading.promise.then((document) => {
      if (disposed) return;
      pdf = document;
      return showPage(1);
    }).catch(() => { if (!disposed) status.draw("PDF недоступен"); });
  } catch (error) {
    dispose();
    throw error;
  }
}
