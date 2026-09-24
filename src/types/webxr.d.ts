declare global {
  interface XRSystem {
    isSessionSupported(mode: "immersive-ar"): Promise<boolean>;
    requestSession(mode: "immersive-ar", options?: object): Promise<unknown>;
  }

  interface Navigator {
    xr?: XRSystem;
  }
}

export {};
