import { ImageFile } from "@arcaea-toolbelt/services/generator-api";
import { DetailedImageFile, ResourceFile, Size, Vector2D } from "../model";
import { ClipConfig, Position, Rectangle, RenderContext, Vecter2D } from "@arcaea-toolbelt/utils/image-clip";

export type PromiseOr<T> = T | Promise<T>;

export const grid = <T>(array: T[], cols: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += cols) {
    result.push(array.slice(i, i + cols));
  }
  return result;
};

export const pad2 = (n: number | string) => `${n}`.padStart(2, "0");

export const formatDate = (ts: number) => {
  const date = new Date(ts);
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
};

export interface Task<T> {
  promise: Promise<T>;
  done(result: T): void;
  abort(reason?: any): void;
}

export interface CompleteSignal {
  promise: Promise<void>;
  done(): void;
  abort(reason?: any): void;
}

export const future: {
  (): CompleteSignal;
  <T>(): Task<T>;
} = () => {
  let done: any, abort: any;
  const promise = new Promise<any>((resolve, reject) => {
    done = resolve;
    abort = reject;
  });
  return {
    promise,
    get done() {
      return done;
    },
    get abort() {
      return abort;
    },
  };
};

export interface Coordinate {
  point: (dx?: number, dy?: number) => Vector2D;
  size: (size: Size) => Size;
  zoom: (num: number) => number;
  vectors: (seq: string) => string;
  translate: (dx?: number, dy?: number) => Coordinate;
}

export const coordinate = (x: number = 0, y: number = 0, scale: number = 1): Coordinate => {
  return {
    point: (dx: number = 0, dy: number = 0): Vector2D => ({
      x: (x + dx) * scale,
      y: (y + dy) * scale,
    }),
    size: ({ width, height }) => ({ width: width * scale, height: height * scale }),
    zoom: (num) => num * scale,
    vectors: (seq) =>
      seq
        .split(" ")
        .filter((c) => !!c.trim())
        .map((pair) => pair.split(",").map((num) => +num * scale))
        .join(" "),
    translate: (dx: number = 0, dy: number = 0) => coordinate(x + dx, y + dy, scale),
  };
};

export const resize = ({ x, y, width, height }: Vector2D & Partial<Size>): Size => {
  let size: Size;
  if (width) {
    size = {
      width,
      height: (y * width) / x,
    };
  } else if (height) {
    size = {
      width: (x * height) / y,
      height,
    };
  } else {
    throw new Error("Must have width or height.");
  }
  return size;
};

const blobURLRegistry = new FinalizationRegistry<string>((url) => {
  console.debug(`Revoking Object URL: ${url}`);
  return URL.revokeObjectURL(url);
});

export const managedBlobURL = (blob: Blob): string => {
  const url = URL.createObjectURL(blob);
  blobURLRegistry.register(blob, url);
  return url;
};

export const blob2DataURL = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject("Unexpected reader result.");
      }
    };
    reader.readAsDataURL(blob);
  });

export const createDetailedImageFile = async (file: ImageFile): Promise<DetailedImageFile> => {
  const blob = file.blob;
  const blobURL = managedBlobURL(blob);
  const dataURL = await blob2DataURL(blob);
  const bitmap = await createImageBitmap(blob);
  const size: Vector2D = {
    x: bitmap.width,
    y: bitmap.height,
  };
  bitmap.close();
  return {
    ...file,
    blobURL,
    size,
    dataURL,
  };
};

export const createDetailedImageFiles = (files: ImageFile[]) =>
  Promise.all(files.map((file) => createDetailedImageFile(file)));

export const generateExportImageName = (): string => {
  const now = new Date();
  return `AOL-b30-${now.getFullYear()}-${formatDate(+now)} \
${pad2(now.getHours())}-\
${pad2(now.getMinutes())}-\
${pad2(now.getSeconds())}`;
};

export const fetchAsBlob = async (url: string | URL) => {
  const res = await fetch(url);
  return res.blob();
};

export const fetchAsResource = async (url: string | URL): Promise<ResourceFile> => {
  const dist = new URL(url);
  const blob = await fetchAsBlob(dist);
  return {
    blobURL: managedBlobURL(blob),
    dataURL: await blob2DataURL(blob),
    distURL: dist.href,
  };
};

export const getAreaColor = (context: RenderContext, area: Rectangle): number[] => {
  const imageData = context.getImageData(area.position.x, area.position.y, area.size.x, area.size.y);
  /* For area debug
  queueMicrotask(async () => {
    const c = new OffscreenCanvas(area.size.x, area.size.y);
    c.getContext("2d")!.putImageData(imageData, 0, 0);
    window.open(URL.createObjectURL(await c.convertToBlob()), '_blank');
  });
  //*/
  const { data } = imageData;
  const bpe = 4;
  const rgba = data.reduce(
    (acc, v, i) => {
      acc[i % bpe] += v;
      return acc;
    },
    Array.from({ length: bpe }, () => 0)
  );
  const average = rgba.map((v) => (v * bpe) / data.byteLength);
  return average;
};

export const diamond = (width: number): ClipConfig => {
  const rectSize: Vecter2D = { x: width, y: width };
  const halfRectSize: Vecter2D = { x: width / 2, y: width / 2 };
  const position: Vecter2D = { x: -halfRectSize.x, y: -halfRectSize.y };
  const clipPath = `m\
 0,${-halfRectSize.y}\
 ${halfRectSize.x},${halfRectSize.y}\
 ${-halfRectSize.x},${halfRectSize.y}\
 ${-halfRectSize.x},${-halfRectSize.y}\
 z`;
  return {
    area: {
      position,
      size: rectSize,
    },
    clipPath,
  };
};

export const rect = (rectSize: Vecter2D): ClipConfig => {
  const halfRectSize: Vecter2D = { x: rectSize.x / 2, y: rectSize.y / 2 };
  const rectStart: Position = { x: -halfRectSize.x, y: -halfRectSize.y };
  const clipPath = `m\
 ${rectStart.x},${rectStart.y}\
 ${rectSize.x},0\
 0,${rectSize.y}\
 ${-rectSize.x},0\
z`;
  return {
    area: {
      position: rectStart,
      size: rectSize,
    },
    clipPath,
  };
};
