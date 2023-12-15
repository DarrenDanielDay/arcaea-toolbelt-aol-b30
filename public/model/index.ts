import { ImageFile } from "@arcaea-toolbelt/services/generator-api";

export interface Vector2D {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export enum Clear {
  PM = "pure",
  FR = "full",
  HC = "hard",
  NC = "normal",
  EC = "easy",
  TL = "fail",
}

export enum Difficulty {
  Past,
  Present,
  Future,
  Beyond,
}

export enum Side {
  Light,
  Conflict,
  Colorless,
}

export interface PlayResultItem {
  no: number;
  difficultyImage: DetailedImageFile;
  level: number;
  plus?: boolean;
  potential: number;
  side: Side;
  cover: DetailedImageFile;
  rankImage: DetailedImageFile;
  score: number;
  title: string;
  clear: Clear;
}

export interface DetailedImageFile extends ImageFile {
  size: Vector2D;
  dataURL: string;
}

export interface Best30Data {
  player: string;
  date: string;
  potential: number;
  ratingBadge: DetailedImageFile;
  b30: PlayResultItem[];
}

export type RenderURL = keyof Pick<DetailedImageFile, "blobURL" | "distURL" | "dataURL">;

export type ResourceFile = Record<RenderURL, string>;

export interface Best30RenderContext extends Best30Data {
  scale: number;
  renderURL: RenderURL;
  exoFontFile: ResourceFile;
  brandImage: DetailedImageFile;
  courseImage: DetailedImageFile;
  avatarImage: DetailedImageFile;
  backgroundImage: DetailedImageFile;
  generatorTextColor: string;
  playerTextColor: string;
  footerColor: string;
}
