// The service worker removes obsolete app-shell caches under its own prefix.
const CACHE_NAME = "reader-pdf-pages-v1";
const MAX_PAGE_ENTRIES = 80;
const MAX_DOCUMENT_ENTRIES = 24;
const MAX_TEXT_ENTRIES = 800;
const MAX_TEXT_CHARS = 32_000;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;

export type ReaderDocumentInfo = { pages: number; aspect: number };

export async function openReaderPageCache(scope: string | undefined) {
  if (!scope || typeof caches === "undefined") return null;

  try {
    const [cache, index, text] = await Promise.all([
      caches.open(CACHE_NAME), caches.open(`${CACHE_NAME}-index`), caches.open(`${CACHE_NAME}-ocr-text`)
    ]);
    const prefix = `/${CACHE_NAME}/${encodeURIComponent(scope)}`;
    let writes = Promise.resolve();

    function save(storage: Cache, limit: number, key: string, response: Response) {
      writes = writes.then(async () => {
        await storage.put(key, response);
        const keys = await storage.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((entry) => storage.delete(entry)));
      }).catch(() => {});
      return writes;
    }

    return {
      async readOcrText(page: number) {
        return (await text.match(`${prefix}/ocr/${page}`))?.text();
      },
      saveOcrText(page: number, value: string) {
        if (value.length <= MAX_TEXT_CHARS) {
          return save(text, MAX_TEXT_ENTRIES, `${prefix}/ocr/${page}`, new Response(value));
        }
      },
      async readInfo(): Promise<ReaderDocumentInfo | undefined> {
        const entry = await index.match(`${prefix}/info`);
        const info = await entry?.json() as ReaderDocumentInfo | undefined;
        if (info && Number.isInteger(info.pages) && info.pages > 0 && Number.isFinite(info.aspect) && info.aspect > 0) {
          return info;
        }
      },
      saveInfo(info: ReaderDocumentInfo) {
        return save(index, MAX_DOCUMENT_ENTRIES, `${prefix}/info`, Response.json(info));
      },
      async readPage(page: number, width: number) {
        const pagePrefix = `${prefix}/${page}/`;
        const exact = await cache.match(`${pagePrefix}${width}`);
        if (exact) return exact.blob();

        const absolutePrefix = new URL(pagePrefix, location.origin).href;
        const larger = (await cache.keys()).find(({ url }) =>
          url.startsWith(absolutePrefix) && Number(url.slice(absolutePrefix.length)) > width
        );
        if (larger) return (await cache.match(larger))?.blob();
      },
      savePage(page: number, width: number, image: Blob) {
        if (image.size <= MAX_PAGE_BYTES) {
          return save(cache, MAX_PAGE_ENTRIES, `${prefix}/${page}/${width}`, new Response(image));
        }
      }
    };
  } catch {
    return null;
  }
}
