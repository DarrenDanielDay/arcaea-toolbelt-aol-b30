export interface Vector2D {
  x: number;
  y: number;
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
  Colorless
}

export interface PlayResultItem {
  no: number;
  difficultyImage: string;
  level: number;
  plus?: boolean;
  potential: number;
  side: Side;
  cover: string;
  rankImage: string;
  score: number;
  title: string;
  clear: Clear;
}

export interface BackgroundImage {
  url: string;
  size: Vector2D;
}

export interface Best30Data {
  player: string;
  date: string;
  potential: number;
  ratingBadge: string;
  b30: PlayResultItem[];
}

export interface Best30RenderContext extends Best30Data {
  brand: string;
  course: string;
  avatar: string;
  bg: BackgroundImage;
  generatorTextColor: string;
  playerTextColor: string;
  footerColor: string;
}