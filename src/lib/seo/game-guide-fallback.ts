import type { GameGuide } from "../../data/game-guides";

/**
 * 2026-11-08: AIEO & SEO 대응을 위한 GameGuide 동적 대체 생성기.
 * game-guides.ts에 수동 등록되지 않은 신작/도구 게임(44개 슬러그, 6개 언어 264개 URL)에도
 * 빈 공백 대신 정량적인 VideoGame / FAQPage JSON-LD 구조화 데이터와
 * Answer-First SSR 본문(게임 방법, 기본 3대 규칙, 유래, 3문 3답 FAQ)을 100% 자동 합성한다.
 */
export function getFallbackGameGuide(slug: string, name: string): GameGuide {
  const cleanName = name && name.trim().length > 0
    ? name.trim()
    : slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return {
    origin: {
      ko: `${cleanName}은(는) OIYO 아케이드의 무설치 웹 브라우저 게임으로, 복잡한 다운로드나 결제 없이 PC와 모바일 어디서나 즉시 실행할 수 있도록 설계된 직관적이고 경쾌한 타이틀입니다.`,
      en: `${cleanName} is an instant-play web browser game from OIYO Arcade, designed for seamless gameplay on desktop and mobile with zero downloads or paywalls.`,
      ja: `${cleanName}は、OIYOアーケードのインストール不要ウェブゲームです。ダウンロードや課金なしで、PC・スマホのどちらでもブラウザから今すぐ快適に楽しめます。`,
      zh: `${cleanName} 是 OIYO 街机推出的一款无需安装的即时网页游戏，支持手机与电脑端流畅运行，免下载即开即玩。`,
      fr: `${cleanName} est un jeu Web instantané d'OIYO Arcade, conçu pour une expérience fluide sur ordinateur et mobile sans téléchargement ni paiement.`,
      es: `${cleanName} es un juego web instantáneo de OIYO Arcade, diseñado para jugar al instante en PC y móviles sin descargas ni barreras de pago.`,
    },
    how: {
      ko: `마우스 클릭이나 모바일 터치 스크린으로 직관적인 조작을 수행합니다. 화면의 시각적 피드백과 퀘스트 가이드에 맞춰 목표 점수를 획득하거나 승리 조건을 달성하세요.`,
      en: `Control the game intuitively via mouse clicks or touchscreen taps. Follow the visual cues and quest guidelines to reach the target score and achieve victory.`,
      ja: `マウスクリックやタッチスクリーンで直感的に操作できます。画面のガイドやフィードバックに沿って目標スコアの獲得や勝利条件の達成を目指してください。`,
      zh: `通过鼠标点击或触屏手势进行直观操作。跟随屏幕上的指引与提示，达成目标分数或通关胜利条件。`,
      fr: `Contrôlez le jeu intuitivement à la souris ou à l'écran tactile. Suivez les repères visuels pour atteindre le score cible et remporter la victoire.`,
      es: `Controla el juego de forma intuitiva con clics de ratón o toques táctiles. Sigue las indicaciones en pantalla para lograr la puntuación objetivo y ganar.`,
    },
    rules: {
      ko: [
        "별도의 앱 설치나 회원가입 없이 브라우저에서 바로 시작됩니다.",
        "화면 인터페이스의 실시간 점수와 콤보 상태를 확인하며 최적의 조작을 이어가세요.",
        "진행 상황과 최고 기록은 브라우저 로컬 저장소에 안전하게 유지됩니다.",
      ],
      en: [
        "Play directly in your browser with no installation or account required.",
        "Monitor your real-time score and combo multiplier to make optimal moves.",
        "Your best score and progress are saved safely in your browser local storage.",
      ],
      ja: [
        "アプリのインストールや会員登録なしで、ブラウザですぐにプレイできます。",
        "リアルタイムのスコアやコンボ状態を確認しながら最適なアクションを狙いましょう。",
        "ハイスコアと進行状況はブラウザのローカルストレージに安全に保存されます。",
      ],
      zh: [
        "无需下载客户端或注册账号，打开浏览器即可即时开启游戏。",
        "实时观察计分板与连击倍率，做出最优操作以冲击高分。",
        "最高得分与游戏进度将自动保存在浏览器的本地存储中。",
      ],
      fr: [
        "Jouez directement dans votre navigateur sans installation ni création de compte.",
        "Surveillez votre score en temps réel et vos combos pour maximiser vos points.",
        "Votre meilleur score et vos progrès sont automatiquement sauvegardés localement.",
      ],
      es: [
        "Juega directamente en tu navegador sin descargas ni necesidad de registrarte.",
        "Observa tu puntuación en tiempo real y tus combos para realizar mejores jugadas.",
        "Tu puntuación máxima y tu progreso se guardan de forma segura en tu navegador.",
      ],
    },
    faqs: [
      {
        q: {
          ko: `${cleanName}은(는) 무료로 플레이할 수 있나요?`,
          en: `Is ${cleanName} free to play?`,
          ja: `${cleanName}は無料でプレイできますか？`,
          zh: `${cleanName} 是完全免费的吗？`,
          fr: `${cleanName} est-il gratuit ?`,
          es: `¿Es gratis jugar a ${cleanName}?`,
        },
        a: {
          ko: `네, 회원가입이나 결제 없이 웹 브라우저에서 100% 무료로 무제한 플레이할 수 있습니다.`,
          en: `Yes, it is 100% free with unlimited play directly in your web browser—no registration or purchase required.`,
          ja: `はい、登録や課金なしでブラウザ上で100%無料で何度でもプレイできます。`,
          zh: `是的，无需注册或付费，在网页浏览器中完全免费且可无限制游玩。`,
          fr: `Oui, il est 100 % gratuit et sans limite directement dans votre navigateur Web, sans inscription ni achat.`,
          es: `Sí, es 100 % gratuito y puedes jugar de forma ilimitada en tu navegador, sin registros ni compras.`,
        },
      },
      {
        q: {
          ko: `${cleanName}을(를) 스마트폰(모바일)에서도 즐길 수 있나요?`,
          en: `Can I play ${cleanName} on mobile phones?`,
          ja: `${cleanName}はスマートフォンでも遊べますか？`,
          zh: `${cleanName} 可以在手机上玩吗？`,
          fr: `Puis-je jouer à ${cleanName} sur téléphone portable ?`,
          es: `¿Puedo jugar a ${cleanName} en el móvil?`,
        },
        a: {
          ko: `네, iOS 사파리, 안드로이드 크롬 등 스마트폰과 태블릿 브라우저의 터치스크린 조작에 최적화되어 있습니다.`,
          en: `Yes, it is fully optimized for touch controls on mobile browsers including Safari on iOS and Chrome on Android.`,
          ja: `はい、iOSのSafariやAndroidのChromeなど、スマホやタブレットのタッチ操作に完全対応しています。`,
          zh: `是的，游戏针对智能手机与平板进行了触控优化，支持 iOS Safari 和 Android Chrome 浏览器。`,
          fr: `Oui, il est parfaitement adapté aux commandes tactiles sur mobiles et tablettes (iOS Safari, Android Chrome).`,
          es: `Sí, está totalmente adaptado para controles táctiles en móviles y tabletas (iOS Safari, Android Chrome).`,
        },
      },
      {
        q: {
          ko: `별도의 다운로드나 플러그인 설치가 필요한가요?`,
          en: `Does it require any downloads or plugin installations?`,
          ja: `ダウンロードやプラグインのインストールは必要ですか？`,
          zh: `需要下载任何客户端或插件吗？`,
          fr: `Faut-il télécharger un fichier ou installer un plugin ?`,
          es: `¿Se necesita descargar algo o instalar extensiones?`,
        },
        a: {
          ko: `아닙니다. 최신 웹 표준 기술(HTML5, WebGL, Canvas)로 구동되어 별도의 프로그램이나 플러그인 설치 없이 즉시 실행됩니다.`,
          en: `No. Powered by modern web standards (HTML5, WebGL, Canvas), it runs instantly without any plugins or downloads.`,
          ja: `いいえ。最新のWeb標準技術（HTML5、WebGL、Canvas）で動作するため、追加のプラグインなしですぐに動きます。`,
          zh: `不需要。游戏基于现代网页标准技术（HTML5、WebGL、Canvas）构建，无需安装任何额外插件即可运行。`,
          fr: `Non. Utilisant les technologies Web modernes (HTML5, WebGL, Canvas), il se lance immédiatement sans aucun plugin.`,
          es: `No. Funciona con estándares web modernos (HTML5, WebGL, Canvas) y se ejecuta al instante sin necesidad de plugins.`,
        },
      },
    ],
  };
}
