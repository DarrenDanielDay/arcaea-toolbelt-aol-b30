import { useEffect, useState } from "preact/hooks";
import brand from "../../assets/title.png";
import {
  Clear,
  Best30Data,
  ArcaeaToolbeltGeneratorAPI,
  StartUpContext,
  UserPreference,
} from "../../model";
import type { RPCConnection } from "@arcaea-toolbelt/utils/rpc";
import type {
  ClearRank,
  HostAPI,
} from "@arcaea-toolbelt/services/generator-api";
import {
  createDetailedImageFile,
  createDetailedImageFiles,
  fetchAsBlob,
  fetchAsResource,
  formatDate,
  future,
} from "../../utils/misc";
import { Generator } from "../generator";

export const App = () => {
  const [ctx, setCtx] = useState<StartUpContext>();
  const [b30Data, setB30Data] = useState<Best30Data>();

  useEffect(() => {
    let connection: RPCConnection<HostAPI> | null = null;
    queueMicrotask(async () => {
      const importScriptCode = `import(${JSON.stringify(import.meta.env.API_SCRIPT_URL)})`;
      // @ts-ignore
      const atb: ArcaeaToolbeltGeneratorAPI = await eval(importScriptCode);
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

  const loading = (
    <main class="app">
      <div>正在加载资源……</div>
    </main>
  );

  if (!ctx || !b30Data) {
    return loading;
  }

  return <Generator b30Data={b30Data} context={ctx}></Generator>;
};
