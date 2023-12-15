import { Canvg } from "canvg";
import { Button } from "../button";
import "./style.css";
import { useEffect, useState } from "preact/hooks";
import brand from "../../assets/title.png";
import { Best30, width, height } from "../best-30";
import {
  Clear,
  Vector2D,
  Best30Data,
  DetailedImageFile,
  RenderURL,
  Best30RenderContext,
  ResourceFile,
} from "../../model";
import { CharacterImage } from "@arcaea-toolbelt/models/character";
import type { RPCConnection } from "@arcaea-toolbelt/utils/rpc";
import type { ClearRank, HostAPI, PickImageOptions } from "@arcaea-toolbelt/services/generator-api";
import {
  createDetailedImageFile,
  createDetailedImageFiles,
  fetchAsBlob,
  fetchAsResource,
  formatDate,
  future,
  generateExportImageName,
} from "../../utils/misc";
import { render } from "preact";
import { Slider } from "../slider";

interface UserPreference {
  avatar: CharacterImage;
  course: number;
  bg: string;
}

interface StartUpContext {
  atb: typeof import("@arcaea-toolbelt/services/generator-api");
  connection: RPCConnection<HostAPI>;
  defaultPreference: UserPreference;
  brandImage: DetailedImageFile;
  exoFontFile: ResourceFile;
}

const bgPaths = ["img/bg_light.jpg", ...Array.from({ length: 8 }, (_, i) => `img/world/1080/${i + 1}.jpg`)];

export const App = () => {
  const [ctx, setCtx] = useState<StartUpContext>();
  const [b30Data, setB30Data] = useState<Best30Data>();
  const [ratingBadge, setRatingBadge] = useState<DetailedImageFile>();
  const [scale, setScale] = useState(1);
  const usePicker = <P extends keyof UserPreference>(
    name: P,
    getCandidates: () => Promise<UserPreference[P][]>,
    pickerOptions: PickImageOptions,
    mapToURLs: (candidates: UserPreference[P][]) => Promise<URL[]>
  ) => {
    const [file, setFile] = useState<
      DetailedImageFile & {
        size: Vector2D;
        preference: UserPreference[P];
      }
    >();
    const getPreference = async (): Promise<UserPreference> => ({
      ...defaultPreference,
      ...(await api.getPreference()),
    });

    const fetchImage = async () => {
      const preference: UserPreference = await getPreference();
      const saved = preference[name];
      const [resource] = await mapToURLs([saved]);
      if (!resource) {
        throw new Error("Resource not found.");
      }
      const [file] = await api.getImages([resource]);
      if (!file) {
        throw new Error("Image file not found.");
      }
      setFile({
        ...(await createDetailedImageFile(file)),
        preference: saved,
      });
    };
    const pick = async () => {
      const preference = await getPreference();
      const candidates = await getCandidates();
      const urls = await mapToURLs(candidates);
      if (!pickerOptions.defaultSelected) {
        [pickerOptions.defaultSelected] = await mapToURLs([preference[name]]);
      }
      const selected = await api.pickImage(urls, pickerOptions);
      if (!selected) {
        return;
      }
      const candidateIndex = urls.findIndex((url) => url.href === selected.href);
      const candidate = candidates[candidateIndex];
      await api.savePreference({
        ...preference,
        [name]: candidate,
      });
      await fetchImage();
    };
    return {
      fetchImage,
      pick,
      file,
    };
  };
  const avatar = usePicker(
    "avatar",
    async () => {
      const characters = await api.getAllCharacters();
      const images = characters.flatMap<CharacterImage>((c) => {
        const characterImgs: CharacterImage[] = [
          {
            id: c.id,
            kind: CharacterImageKind.Icon,
            status: CharacterStatus.Initial,
          },
        ];
        if (c.can?.awake) {
          characterImgs.push({
            id: c.id,
            kind: CharacterImageKind.Icon,
            status: CharacterStatus.Awaken,
          });
        }
        if (c.can?.lost) {
          characterImgs.push({
            id: c.id,
            kind: CharacterImageKind.Icon,
            status: CharacterStatus.Lost,
          });
        }
        return characterImgs;
      });
      return images;
    },
    {
      title: "选择头像",
      display: { height: 64, width: 64, columns: 4 },
    },
    (images) => api.resolveCharacterImages(images)
  );
  const course = usePicker(
    "course",
    async () => Array.from({ length: 11 }, (_, i) => i + 1),
    {
      title: "选择段位",
      display: { columns: 1, width: 250, height: 32 },
    },
    (courseRanks) => api.resolveAssets(courseRanks.map((i) => `img/course/banner/${i}.png`))
  );
  const bg = usePicker(
    "bg",
    async () => bgPaths,
    {
      title: "选择背景",
      display: { columns: 3, height: 80, width: 80 },
    },
    (bgs) => api.resolveAssets(bgs)
  );
  useEffect(() => {
    let connection: RPCConnection<HostAPI> | null = null;
    queueMicrotask(async () => {
      const importScriptCode = `import(${JSON.stringify(import.meta.env.API_SCRIPT_URL)})`;
      // @ts-ignore
      const atb: typeof import("@arcaea-toolbelt/services/generator-api") = await eval(importScriptCode);
      const { createRpc, CharacterImageKind, CharacterStatus, Grade, ClearRank, Difficulty } = atb;
      const prepared = future();
      const rpc = createRpc({
        async setB30(response) {
          setB30Data(undefined);
          await prepared.promise;
          const { b30, rating, username, potential } = response;
          const ratingURL = await api.resolvePotentialBadge(rating);
          const [ratingBadgeFile] = await api.getImages([ratingURL]);
          const ratingBadge = await createDetailedImageFile(ratingBadgeFile);
          const covers = await createDetailedImageFiles(
            await api.getImages(
              await api.resolveCovers(
                b30.map((b) => ({
                  difficulty: difficulties.indexOf(b.chart.difficulty),
                  songId: b.song.id,
                }))
              )
            )
          );
          setRatingBadge(ratingBadge);
          setB30Data({
            date: formatDate(response.queryTime),
            player: username,
            potential: +potential,
            ratingBadge,
            b30: b30.map((b, i) => ({
              clear: clearMap[b.clear!] || Clear.TL,
              cover: covers[i],
              level: b.chart.level,
              plus: b.chart.plus,
              no: b.no,
              potential: b.score.potential,
              side: b.song.side,
              title: b.chart.override?.name ?? b.song.name,
              score: b.score.score,
              difficultyImage: difficultyImages[difficulties.indexOf(b.chart.difficulty)],
              rankImage: rankImages[ranks.indexOf(b.score.grade)],
            })),
          });
        },
      });
      connection = rpc.start();
      const defaultPreference: UserPreference = {
        // 头像：光（未觉醒）
        avatar: {
          id: 0,
          kind: CharacterImageKind.Icon,
          status: CharacterStatus.Initial,
        },
        // 1段
        course: 1,
        // 初始背景
        bg: "img/bg_light.jpg",
      };
      const { api } = connection;
      const clearMap: Record<ClearRank, Clear> = {
        [ClearRank.EasyClear]: Clear.EC,
        [ClearRank.FullRecall]: Clear.FR,
        [ClearRank.HardClear]: Clear.HC,
        [ClearRank.Maximum]: Clear.PM,
        [ClearRank.NormalClear]: Clear.NC,
        [ClearRank.PureMemory]: Clear.PM,
        [ClearRank.TrackLost]: Clear.TL,
      };
      const difficulties = Object.values(Difficulty);
      const difficultyNames = Object.keys(Difficulty).map((d) => d.toLowerCase());
      const ranks = Object.values(Grade);
      const [difficultyImages, rankImages, brandImage, exoFontFile] = await Promise.all([
        (async () =>
          createDetailedImageFiles(
            await api.getImages(
              await api.resolveAssets(difficultyNames.map((name) => `img/course/1080/diff-${name}.png`))
            )
          ))(),
        (async () => createDetailedImageFiles(await api.getImages(await api.resolveGradeImgs(ranks))))(),
        (async () => {
          const dist = new URL(brand, document.baseURI);
          const blob = await fetchAsBlob(dist);
          return createDetailedImageFile({
            blob,
            blobURL: "",
            distURL: dist.href,
            filename: "title.png",
            resourceURL: dist,
          });
        })(),
        (async () => {
          return await fetchAsResource("https://fonts.gstatic.com/s/exo/v20/4UaZrEtFpBI4f1ZSIK9d4LjJ4rQwOwRmOw.woff2");
        })(),
      ]);
      setCtx({
        atb,
        connection,
        defaultPreference,
        brandImage,
        exoFontFile,
      });
      prepared.done();
    });
    return () => {
      connection?.stop();
    };
  }, []);
  useEffect(() => {
    if (ctx) {
      queueMicrotask(async () => {
        await Promise.all([avatar.fetchImage(), course.fetchImage(), bg.fetchImage()]);
      });
    }
  }, [ctx]);
  const { file: avatarImg } = avatar;
  const { file: courseImg } = course;
  const { file: bgImg } = bg;
  const loading = (
    <main class="app">
      <div>正在加载资源……</div>
    </main>
  );
  if (!ctx) {
    return loading;
  }
  const { atb, connection, defaultPreference, brandImage, exoFontFile } = ctx;
  const { CharacterImageKind, CharacterStatus } = atb;
  const { api } = connection;
  if (!avatarImg || !courseImg || !bgImg || ratingBadge == null || !b30Data) {
    return loading;
  }
  const darkText = "#231731";
  const lightText = "#ffffff";
  const bgIndex = bgPaths.indexOf(bgImg.preference);
  const generatorTextColor = [0, 1, 3, 4, 8].includes(bgIndex) ? darkText : lightText;
  const footerColor = [0, 3, 5, 7].includes(bgIndex) ? darkText : lightText;
  const playerTextColor = courseImg.preference <= 6 ? darkText : lightText;
  const best30RenderContext: Best30RenderContext = {
    avatarImage: avatarImg,
    backgroundImage: bgImg,
    courseImage: courseImg,
    generatorTextColor,
    playerTextColor,
    footerColor,
    brandImage,
    exoFontFile,
    scale,
    ...b30Data,
    renderURL: "blobURL",
  };
  const pngQuality = scale < 2 ? "高糊" : scale < 3 ? "还行" : "高清";
  const renderSVG = async (renderURL: RenderURL) => {
    const container = document.createElement("div");
    console.log(best30RenderContext);
    render(<Best30 {...best30RenderContext} renderURL={renderURL}></Best30>, container);
    await Promise.resolve();
    const svg = container.innerHTML;
    return svg;
  };

  const exportPNG = async () => {
    const svg = await renderSVG("blobURL");
    const canvas = new OffscreenCanvas(width, height);
    const canvg = Canvg.fromString(canvas.getContext("2d")!, svg);
    await canvg.render();
    const blob = await canvas.convertToBlob({
      quality: 1,
    });
    await api.exportAsImage(blob, {
      filename: `${generateExportImageName()}.png`,
    });
  };

  const exportInlinedSVG = async () => {
    const blob = new Blob([await renderSVG("dataURL")], { type: "image/svg+xml" });
    await api.exportAsImage(blob, {
      filename: `${generateExportImageName()}.svg`,
    });
  };

  const exportExternedSVG = async () => {
    const blob = new Blob([await renderSVG("distURL")], { type: "image/svg+xml" });
    await api.exportAsImage(blob, {
      filename: `${generateExportImageName()}.svg`,
    });
  };

  return (
    <main class="app">
      <div class="actions">
        <Button onClick={avatar.pick}>选择头像</Button>
        <Button onClick={course.pick}>选择段位</Button>
        <Button onClick={bg.pick}>选择背景</Button>
        <Button onClick={exportPNG}>导出{pngQuality}png</Button>
        <Button onClick={exportInlinedSVG}>导出内联svg</Button>
        <Button onClick={exportExternedSVG}>导出外链svg</Button>
        <Slider
          id="scale"
          value={scale}
          onInput={(e) => {
            const { target } = e;
            if (!(target instanceof HTMLInputElement)) {
              return;
            }
            setScale(+target.value);
          }}
          min={1}
          max={4}
          step={0.5}
        >
          放缩尺寸
        </Slider>
      </div>
      <div class="b30-container">
        <Best30 {...best30RenderContext}></Best30>
      </div>
    </main>
  );
};
