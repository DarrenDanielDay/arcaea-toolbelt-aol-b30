import { FunctionComponent as FC } from "preact";
import { PlayResultItem, Side, Best30RenderContext, RenderURL } from "../../model";
import { Coordinate, coordinate, grid, resize } from "../../utils/misc";

const parsePotential = (potential: number) => {
  const integer = Math.floor(potential * 100);
  const decimal = Math.floor(integer / 100);
  const fixed = integer - decimal * 100;
  return {
    decimal: decimal.toString(),
    fixed: `.${fixed.toString().padStart(2, "0")}`,
  };
};

const formatScore = (score: number) => {
  const raw = Math.floor(score).toString();
  if (raw.length > 8 || score < 0) {
    throw new Error(`Invalid score ${score}`);
  }
  const padded = raw.padStart(8, "0");
  return `${padded.slice(0, 2)}'${padded.slice(2, 5)}'${padded.slice(5, 8)}`;
};

export const width = 900;
export const height = 1046;

export const Best30: FC<Best30RenderContext> = ({
  brandImage,
  exoFontFile,
  player,
  avatarImage,
  courseImage,
  playerTextColor,
  backgroundImage,
  generatorTextColor,
  footerColor,
  date,
  potential,
  ratingBadge,
  b30,
  renderURL,
}) => {
  const { decimal, fixed } = parsePotential(potential);
  const root = coordinate(0, 0);
  const { point, translate } = root;
  const gridX = 42,
    gridY = 176;
  const { size: bgSize } = backgroundImage;
  const { x: renderWidth, y: renderHeight } = point(width, height);
  const widthZoom = renderWidth / bgSize.x,
    heightZoom = renderHeight / bgSize.y;
  const bgWidthHeightProps =
    widthZoom > heightZoom
      ? { width: renderWidth, height: bgSize.y * widthZoom }
      : { width: bgSize.x * heightZoom, height: renderHeight };
  return (
    <svg
      class="b30"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${renderWidth} ${renderHeight}`}
      width={renderWidth}
      height={renderHeight}
    >
      <style>{`@font-face{font-family: Exo;src: url("${[exoFontFile[renderURL]]}") format("woff2");}`}</style>
      <defs>
        {/* 模糊背景面板 */}
        <filter id="bg-blur-filter">
          <feGaussianBlur stdDeviation={5} in="BackgroundImage"></feGaussianBlur>
        </filter>
        <rect id="bg-blur-part" x={24} y={116} width={852} height={930}></rect>
        <clipPath id="bg-blur-clip">
          <use href="#bg-blur-part"></use>
        </clipPath>

        {/* 生成日期 */}
        <g id="generator-info">
          <text font-size={12} font-weight="bold" fill={generatorTextColor}>
            Generated on:
          </text>
          <text y={24} font-size={18} font-weight="bold" fill={generatorTextColor}>
            {date}
          </text>
        </g>

        {/* 段位 */}
        <g id="course-banner">
          <clipPath id="course-right">
            <rect width={230} height={37}></rect>
          </clipPath>
          <image
            href={courseImage[renderURL]}
            {...resize({ height: 37, ...courseImage.size })}
            clip-path="url(#course-right)"
          ></image>
        </g>

        {/* 背景图片 */}
        <image id="bg" href={backgroundImage[renderURL]} {...bgWidthHeightProps}></image>

        {/* 头像和潜力值 */}
        <g id="avatar-and-potential">
          <filter id="avatar-shadow">
            <feDropShadow dx={0} dy={0} stdDeviation={3} flood-color="#231731"></feDropShadow>
          </filter>
          <image
            href={avatarImage[renderURL]}
            {...resize({ ...avatarImage.size, height: 71 })}
            filter="url(#avatar-shadow)"
          ></image>
          <image href={ratingBadge[renderURL]} {...resize({ width: 44, ...ratingBadge.size })} x={39} y={31}></image>
          <text
            font-family="Exo"
            text-anchor="end"
            font-size={22}
            stroke="#231731"
            stroke-width={1.3}
            fill="white"
            x={58}
            y={60}
          >
            {decimal}
          </text>
          <text
            font-family="Exo"
            text-anchor="start"
            font-size={18}
            stroke="#231731"
            stroke-width={1}
            fill="white"
            x={58}
            y={60}
          >
            {fixed}
          </text>
        </g>

        {/* 玩家信息 */}
        <g id="player-info">
          <use href="#course-banner"></use>
          <use href="#avatar-and-potential" x={183} y={-15}></use>
          <text x={105} y={25} text-anchor="middle" font-size={16} fill={playerTextColor}>
            {player}
          </text>
        </g>

        {/* 主面板 */}
        <g id="panel">
          <use href="#bg" clip-path="url(#bg-blur-clip)" filter='url("#bg-blur-filter")'></use>
          <use href="#bg-blur-part" fill="rgba(0, 0, 0, 0.1)"></use>
          <text fill={footerColor} font-size={12} text-anchor="end" x={width - 36} y={height - 12}>
            Arcaea Toolbelt@AOL B30
          </text>
        </g>
      </defs>
      <ResultCardDefs />
      <use href="#bg"></use>
      <use href="#panel"></use>
      <image href={brandImage[renderURL]} {...resize({ ...brandImage.size, width: 300 })} y={24}></image>
      <use href="#generator-info" x={666} y={80}></use>
      <use href="#player-info" x={330} y={100}></use>
      {grid(b30, 5).flatMap((row, i) =>
        row.map((col, j) => (
          <ResultCard
            key={`${i}-${j}`}
            item={col}
            renderURL={renderURL}
            coordinate={translate(gridX + j * 168, gridY + i * 136)}
          ></ResultCard>
        ))
      )}
    </svg>
  );
};

const sideShadowColors: Record<Side, string> = {
  [Side.Light]: "#376e99",
  [Side.Conflict]: "#8456b3",
  [Side.Colorless]: "#d4c6d4",
};

const ResultCardDefs: FC = () => (
  <defs>
    {/* 单曲潜力值序号 */}
    <filter id="number-badge-shadow">
      <feDropShadow dx={1} dy={1} stdDeviation={2} flood-color="#8988a7"></feDropShadow>
    </filter>
    <filter id="number-shadow">
      <feDropShadow dx={1} dy={1} stdDeviation={1} flood-color="#4c4c4c"></feDropShadow>
    </filter>
    <linearGradient id="number-badge-fill" x1="0" y1="100%" x2="50%" y2="60%">
      <stop offset="0" stop-color="#a777be"></stop>
      <stop offset="100%" stop-color="#75658b"></stop>
    </linearGradient>
    <polygon
      id="number-badge"
      points="0,0 30,0 41,10 30,20 0,20"
      fill="url(#number-badge-fill)"
      filter="url(#number-badge-shadow)"
    ></polygon>

    {/* 装饰分割线 */}
    <linearGradient id="left-fading-line">
      <stop offset="0" stop-color="rgba(255, 255, 255, 0)"></stop>
      <stop offset="100%" stop-color="rgba(255, 255, 255, 1)"></stop>
    </linearGradient>
    <polygon id="dot" points="0,1.5 1.5,0 0,-1.5 -1.5,0" fill="#ffffff"></polygon>
    <linearGradient id="right-fading-line">
      <stop offset="0" stop-color="rgba(255, 255, 255, 1)"></stop>
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0)"></stop>
    </linearGradient>

    {/* 六边形 */}
    <polygon id="hexagon" points="-5,11 4,11 14,0 4,-11 -5,-11 -15,0"></polygon>

    {/* 光芒、纷争、消色背景阴影 */}
    <filter id="side-shadow">
      <feGaussianBlur stdDeviation={5}></feGaussianBlur>
    </filter>

    {/* 分数背景 */}
    <linearGradient id="score-banner">
      <stop offset="0" stop-color="rgba(41, 27, 57, 0)"></stop>
      <stop offset="30%" stop-color="rgba(41, 27, 57, 1)"></stop>
      <stop offset="100%" stop-color="rgba(41, 27, 57, 1)"></stop>
    </linearGradient>

    {/* 曲名裁剪 */}
    <clipPath id="song-title-clip">
      <rect y={-20} height={40} width={110}></rect>
    </clipPath>

    {/* 通关评级 */}
    <polygon id="clear-hexagon" points="-5,12 4,12 15,0 4,-12 -5,-12 -16,0"></polygon>
    <g id="fail">
      <radialGradient id="fail-fill">
        <stop offset="0" stop-color="#5a1e3c"></stop>
        <stop offset="80%" stop-color="#2b0a13"></stop>
        <stop offset="100%" stop-color="#170509"></stop>
      </radialGradient>
      <use href="#clear-hexagon" fill="url(#fail-fill)" stroke="#460117"></use>
      <text fill="#bb405f" stroke="#691b32" stroke-width={0.7} font-size={20} font-family="Exo" x={-6} y={7}>
        L
      </text>
    </g>
    <g id="easy">
      <radialGradient id="easy-fill">
        <stop offset="0" stop-color="#2b625c"></stop>
        <stop offset="40%" stop-color="#295e57"></stop>
        <stop offset="90%" stop-color="#092030"></stop>
        <stop offset="100%" stop-color="#0a202f"></stop>
      </radialGradient>
      <use href="#clear-hexagon" fill="url(#easy-fill)" stroke="#04363c"></use>
      <text fill="#e6ffff" stroke="#699d9d" stroke-width={0.7} font-size={20} font-family="Exo" x={-7} y={7}>
        C
      </text>
    </g>
    <g id="normal">
      <radialGradient id="normal-fill">
        <stop offset="0" stop-color="#2e386a"></stop>
        <stop offset="40%" stop-color="#1b233f"></stop>
        <stop offset="90%" stop-color="#101438"></stop>
        <stop offset="100%" stop-color="#0a202f"></stop>
      </radialGradient>
      <use href="#clear-hexagon" fill="url(#normal-fill)" stroke="#15254f"></use>
      <text fill="#ffffff" stroke="#2b3568" stroke-width={0.7} font-size={20} font-family="Exo" x={-7} y={7}>
        C
      </text>
    </g>
    <g id="hard">
      <radialGradient id="hard-fill">
        <stop offset="0" stop-color="#572135"></stop>
        <stop offset="40%" stop-color="#4c1e31"></stop>
        <stop offset="90%" stop-color="#360c19"></stop>
        <stop offset="100%" stop-color="#220507"></stop>
      </radialGradient>
      <use href="#clear-hexagon" fill="url(#hard-fill)" stroke="#53092a"></use>
      <text fill="#fec2f0" stroke="#761c39" stroke-width={0.7} font-size={20} font-family="Exo" x={-7} y={7}>
        C
      </text>
    </g>
    <g id="full">
      <linearGradient id="full-fill" x1="50%" y1="100%" x2="50%" y2="0">
        <stop offset="0" stop-color="#522456"></stop>
        <stop offset="40%" stop-color="#3a223c"></stop>
        <stop offset="70%" stop-color="#2c192f"></stop>
        <stop offset="100%" stop-color="#140a14"></stop>
      </linearGradient>
      <linearGradient id="full-text-fill" x1="0" y1="100%" x2="0" y2="0">
        <stop offset="0" stop-color="#ff20ff"></stop>
        <stop offset="30%" stop-color="#ff6cff"></stop>
        <stop offset="50%" stop-color="#ffaeff"></stop>
        <stop offset="60%" stop-color="#ffccff"></stop>
        <stop offset="100%" stop-color="#ffffff"></stop>
      </linearGradient>
      <filter id="full-shadow">
        <feDropShadow stdDeviation={1} flood-color="#752b6a" dx={-0.5} dy={2}></feDropShadow>
      </filter>
      <use href="#clear-hexagon" fill="url(#full-fill)" stroke="#642e5d"></use>
      <text
        fill="url(#full-text-fill)"
        stroke="#6e3068"
        stroke-width={0.7}
        font-size={20}
        font-family="Exo"
        filter="url(#full-shadow)"
        x={-7}
        y={7}
      >
        F
      </text>
    </g>
    <g id="pure">
      <linearGradient id="pure-fill" x1="50%" y1="100%" x2="50%" y2="0">
        <stop offset="0" stop-color="#2f4f63"></stop>
        <stop offset="40%" stop-color="#2c394e"></stop>
        <stop offset="70%" stop-color="#1e2332"></stop>
        <stop offset="100%" stop-color="#001419"></stop>
      </linearGradient>
      <linearGradient id="pure-text-fill" x1="0" y1="100%" x2="0" y2="0">
        <stop offset="0" stop-color="#ffffff"></stop>
        <stop offset="65%" stop-color="#ffeeff"></stop>
        <stop offset="100%" stop-color="#ff66ff"></stop>
      </linearGradient>
      <filter id="pure-shadow">
        <feDropShadow stdDeviation={1.2} flood-color="#2d719a" dx={-0.5} dy={2}></feDropShadow>
      </filter>
      <use href="#clear-hexagon" fill="url(#pure-fill)" stroke="#433267"></use>
      <text
        fill="url(#pure-text-fill)"
        stroke="#2f5c80"
        stroke-width={0.7}
        font-size={20}
        font-family="Exo"
        filter="url(#pure-shadow)"
        x={-7}
        y={7}
      >
        P
      </text>
    </g>
  </defs>
);

const ResultCard: FC<{ item: PlayResultItem; coordinate: Coordinate; renderURL: RenderURL }> = ({
  coordinate,
  item,
  renderURL,
}) => {
  const { cover, difficultyImage, level, no, potential, rankImage, score, plus, title, side, clear } = item;
  const { point } = coordinate;
  const { decimal, fixed } = parsePotential(potential);
  return (
    <g>
      <rect fill="#6b5e88" width={142} height={97} {...point(0, 0)}></rect>
      <rect fill="#d7bcfa" width={142} height={18} {...point(0, 97)}></rect>
      <rect fill="#000000" opacity={0.3} width={138} height={111} {...point(2, 2)}></rect>
      <use href="#number-badge" {...point(-4, 7)}></use>
      <text
        fill="#ffffff"
        text-anchor="middle"
        font-size={12}
        font-weight="bold"
        filter="url(#number-shadow)"
        {...point(16, 22)}
      >
        #{no}
      </text>
      <text fill="#ffffff" text-anchor="middle" font-size={5} {...point(25, 41)}>
        POTENTIAL
      </text>
      <text fill="#ffffff" text-anchor="middle" font-size={10} {...point(25, 55)}>
        {decimal}
        {fixed}
      </text>
      <rect width={9} height={1} fill="url(#left-fading-line)" {...point(10, 61)}></rect>
      <use href="#dot" {...point(25, 61)}></use>
      <rect width={9} height={1} fill="url(#right-fading-line)" {...point(31, 61)}></rect>
      <use href="#hexagon" fill="#dad7e8" {...point(25, 77)}></use>
      <image href={rankImage[renderURL]} width={36} height={36} {...point(7, 59)}></image>
      <rect
        width={95}
        height={95}
        rx={10}
        fill={sideShadowColors[side]}
        filter="url(#side-shadow)"
        {...point(47, 4)}
      ></rect>
      <rect width={91} height={91} fill="#291b39" {...point(48, 5)}></rect>
      <image href={cover[renderURL]} width={87} height={87} {...point(50, 7)}></image>
      <image href={difficultyImage[renderURL]} width={36} height={36} {...point(122, -12)}></image>
      <text fill="#ffffff" text-anchor="middle" font-size={10} {...point(140, 10)}>
        {level}
        {plus ? "+" : ""}
      </text>
      <rect width={87} height={12} {...point(50, 82)} fill="url(#score-banner)"></rect>
      <text
        font-size={12}
        font-weight="bold"
        font-family="Exo"
        fill="#ffffff"
        stroke="#2d1e3e"
        stroke-width={0.5}
        text-anchor="end"
        {...point(117, 93)}
      >
        {formatScore(score)}
      </text>
      <text
        font-size={12}
        font-family="Exo"
        fill="#ffffff"
        stroke="#2d1e3e"
        font-weight="bold"
        stroke-width={0.35}
        clip-path="polygon(0 20, 110 20, 110 0, 0 0)"
        {...point(9, 110)}
      >
        {title}
      </text>
      <use href={`#${clear}`} {...point(138, 95)}></use>
    </g>
  );
};
