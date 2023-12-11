import { Button } from "../button";
import "preact-material-components/Button/style.css";
import "./style.css";
import { useEffect, useState } from "preact/hooks";
import brand from "../../assets/title.png";
import { Best30 } from "../best-30";
import { Clear, Vector2D, Best30Data } from "../../model";
import { CharacterImage } from "@arcaea-toolbelt/models/character";
import type { RPCConnection } from "@arcaea-toolbelt/utils/rpc";
import type { ClearRank, HostAPI, ImageFile, PickImageOptions } from "@arcaea-toolbelt/services/generator-api";
import { formatDate, future } from "../../utils/misc";

interface UserPreference {
  avatar: CharacterImage;
  course: number;
  bg: string;
}

interface StartUpContext {
  atb: typeof import("@arcaea-toolbelt/services/generator-api");
  connection: RPCConnection<HostAPI>;
  defaultPreference: UserPreference;
}

const bgPaths = ["img/bg_light.jpg", ...Array.from({ length: 8 }, (_, i) => `img/world/1080/${i + 1}.jpg`)];

export const App = () => {
  const [ctx, setCtx] = useState<StartUpContext>();
  const [b30Data, setB30Data] = useState<Best30Data>();
  const [ratingBadge, setRatingBadge] = useState<string>();
  const usePicker = <P extends keyof UserPreference>(
    name: P,
    getCandidates: () => Promise<UserPreference[P][]>,
    pickerOptions: PickImageOptions,
    mapToURLs: (candidates: UserPreference[P][]) => Promise<URL[]>
  ) => {
    const [file, setFile] = useState<
      ImageFile & {
        size: Vector2D;
        bytes: Uint8Array;
        preference: UserPreference[P];
      }
    >();
    useEffect(() => {
      return () => {
        if (file) {
          console.debug(`Revoking image file object URL...`);
          URL.revokeObjectURL(file.blobURL);
        }
      };
    }, [file]);
    const fetchImage = async () => {
      const preference: UserPreference = {
        ...defaultPreference,
        ...(await api.getPreference()),
      };
      const saved = preference[name];
      const [resource] = await mapToURLs([saved]);
      if (!resource) {
        throw new Error("Resource not found.");
      }
      const [file] = await api.getImages([resource]);
      if (!file) {
        throw new Error("Image file not found.");
      }
      const blob = file.blob;
      const blobURL = URL.createObjectURL(blob);
      const bitmap = await createImageBitmap(blob);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      setFile({
        ...file,
        blobURL,
        bytes,
        size: {
          x: bitmap.width,
          y: bitmap.height,
        },
        preference: saved,
      });
    };
    const pick = async () => {
      const preference: UserPreference = {
        ...defaultPreference,
        ...(await api.getPreference()),
      };
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
    if (b30Data) {
      return () => {
        for (const b of b30Data.b30) {
          URL.revokeObjectURL(b.cover);
        }
      };
    }
  }, [b30Data]);
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
          const url = await api.resolvePotentialBadge(rating);
          const [file] = await api.getImages([url]);
          const ratingBadge = URL.createObjectURL(file.blob);
          const covers = await api.getImages(
            await api.resolveCovers(
              b30.map((b) => ({
                difficulty: difficulties.indexOf(b.chart.difficulty),
                songId: b.song.id,
              }))
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
              cover: URL.createObjectURL(covers[i].blob),
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
      const difficultyImages = (
        await api.getImages(await api.resolveAssets(difficultyNames.map((name) => `img/course/1080/diff-${name}.png`)))
      ).map((file) => URL.createObjectURL(file.blob));
      const ranks = Object.values(Grade);
      const rankImages = (await api.getImages(await api.resolveGradeImgs(ranks))).map((file) =>
        URL.createObjectURL(file.blob)
      );
      setCtx({
        atb,
        connection,
        defaultPreference,
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
  const loading = <div>正在加载……</div>;
  if (!ctx) {
    return loading;
  }
  const { atb, connection, defaultPreference } = ctx;
  const { CharacterImageKind, CharacterStatus } = atb;
  const { api } = connection;
  if (!avatarImg || !courseImg || !bgImg || ratingBadge == null) {
    return loading;
  }

  const darkText = "#231731";
  const lightText = "#ffffff";
  const bgIndex = bgPaths.indexOf(bgImg.preference);
  const generatorTextColor = [0, 1, 3, 4, 8].includes(bgIndex) ? darkText : lightText;
  const footerColor = [0, 3, 5, 7].includes(bgIndex) ? darkText : lightText;
  const playerTextColor = courseImg.preference <= 6 ? darkText : lightText;

  const exportImage = () => {
    alert("暂不支持，敬请期待");
  };

  return (
    <main class="app">
      <div class="actions">
        <Button onClick={avatar.pick}>选择头像</Button>
        <Button onClick={course.pick}>选择段位</Button>
        <Button onClick={bg.pick}>选择背景</Button>
        <Button onClick={exportImage}>导出图片</Button>
      </div>
      {b30Data ? (
        <Best30
          {...{
            avatar: avatarImg.blobURL,
            bg: {
              url: bgImg.blobURL,
              size: bgImg.size,
            },
            course: courseImg.blobURL,
            generatorTextColor,
            playerTextColor,
            footerColor,
            // TODO
            brand,
            ...b30Data,
          }}
        ></Best30>
      ) : (
        "正在加载相关图片"
      )}
    </main>
  );
};
