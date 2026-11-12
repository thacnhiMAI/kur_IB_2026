import { expect, it, vi } from "vitest";
import { Group, type Mesh, type Scene } from "three";

import { attachReaderScene } from "@/components/ar/webxr-reader-scene";

const { getDocument, getPage, destroy, renderer } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  getPage: vi.fn(),
  destroy: vi.fn().mockResolvedValue(undefined),
  renderer: {
    xr: { enabled: false, setReferenceSpaceType: vi.fn(), setSession: vi.fn(), getReferenceSpace: vi.fn(() => ({})) },
    setAnimationLoop: vi.fn(),
    render: vi.fn((scene: { updateMatrixWorld: () => void }) => scene.updateMatrixWorld()),
    dispose: vi.fn()
  }
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ GlobalWorkerOptions: {}, getDocument }));
vi.mock("@/components/ar/webxr-scene", () => ({
  createBookDisplay: () => ({ display: new Group(), dispose: vi.fn() })
}));
vi.mock("three", async (importOriginal) => ({
  ...await importOriginal<typeof import("three")>(),
  WebGLRenderer: function () { return renderer; }
}));

it("renders PDF pages and handles simulated XR pointer selections", async () => {
  const fillText = vi.fn();
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => ({ fillText, fillRect: vi.fn() }) as unknown as CanvasRenderingContext2D);
  getPage.mockResolvedValue({
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render: ({ intent }: { intent?: string }) => {
      expect(intent).toBe("print");
      return { promise: Promise.resolve(), cancel: vi.fn() };
    },
    cleanup: vi.fn()
  });
  getPage.mockRejectedValueOnce(new Error("Range request failed"));
  getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 2, getPage }), destroy });
  const session = new EventTarget();
  const end = vi.fn(async () => { session.dispatchEvent(new Event("end")); });
  const xrSession = Object.assign(session, { end, inputSources: [] }) as unknown as XRSession;
  const orientation = { x: 0, y: 0, z: 0, w: 1 };
  function tap(x: number, y: number) {
    session.dispatchEvent(Object.assign(new Event("select"), {
      inputSource: { targetRaySpace: {} },
      frame: { getPose: () => ({ transform: { position: { x, y, z: 0 }, orientation } }) }
    }));
  }

  try {
    await attachReaderScene(xrSession, "/api/reading/content/test", {
      title: "Test book", description: "Cover preview"
    } as Parameters<typeof attachReaderScene>[2], "preview");
    const frame = { getViewerPose: () => ({ transform: { position: { x: 0, y: 0, z: 0 }, orientation } }) };
    renderer.setAnimationLoop.mock.calls[0][0](0, frame);
    expect(getDocument).not.toHaveBeenCalled();
    tap(-.11, -.18);
    await vi.waitFor(() => expect(fillText).toHaveBeenCalledWith("1 / 2", 256, 64, 470));
    expect(getDocument).toHaveBeenLastCalledWith({
      url: "/api/reading/content/test", disableRange: true, isOffscreenCanvasSupported: false, isImageDecoderSupported: false
    });
    const scene = renderer.render.mock.calls[0][0] as Scene;
    const pageMesh = scene.children[0].children[0].children[0] as Mesh;
    const width = pageMesh.scale.x;
    tap(-.095, .365);
    expect(pageMesh.scale.x).toBeGreaterThan(width);
    tap(-.18, .365);
    expect(pageMesh.scale.x).toBeCloseTo(width);
    tap(.178, -.312);
    await vi.waitFor(() => expect(fillText).toHaveBeenCalledWith("2 / 2", 256, 64, 470));
    tap(.178, -.312);
    expect(getPage.mock.calls).toEqual([[1], [1], [2]]);
    tap(-.178, -.312);
    await vi.waitFor(() => expect(getPage.mock.calls).toEqual([[1], [1], [2], [1]]));
    tap(.015, .365);
    tap(.178, -.312);
    expect(getPage.mock.calls).toEqual([[1], [1], [2], [1]]);
    tap(.11, -.18);
    expect(end).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledTimes(2);
  } finally {
    canvas.mockRestore();
  }
});
