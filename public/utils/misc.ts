import { Vector2D } from "../model";

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
  translate: (dx?: number, dy?: number) => Coordinate;
}

export const coordinate = (x: number = 0, y: number = 0): Coordinate => {
  return {
    point: (dx: number = 0, dy: number = 0): Vector2D => ({
      x: x + dx,
      y: y + dy,
    }),
    translate: (dx: number = 0, dy: number = 0) => coordinate(x + dx, y + dy),
  };
};
