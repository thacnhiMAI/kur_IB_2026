import { expect, it, vi } from "vitest";

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

vi.mock("react-pdf", () => ({ pdfjs: { GlobalWorkerOptions: {}, getDocument } }));
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
    render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
    cleanup: vi.fn()
  });
  getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 2, getPage }), destroy });
  const session = new EventTarget();
  const end = vi.fn(async () => { session.dispatchEvent(new Event("end")); });
  const xrSession = Object.assign(session, { end }) as unknown as XRSession;
  const orientation = { x: 0, y: 0, z: 0, w: 1 };
  function tap(x: number, y: number) {
    session.dispatchEvent(Object.assign(new Event("select"), {
      inputSource: { targetRaySpace: {} },
      frame: { getPose: () => ({ transform: { position: { x, y, z: 0 }, orientation } }) }
    }));
  }

  try {
    await attachReaderScene(xrSession, "/api/reading/content/test");
    const frame = { getViewerPose: () => ({ transform: { position: { x: 0, y: 0, z: 0 }, orientation } }) };
    renderer.setAnimationLoop.mock.calls[0][0](0, frame);
    await vi.waitFor(() => expect(fillText).toHaveBeenCalledWith("1 / 2", 256, 64, 470));
    tap(.178, -.312);
    await vi.waitFor(() => expect(fillText).toHaveBeenCalledWith("2 / 2", 256, 64, 470));
    tap(.178, -.312);
    expect(getPage.mock.calls).toEqual([[1], [2]]);
    tap(-.178, -.312);
    await vi.waitFor(() => expect(getPage.mock.calls).toEqual([[1], [2], [1]]));
    tap(0, .365);
    expect(end).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  } finally {
    canvas.mockRestore();
  }
});
