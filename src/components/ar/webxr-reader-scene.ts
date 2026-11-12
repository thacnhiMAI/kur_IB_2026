import * as THREE from "three";
import { pdfjs } from "react-pdf";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { ARBookPayload } from "@/lib/ar/types";
import { createBookDisplay } from "./webxr-scene";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export async function attachReaderScene(
  session: XRSession,
  pdfUrl: string | null | undefined,
  book?: ARBookPayload,
  startMode: "preview" | "reader" = "reader"
) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const panel = new THREE.Group();
  panel.visible = false;
  scene.add(panel);
  const reading = new THREE.Group();
  const preview = new THREE.Group();
  panel.add(reading, preview);
  let cover: ReturnType<typeof createBookDisplay> | undefined;

  const pageMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const pageMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pageMaterial);
  pageMesh.visible = false;
  pageMesh.position.y = .035;
  reading.add(pageMesh);

  const controls = new Map<THREE.Mesh, () => void>();
  function makeControl(label: string, x: number, y: number, width: number, action?: () => void, group = reading) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, .062), material);
    mesh.position.set(x, y, .002);
    group.add(mesh);
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
  let zoom = 1;
  let pdf: PDFDocumentProxy | undefined;
  let loading: ReturnType<typeof pdfjs.getDocument> | undefined;
  let rendering: RenderTask | undefined;
  let failedPage: number | null = null;
  let streamingOnly = false;
  const previous = makeControl("‹", -.178, -.312, .088, () => void showPage(currentPage - 1));
  const status = makeControl("Загрузка PDF…", 0, -.312, .25, () => {
    if (failedPage !== null) void showPage(failedPage);
    else if (!loading) setMode("reader");
  });
  const next = makeControl("›", .178, -.312, .088, () => void showPage(currentPage + 1));
  const endSession = () => { void session.end().catch(() => {}); };
  const exit = makeControl("Выйти", .14, .365, .13, endSession);
  const zoomOut = makeControl("−", -.18, .365, .07, () => adjustZoom(-1));
  const zoomIn = makeControl("+", -.095, .365, .07, () => adjustZoom(1));
  const backToCover = book ? makeControl("Обложка", .015, .365, .13, () => setMode("preview")) : null;
  const openReader = pdfUrl ? makeControl("Читать PDF", -.11, -.18, .19, () => setMode("reader"), preview) : null;
  const exitPreview = makeControl("Выйти", pdfUrl ? .11 : 0, -.18, .16, endSession, preview);
  previous.draw("‹", false);
  next.draw("›", false);

  function fitPage() {
    const canvas = pageMaterial.map?.image as HTMLCanvasElement | undefined;
    if (!canvas) return;
    const scale = Math.min(.4 / canvas.width, .51 / canvas.height) * zoom;
    pageMesh.scale.set(canvas.width * scale, canvas.height * scale, 1);
  }

  function adjustZoom(direction: number) {
    zoom = Math.min(1.18, Math.max(.82, zoom + .09 * direction));
    fitPage();
  }

  function setMode(mode: "preview" | "reader") {
    reading.visible = mode === "reader";
    preview.visible = mode === "preview";
    if (preview.visible && book && !cover) {
      cover = createBookDisplay(book);
      preview.add(cover.display);
    }
    if (reading.visible && pdfUrl && !loading) {
      status.draw("Загрузка PDF…");
      loading = pdfjs.getDocument({ url: pdfUrl, rangeChunkSize: 256 * 1024 });
      void loading.promise.then((document) => {
        if (disposed) return;
        pdf = document;
        return showPage(1);
      }).catch(() => {
        if (!disposed) {
          loading = undefined;
          status.draw("PDF недоступен · повторить");
        }
      });
    }
  }

  async function showPage(number: number) {
    if (disposed || busy || !pdf || number < 1 || number > pdf.numPages) return;
    busy = true;
    failedPage = null;
    let retry = false;
    status.draw("Загрузка…");
    previous.draw("‹", false);
    next.draw("›", false);
    try {
      const page = await pdf.getPage(number);
      if (disposed) return;
      try {
        const base = page.getViewport({ scale: 1 });
        const resolution = streamingOnly ? 1100 : 1600;
        const viewport = page.getViewport({ scale: resolution / Math.max(base.width, base.height) });
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
        pageMaterial.map?.dispose();
        pageMaterial.map = texture;
        pageMaterial.needsUpdate = true;
        fitPage();
        pageMesh.visible = true;
        currentPage = number;
        status.draw(`${number} / ${pdf.numPages}`);
      } finally {
        page.cleanup();
      }
    } catch (error) {
      if (!disposed) {
        console.warn("AR PDF page failed to render", { page: number, error });
        if (pdfUrl && !streamingOnly) {
          streamingOnly = true;
          status.draw("Повторная загрузка…");
          void loading?.destroy().catch(() => {});
          loading = pdfjs.getDocument({ url: pdfUrl, disableRange: true });
          try {
            pdf = await loading.promise;
            retry = !disposed;
          } catch {
            pdf = undefined;
            loading = undefined;
            if (!disposed) status.draw("PDF недоступен · повторить");
          }
        } else {
          failedPage = number;
          status.draw("Не удалось · повторить");
        }
      }
    } finally {
      rendering = undefined;
      busy = false;
      if (!disposed && pdf) {
        previous.draw("‹", currentPage > 1);
        next.draw("›", currentPage < pdf.numPages);
      }
    }
    if (retry) await showPage(number);
  }

  const raycaster = new THREE.Raycaster();
  const cursor = new THREE.Mesh(
    new THREE.SphereGeometry(.006, 12, 8),
    new THREE.MeshBasicMaterial({ color: "#67e8f9", depthTest: false })
  );
  cursor.visible = false;
  cursor.renderOrder = 10;
  scene.add(cursor);

  function findControl(pose: XRPose) {
    const { position, orientation } = pose.transform;
    raycaster.ray.origin.set(position.x, position.y, position.z);
    raycaster.ray.direction.set(0, 0, -1).applyQuaternion(
      new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w)
    );
    const visibleControls = [...controls.keys()].filter((control) => control.parent?.visible);
    return raycaster.intersectObjects(visibleControls, false)[0];
  }

  function select(event: XRInputSourceEvent) {
    const reference = renderer.xr.getReferenceSpace();
    if (!reference || !panel.visible) return;
    const pose = event.frame.getPose(event.inputSource.targetRaySpace, reference);
    if (!pose) return;
    const hit = findControl(pose);
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
    cursor.geometry.dispose();
    cursor.material.dispose();
    for (const control of [previous, status, next, exit, zoomOut, zoomIn, backToCover, openReader, exitPreview]) control?.dispose();
    cover?.dispose();
    renderer.dispose();
  }

  session.addEventListener("end", dispose, { once: true });
  try {
    await renderer.xr.setSession(session);
    if (disposed) return;
    setMode(startMode);
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
      cursor.visible = false;
      if (panel.visible && frame && reference) {
        panel.updateMatrixWorld(true);
        for (const source of session.inputSources) {
          if (source.targetRayMode === "screen") continue;
          const pose = frame.getPose(source.targetRaySpace, reference);
          const hit = pose && findControl(pose);
          if (!hit) continue;
          cursor.position.copy(hit.point);
          cursor.visible = true;
          break;
        }
      }
      renderer.render(scene, camera);
    });
  } catch (error) {
    dispose();
    throw error;
  }
}
