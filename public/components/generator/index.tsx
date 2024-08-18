import "./style.css";
import { Canvg } from "canvg";
import { Button } from "../button";
import { FunctionComponent as FC, render } from "preact";
import {
  ArcaeaToolbeltGeneratorAPI,
  Best30Data,
  Best30RenderContext,
  DetailedImageFile,
  getBanner,
  RenderURL,
  StartUpContext,
  UserPreference,
  Vector2D,
} from "../../model";
import { CharacterImage } from "@arcaea-toolbelt/models/character";
import { HostAPI } from "@arcaea-toolbelt/services/generator-api";
import { useEffect, useState } from "preact/hooks";
import {
  blob2DataURL,
  createDetailedImageFile,
  diamond,
  generateExportImageName,
  getAreaColor,
  managedBlobURL,
  rect,
} from "../../utils/misc";
import { Best30, height, width } from "../best-30";
import { Rectangle } from "@arcaea-toolbelt/utils/image-clip";
import { Slider } from "../slider";

const darkText = "#231731";
const lightText = "#ffffff";
const bgPaths = ["img/bg_light.jpg", ...Array.from({ length: 8 }, (_, i) => `img/world/1080/${i + 1}.jpg`)];

const useAvatarPicker = (
  atb: ArcaeaToolbeltGeneratorAPI,
  api: HostAPI,
  getPreference: () => Promise<UserPreference>
) => {
  const { CharacterImageKind, CharacterStatus } = atb;
  const [image, setAvatar] = useState<DetailedImageFile>();
  const getAvatars = async () => {
    const characters = await api.getAllCharacters();
    const characterImages = characters.flatMap<CharacterImage>((c) => {
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
    const urls = await api.resolveCharacterImages(characterImages);
    return urls.map((url, i) => ({ url, character: characterImages[i]! }));
  };
  const getAvatarURL = async (avatar: UserPreference["avatar"]) => {
    if (typeof avatar === "string") {
      return new URL(avatar);
    }
    const [url] = await api.resolveCharacterImages([avatar]);
    return url!;
  };
  const fetch = async () => {
    const { avatar } = await getPreference();
    const avatarURL = await getAvatarURL(avatar);
    const [file] = await api.getImages([avatarURL]);
    setAvatar(await createDetailedImageFile(file));
  };
  const pick = async () => {
    const avatars = await getAvatars();
    const result = await api.pickImage(avatars, {
      title: "选择头像",
      display: { height: 64, width: 64, columns: 4 },
      custom: {
        single: "custom/avatar",
        clip: {
          config: diamond(288),
          canvas: {
            height: 320,
            width: 320,
          },
        },
      },
    });
    if (!result) {
      return;
    }
    const preference = await getPreference();
    const newPreference: UserPreference = {
      ...preference,
      avatar: result.type === "basic" ? result.candidate.character : result.image.resourceURL.href,
    };
    await api.savePreference(newPreference);
    await fetch();
  };

  return {
    image,
    fetch,
    pick,
  };
};

const useBgPicker = (api: HostAPI, getPreference: () => Promise<UserPreference>) => {
  const [state, setState] = useState<{
    image: DetailedImageFile;
    generatorTextColor: string;
    footerColor: string;
  }>();

  const fetch = async () => {
    const { bg } = await getPreference();
    const [bgURL] = typeof bg === "string" ? await api.resolveAssets([bg]) : [new URL(bg.url)];
    const bgIndex = typeof bg === "string" ? bgPaths.findIndex((bgPath) => bg.endsWith(bgPath)) : -1;
    const [file] = await api.getImages([bgURL]);
    const blob = file.blob;
    const blobURL = managedBlobURL(blob);
    const dataURL = await blob2DataURL(blob);
    const bitmap = await createImageBitmap(blob);
    const size: Vector2D = {
      x: bitmap.width,
      y: bitmap.height,
    };
    const image: DetailedImageFile = {
      ...file,
      blobURL,
      size,
      dataURL,
    };
    const isCustomBg = bgIndex === -1;
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
    const extractColor = (area: Rectangle) => {
      const [r, g, b] = getAreaColor(context, area);
      const isLight = r + g + b > 0x80 * 3;
      return isLight ? darkText : lightText;
    };
    const footerColor = isCustomBg
      ? extractColor({
          position: { x: 700, y: 1010 },
          size: { x: 175, y: 30 },
        })
      : [0, 3, 5, 7].includes(bgIndex)
      ? darkText
      : lightText;
    const generatorTextColor = isCustomBg
      ? extractColor({
          position: { x: 660, y: 70 },
          size: { x: 120, y: 40 },
        })
      : [0, 1, 3, 4, 8].includes(bgIndex)
      ? darkText
      : lightText;
    bitmap.close();
    setState({
      image,
      footerColor,
      generatorTextColor,
    });
  };

  const pick = async () => {
    const urls = await api.resolveAssets(bgPaths);
    const result = await api.pickImage(
      urls.map((url, i) => ({
        url,
        path: bgPaths[i]!,
      })),
      {
        title: "选择背景",
        display: { columns: 3, height: 80, width: 80 },
        custom: {
          single: "custom/bg",
          clip: {
            config: rect({ x: width, y: height }),
            canvas: {
              width: width + 100,
              height: height + 100,
            },
          },
        },
      }
    );
    if (!result) {
      return;
    }
    const preference = await getPreference();
    const newPreference: UserPreference = {
      ...preference,
      bg:
        result.type === "basic"
          ? result.candidate.path
          : {
              url: result.image.resourceURL.href,
            },
    };
    await api.savePreference(newPreference);
    await fetch();
  };
  return {
    state,
    fetch,
    pick,
  };
};

const useCoursePicker = (
  atb: ArcaeaToolbeltGeneratorAPI,
  api: HostAPI,
  getPreference: () => Promise<UserPreference>
) => {
  const [state, setState] = useState<{
    image: DetailedImageFile;
    playerTextColor: string;
  }>();
  const fetch = async () => {
    const preference = await getPreference();
    const { course } = preference;
    const { banners } = await api.getAssetsInfo();
    const [url] = await api.resolveBanners([getBanner(preference, atb)]);
    const [image] = await api.getImages([url]);
    const detailed = await createDetailedImageFile(image!);
    setState({
      image: detailed,
      playerTextColor: course <= 6 ? darkText : lightText,
    });
  };
  const pick = async () => {
    const { banners } = await api.getAssetsInfo();
    const urls = await api.resolveBanners(banners);
    const result = await api.pickImage(
      urls.map((url, i) => ({
        url,
        rank: i + 1,
      })),
      {
        title: "选择段位",
        display: { columns: 1, width: 250, height: 32 },
      }
    );
    if (!result || result.type === "custom") {
      return;
    }
    const preference = await getPreference();
    const newPreference: UserPreference = {
      ...preference,
      course: result.candidate.rank,
    };
    await api.savePreference(newPreference);
    await fetch();
  };
  return {
    state,
    fetch,
    pick,
  };
};

export const Generator: FC<{
  context: StartUpContext;
  b30Data: Best30Data;
}> = ({ context, b30Data }) => {
  const { atb, brandImage, connection, defaultPreference, exoFontFile } = context;
  const { api } = connection;
  const [scale, setScale] = useState(1);
  const getPreference = async (): Promise<UserPreference> => ({
    ...defaultPreference,
    ...(await api.getPreference()),
  });
  const avatar = useAvatarPicker(atb, api, getPreference);
  const bg = useBgPicker(api, getPreference);
  const course = useCoursePicker(atb, api, getPreference);
  useEffect(() => {
    queueMicrotask(async () => {
      await Promise.all([avatar.fetch(), bg.fetch(), course.fetch()]);
    });
  }, []);
  const { image: avatarImg } = avatar;
  const { state: bgState } = bg;
  const { state: courseState } = course;
  if (!avatarImg || !bgState || !courseState) {
    return <p>loading</p>;
  }
  const { footerColor, generatorTextColor } = bgState;
  const { playerTextColor } = courseState;
  const best30RenderContext: Best30RenderContext = {
    avatarImage: avatarImg,
    backgroundImage: bgState.image,
    courseImage: courseState.image,
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
    // TODO 自定义图片的外链处理
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
