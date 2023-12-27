import { CharacterImage } from "@arcaea-toolbelt/models/character";
import { HostAPI, ImageFile } from "@arcaea-toolbelt/services/generator-api";
import { RPCConnection } from "@arcaea-toolbelt/utils/rpc";

export type ArcaeaToolbeltGeneratorAPI = typeof import("@arcaea-toolbelt/services/generator-api");
export interface UserPreference {
  avatar: CharacterImage | string;
  course: number;
  // 字符串是legacy配置，是assets路径，为了兼容
  bg:
    | string
    | {
        url: string;
      };
}

export interface StartUpContext {
  atb: ArcaeaToolbeltGeneratorAPI;
  connection: RPCConnection<HostAPI>;
  defaultPreference: UserPreference;
  brandImage: DetailedImageFile;
  exoFontFile: ResourceFile;
}

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

export interface ResourceFile extends Record<RenderURL, string> {
  blob: Blob;
}

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
