import { Suspense, lazy, useCallback, useState } from "react";
import { CloudSun, Flower2, Music2, PawPrint, Sparkles, TreePine } from "lucide-react";
import { hasWebGL } from "../../lib/games/webgl";
import type { Locale } from "../../lib/i18n";
import type { MallowSceneCopy } from "./MallowIsleScene";

const Scene = lazy(() => import("./MallowIsleScene"));

interface Copy {
  eyebrow: string;
  title: string;
  subtitle: string;
  start: string;
  loading: string;
  unavailable: string;
  localOnly: string;
  features: Array<{ title: string; body: string }>;
  scene: MallowSceneCopy;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    eyebrow: "SOFT ISLAND LIFE / ORIGINAL 3D BROWSER GAME",
    title: "Mallow Isle",
    subtitle: "말랑한 언덕을 빚고 꽃과 나무, 벤치를 놓아 작은 섬을 나만의 쉼터로 가꾸세요. 토끼가 되어 동물 이웃과 바람 부는 하루를 천천히 걸어봅니다.",
    start: "섬으로 산책 가기",
    loading: "구름과 풀바람을 불러오는 중…",
    unavailable: "이 브라우저에서는 WebGL을 사용할 수 없어 3D 섬을 시작할 수 없습니다.",
    localOnly: "계정 없음 · 섬은 이 브라우저에만 자동 저장",
    features: [
      { title: "손끝으로 빚는 지형", body: "땅을 부드럽게 올리고 내리며 산책길과 언덕을 직접 만듭니다." },
      { title: "살아 있는 파스텔 섬", body: "겹겹이 쌓인 구름, 부드러운 그림자, 바람에 흔들리는 나무와 꽃" },
      { title: "느긋한 동물 이웃", body: "치비 여우·곰·고양이와 기기에서 합성되는 포근한 lo-fi 사운드" },
    ],
    scene: {
      islandName: "MALLOW ISLE", cozy: "포근함", day: "DAY", breeze: "산들바람", saved: "자동 저장", soundOn: "음악 켜기", soundOff: "음악 끄기",
      reset: "새 섬", resetConfirm: "현재 섬 꾸미기를 지우고 처음 모습으로 돌아갈까요?",
      walkHint: "WASD/화살표로 걷고, 드래그로 둘러보고, 휠로 가까이 보세요.",
      sculptHint: "섬 표면을 누르거나 드래그해 선택한 도구를 사용하세요.",
      tools: { roam: "산책", raise: "올리기", lower: "내리기", tree: "나무", flowers: "꽃", bench: "벤치", erase: "치우기" },
      descriptions: {
        roam: "낮은 3인칭 카메라로 토끼와 함께 섬을 산책합니다.",
        raise: "둥근 브러시로 땅을 포근하게 들어 올립니다.",
        lower: "땅을 부드럽게 눌러 오솔길과 낮은 터를 만듭니다.",
        tree: "바람에 흔들리는 파스텔 나무를 심습니다.",
        flowers: "색색의 작은 들꽃 무리를 심습니다.",
        bench: "동물 이웃이 쉬어 갈 아늑한 벤치를 둡니다.",
        erase: "가장 가까운 장식을 조심스럽게 치웁니다.",
      },
      notices: { shaped: "섬이 말랑하게 빚어졌어요", placed: "포근함이 한 조각 늘었어요", erased: "장식을 정리했어요", crowded: "조금 더 넓은 자리를 골라주세요", shoreline: "물가는 그대로 두어 파도를 지켜요", full: "섬이 가득 찼어요" },
    },
  },
  en: {
    eyebrow: "SOFT ISLAND LIFE / ORIGINAL 3D BROWSER GAME",
    title: "Mallow Isle",
    subtitle: "Shape pillowy hills and place flowers, trees and benches to make a tiny island feel like home. Wander as a little rabbit among animal neighbors and a living sea breeze.",
    start: "Take an island walk",
    loading: "Calling in clouds and meadow breezes…",
    unavailable: "WebGL is unavailable in this browser, so the 3D island cannot start.",
    localOnly: "No account · your island auto-saves only in this browser",
    features: [
      { title: "Terrain at your fingertips", body: "Gently raise and lower the land to make paths, lookouts and soft hills." },
      { title: "A living pastel island", body: "Layered clouds, soft shadows, and trees and flowers moved by the wind" },
      { title: "Unhurried animal neighbors", body: "Chibi fox, bear and cat friends with cozy lo-fi synthesized on your device" },
    ],
    scene: {
      islandName: "MALLOW ISLE", cozy: "Cozy", day: "DAY", breeze: "Breeze", saved: "Auto-saved", soundOn: "Turn music on", soundOff: "Turn music off",
      reset: "New island", resetConfirm: "Erase your island changes and return to the original little island?",
      walkHint: "Walk with WASD/arrows, drag to look around, and use the wheel to come closer.",
      sculptHint: "Press or drag across the island surface to use your selected tool.",
      tools: { roam: "Roam", raise: "Raise", lower: "Lower", tree: "Tree", flowers: "Flowers", bench: "Bench", erase: "Tidy" },
      descriptions: {
        roam: "Walk the island with your rabbit in a low third-person view.",
        raise: "Lift the ground with a soft, round sculpting brush.",
        lower: "Press the earth down gently to make paths and little clearings.",
        tree: "Plant a pastel tree that sways in the sea breeze.",
        flowers: "Tuck a small cluster of colorful meadow flowers into the grass.",
        bench: "Place a cozy resting spot for your animal neighbors.",
        erase: "Carefully remove the decoration closest to your pointer.",
      },
      notices: { shaped: "The island feels a little softer", placed: "One more cozy detail", erased: "That spot is tidy again", crowded: "Choose a roomier patch of grass", shoreline: "The shoreline stays gentle for the waves", full: "The island is full" },
    },
  },
  ja: {
    eyebrow: "SOFT ISLAND LIFE / ORIGINAL 3D BROWSER GAME",
    title: "Mallow Isle",
    subtitle: "ふんわりした丘を形作り、花や木、ベンチを置いて、小さな島を自分だけの居場所に。子うさぎになって動物の隣人と潮風の一日をゆっくり歩きましょう。",
    start: "島へ散歩に行く",
    loading: "雲と草原の風を呼んでいます…",
    unavailable: "このブラウザではWebGLを利用できないため、3Dの島を開始できません。",
    localOnly: "アカウント不要 · 島はこのブラウザだけに自動保存",
    features: [
      { title: "指先で作る地形", body: "地面をやさしく上げ下げし、小道や展望台、丸い丘を作れます。" },
      { title: "息づくパステルの島", body: "重なる雲、柔らかな影、風に揺れる木々と花" },
      { title: "のんびりした動物の隣人", body: "ちびキツネ・クマ・ネコと端末内で合成される心地よいlo-fi" },
    ],
    scene: {
      islandName: "MALLOW ISLE", cozy: "居心地", day: "DAY", breeze: "そよ風", saved: "自動保存", soundOn: "音楽をオン", soundOff: "音楽をオフ",
      reset: "新しい島", resetConfirm: "島の飾り付けを消して、最初の小島に戻しますか？",
      walkHint: "WASD/矢印で歩き、ドラッグで見回し、ホイールで近づけます。",
      sculptHint: "島の表面を押すかドラッグして、選んだ道具を使います。",
      tools: { roam: "散歩", raise: "盛る", lower: "下げる", tree: "木", flowers: "花", bench: "ベンチ", erase: "片付け" },
      descriptions: {
        roam: "低い三人称視点で子うさぎと島を散歩します。",
        raise: "丸く柔らかなブラシで地面を持ち上げます。",
        lower: "地面をやさしく下げて小道や広場を作ります。",
        tree: "潮風に揺れるパステルの木を植えます。",
        flowers: "色とりどりの小さな野花を植えます。",
        bench: "動物の隣人が休めるベンチを置きます。",
        erase: "ポインターに一番近い飾りを丁寧に片付けます。",
      },
      notices: { shaped: "島が少しふんわりしました", placed: "心地よさがひとつ増えました", erased: "きれいに片付きました", crowded: "もう少し広い草地を選んでください", shoreline: "波のために水辺はそのままにします", full: "島がいっぱいです" },
    },
  },
  zh: {
    eyebrow: "SOFT ISLAND LIFE / ORIGINAL 3D BROWSER GAME",
    title: "Mallow Isle",
    subtitle: "塑造柔软小丘，摆放鲜花、树木与长椅，把迷你岛屿布置成自己的安心角落。化身小兔，与动物邻居一起漫步在海风里。",
    start: "去岛上散步",
    loading: "正在唤来云朵与草甸微风…",
    unavailable: "此浏览器无法使用 WebGL，不能启动3D岛屿。",
    localOnly: "无需账号 · 岛屿只会自动保存在本浏览器",
    features: [
      { title: "指尖塑造地形", body: "轻轻抬高或压低土地，亲手做出小径、观景台与圆润山丘。" },
      { title: "鲜活的粉彩岛屿", body: "层叠云朵、柔和阴影，以及随风摆动的树木与花朵" },
      { title: "悠闲的动物邻居", body: "迷你狐狸、小熊与小猫，搭配设备内合成的温柔 lo-fi" },
    ],
    scene: {
      islandName: "MALLOW ISLE", cozy: "温馨", day: "DAY", breeze: "微风", saved: "已自动保存", soundOn: "开启音乐", soundOff: "关闭音乐",
      reset: "新岛屿", resetConfirm: "要清除岛屿布置并回到最初的小岛吗？",
      walkHint: "用WASD/方向键行走，拖动环顾四周，滚轮拉近视角。",
      sculptHint: "按住或拖过岛屿表面，使用当前选择的工具。",
      tools: { roam: "散步", raise: "抬高", lower: "压低", tree: "树木", flowers: "鲜花", bench: "长椅", erase: "整理" },
      descriptions: {
        roam: "用低位第三人称视角陪小兔漫步岛屿。",
        raise: "用柔软圆形笔刷抬高地面。",
        lower: "轻轻压低土地，做出小路与空地。",
        tree: "种下会随海风摇摆的粉彩树木。",
        flowers: "在草地里种一小簇缤纷野花。",
        bench: "为动物邻居放置舒适的休息长椅。",
        erase: "小心移除离指针最近的装饰。",
      },
      notices: { shaped: "岛屿又柔软了一点", placed: "又多了一处温馨细节", erased: "这里整理好了", crowded: "请选择更宽敞的草地", shoreline: "让海岸保持柔和，留给浪花", full: "小岛已经放满了" },
    },
  },
  fr: {
    eyebrow: "SOFT ISLAND LIFE / ORIGINAL 3D BROWSER GAME",
    title: "Mallow Isle",
    subtitle: "Modelez des collines moelleuses et placez fleurs, arbres et bancs pour faire de ce petit îlot un doux refuge. Incarnez un lapin et flânez parmi vos voisins animaux au gré de la brise.",
    start: "Partir en balade",
    loading: "Les nuages et la brise arrivent…",
    unavailable: "WebGL n'est pas disponible dans ce navigateur : l'île 3D ne peut pas démarrer.",
    localOnly: "Sans compte · votre île est sauvegardée seulement dans ce navigateur",
    features: [
      { title: "Un terrain sous vos doigts", body: "Montez ou baissez doucement le sol pour créer sentiers, belvédères et collines." },
      { title: "Une île pastel vivante", body: "Nuages en couches, ombres douces, arbres et fleurs animés par le vent" },
      { title: "Des voisins sans hâte", body: "Renard, ours et chat chibi avec une lo-fi chaleureuse synthétisée sur l'appareil" },
    ],
    scene: {
      islandName: "MALLOW ISLE", cozy: "Douceur", day: "JOUR", breeze: "Brise", saved: "Sauvegardé", soundOn: "Activer la musique", soundOff: "Couper la musique",
      reset: "Nouvelle île", resetConfirm: "Effacer vos changements et retrouver le petit îlot d'origine ?",
      walkHint: "Marchez avec ZQSD/flèches, glissez pour regarder et utilisez la molette pour vous rapprocher.",
      sculptHint: "Appuyez ou glissez sur la surface de l'île pour utiliser l'outil sélectionné.",
      tools: { roam: "Flâner", raise: "Monter", lower: "Baisser", tree: "Arbre", flowers: "Fleurs", bench: "Banc", erase: "Ranger" },
      descriptions: {
        roam: "Promenez votre lapin avec une caméra basse à la troisième personne.",
        raise: "Soulevez le terrain avec une brosse ronde et douce.",
        lower: "Abaissez délicatement la terre pour tracer chemins et clairières.",
        tree: "Plantez un arbre pastel qui oscille dans la brise marine.",
        flowers: "Installez une petite touffe de fleurs sauvages colorées.",
        bench: "Créez une halte confortable pour vos voisins animaux.",
        erase: "Retirez avec soin la décoration la plus proche du pointeur.",
      },
      notices: { shaped: "L'île est encore plus moelleuse", placed: "Un détail douillet de plus", erased: "Cet endroit est rangé", crowded: "Choisissez un coin d'herbe plus spacieux", shoreline: "Le rivage reste doux pour les vagues", full: "L'île est pleine" },
    },
  },
  es: {
    eyebrow: "SOFT ISLAND LIFE / ORIGINAL 3D BROWSER GAME",
    title: "Mallow Isle",
    subtitle: "Moldea colinas mullidas y coloca flores, árboles y bancos para convertir una islita en tu rincón favorito. Pasea como un pequeño conejo entre vecinos animales y una brisa siempre viva.",
    start: "Dar un paseo por la isla",
    loading: "Llamando a las nubes y la brisa…",
    unavailable: "WebGL no está disponible en este navegador, así que la isla 3D no puede empezar.",
    localOnly: "Sin cuenta · tu isla se guarda solo en este navegador",
    features: [
      { title: "Terreno al alcance de tus dedos", body: "Sube y baja suavemente la tierra para crear senderos, miradores y colinas." },
      { title: "Una isla pastel viva", body: "Nubes por capas, sombras suaves y árboles y flores movidos por el viento" },
      { title: "Vecinos animales sin prisas", body: "Zorro, oso y gato chibi con lo-fi acogedor sintetizado en tu dispositivo" },
    ],
    scene: {
      islandName: "MALLOW ISLE", cozy: "Calidez", day: "DÍA", breeze: "Brisa", saved: "Guardado automático", soundOn: "Activar música", soundOff: "Desactivar música",
      reset: "Nueva isla", resetConfirm: "¿Borrar tus cambios y volver a la pequeña isla original?",
      walkHint: "Camina con WASD/flechas, arrastra para mirar y usa la rueda para acercarte.",
      sculptHint: "Pulsa o arrastra sobre la superficie de la isla para usar la herramienta elegida.",
      tools: { roam: "Pasear", raise: "Elevar", lower: "Bajar", tree: "Árbol", flowers: "Flores", bench: "Banco", erase: "Ordenar" },
      descriptions: {
        roam: "Recorre la isla con tu conejo desde una cámara baja en tercera persona.",
        raise: "Eleva el terreno con un pincel redondo y suave.",
        lower: "Baja la tierra con cuidado para crear caminos y claros.",
        tree: "Planta un árbol pastel que se mece con la brisa marina.",
        flowers: "Añade un pequeño grupo de flores silvestres de colores.",
        bench: "Coloca un rincón de descanso para tus vecinos animales.",
        erase: "Retira con cuidado la decoración más cercana al puntero.",
      },
      notices: { shaped: "La isla está un poco más mullida", placed: "Un detalle acogedor más", erased: "Este rincón vuelve a estar ordenado", crowded: "Elige una zona de hierba más amplia", shoreline: "La costa se queda suave para las olas", full: "La isla está llena" },
    },
  },
};

export default function MallowIsle({ locale }: { locale: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const [started, setStarted] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const begin = useCallback(() => {
    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }
    setStarted(true);
  }, []);

  if (started) {
    return (
      <section className="overflow-hidden border border-[#d8dfcf] bg-[#eef3e7] shadow-[0_24px_70px_rgba(67,93,79,.14)]">
        <div className="h-[78vh] min-h-[680px] max-h-[920px]">
          <Suspense
            fallback={(
              <div className="grid h-full place-items-center bg-[#b8dfd8] px-6 text-center text-[#48675a]">
                <div>
                  <Sparkles className="mx-auto size-8 animate-pulse" aria-hidden="true" />
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.16em]">{copy.loading}</p>
                </div>
              </div>
            )}
          >
            <Scene
              copy={copy.scene}
              audioEnabled={audioEnabled}
              onToggleAudio={() => setAudioEnabled((value) => !value)}
            />
          </Suspense>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden border border-[#d8dfcf] bg-[#f7f3e9] shadow-[0_24px_70px_rgba(67,93,79,.12)]">
      <div className="grid lg:grid-cols-[1.02fr_.98fr]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#779078]">{copy.eyebrow}</p>
          <h2 className="mt-4 max-w-xl font-serif text-5xl font-semibold tracking-[-0.045em] text-[#405b50] sm:text-6xl">
            {copy.title}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#66776e] sm:text-lg">{copy.subtitle}</p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={begin}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#4f715e] px-6 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(79,113,94,.22)] transition hover:-translate-y-0.5 hover:bg-[#405f4e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4f715e]"
            >
              <PawPrint className="size-4" aria-hidden="true" />
              {copy.start}
            </button>
            <p className="text-xs font-semibold text-[#829087]">{copy.localOnly}</p>
          </div>
          {unsupported && (
            <p role="alert" className="mt-4 border-l-4 border-[#d98c8c] bg-[#f8e8e4] px-4 py-3 text-sm font-bold text-[#805755]">
              {copy.unavailable}
            </p>
          )}
        </div>

        <div className="relative min-h-[360px] overflow-hidden bg-[#b8dfd8] lg:min-h-[560px]">
          <img
            src="/games/mallow-isle-social.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            width="1200"
            height="630"
            loading="eager"
          />
          <div className="absolute bottom-5 left-5 flex items-center gap-2 border border-white/65 bg-[#fff9ef]/88 px-3 py-2 text-xs font-black text-[#4d675a] shadow-[0_10px_28px_rgba(64,93,78,.14)] backdrop-blur-md">
            <CloudSun className="size-4 text-[#d79978]" aria-hidden="true" />
            <span>soft-painted · procedural · local-first</span>
          </div>
        </div>
      </div>

      <div className="grid border-t border-[#d8dfcf] sm:grid-cols-3">
        {copy.features.map((feature, index) => {
          const Icon = [Flower2, TreePine, Music2][index] ?? Flower2;
          return (
            <article
              key={feature.title}
              className={`p-6 sm:p-7 ${index > 0 ? "border-t border-[#d8dfcf] sm:border-l sm:border-t-0" : ""}`}
            >
              <Icon className="size-5 text-[#6d9074]" strokeWidth={2} aria-hidden="true" />
              <h3 className="mt-4 text-sm font-black text-[#405b50]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#718077]">{feature.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
