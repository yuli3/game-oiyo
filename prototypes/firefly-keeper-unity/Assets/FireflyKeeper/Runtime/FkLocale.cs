using System.Collections.Generic;

namespace FireflyKeeper
{
    /// <summary>Order: ko, en, ja, zh (Simplified), fr, es.</summary>
    public static class FkLocale
    {
        public const int Langs = 6;
        public static readonly string[] Codes = { "ko", "en", "ja", "zh", "fr", "es" };
        public static readonly string[] LangNames = { "한국어", "English", "日本語", "简体中文", "Français", "Español" };

        static readonly Dictionary<string, string[]> T = new Dictionary<string, string[]>
        {
            { "title", new[] { "반딧불 등지기", "Firefly Keeper", "ほたるの灯守り", "萤火守灯人", "Gardien des lucioles", "Guardián de luciérnagas" } },
            { "subtitle", new[] { "그믐밤 숲, 열두 밤의 등불 이야기", "Twelve nights of lanterns in a moonless wood", "新月の森、十二夜の灯りの物語", "无月之林，十二夜的灯火故事", "Douze nuits de lanternes dans un bois sans lune", "Doce noches de faroles en un bosque sin luna" } },
            { "play", new[] { "시작하기", "Play", "はじめる", "开始", "Jouer", "Jugar" } },
            { "continue", new[] { "이어하기", "Continue", "つづきから", "继续", "Continuer", "Continuar" } },
            { "stages", new[] { "밤 고르기", "Choose a night", "夜をえらぶ", "选择夜晚", "Choisir une nuit", "Elegir noche" } },
            { "night", new[] { "{0}번째 밤", "Night {0}", "第{0}夜", "第{0}夜", "Nuit {0}", "Noche {0}" } },
            { "back", new[] { "뒤로", "Back", "もどる", "返回", "Retour", "Volver" } },
            { "sound_on", new[] { "소리 켬", "Sound on", "音あり", "声音开", "Son activé", "Sonido sí" } },
            { "sound_off", new[] { "소리 끔", "Sound off", "音なし", "声音关", "Son coupé", "Sonido no" } },
            { "resume", new[] { "계속하기", "Resume", "つづける", "继续", "Reprendre", "Seguir" } },
            { "retry", new[] { "다시 하기", "Retry", "もう一度", "再试一次", "Rejouer", "Reintentar" } },
            { "next", new[] { "다음 밤", "Next night", "次の夜", "下一夜", "Nuit suivante", "Siguiente noche" } },
            { "menu", new[] { "처음으로", "Title", "タイトルへ", "回到标题", "Accueil", "Inicio" } },
            { "paused", new[] { "잠시 멈춤", "Paused", "一時停止", "暂停", "Pause", "Pausa" } },
            { "clear", new[] { "등불이 환해졌어요!", "The lantern glows!", "灯りがともった!", "灯亮起来了!", "La lanterne brille !", "¡El farol brilla!" } },
            { "fail_heart", new[] { "그림자에 등불을 빼앗겼어요", "The shadows took your light", "影に灯りをうばわれた", "灯火被影子夺走了", "Les ombres ont pris ta lumière", "Las sombras se llevaron tu luz" } },
            { "fail_oil", new[] { "등잔 기름이 다 떨어졌어요", "Your lamp ran out of oil", "油が切れてしまった", "灯油烧完了", "Ta lampe n'a plus d'huile", "Tu lámpara se quedó sin aceite" } },
            { "star_clear", new[] { "등불 밝히기", "Light the lantern", "灯りをともす", "点亮灯笼", "Allumer la lanterne", "Encender el farol" } },
            { "star_nohit", new[] { "그림자에 안 닿기", "Never touched", "影にふれない", "未被影子碰到", "Jamais touché", "Sin tocar sombras" } },
            { "star_par", new[] { "{0}초 안에", "Within {0}s", "{0}秒以内", "{0}秒内", "En {0} s", "En {0} s" } },
            { "time", new[] { "시간 {0}초", "Time {0}s", "タイム {0}秒", "用时 {0}秒", "Temps {0} s", "Tiempo {0} s" } },
            { "best", new[] { "최고 {0}초", "Best {0}s", "ベスト {0}秒", "最佳 {0}秒", "Record {0} s", "Récord {0} s" } },
            { "locked", new[] { "앞의 밤을 밝혀야 열려요", "Light the night before first", "前の夜をクリアすると開く", "先点亮上一夜", "Termine la nuit précédente", "Completa la noche anterior" } },
            { "total_stars", new[] { "모은 별 {0}/{1}", "Stars {0}/{1}", "星 {0}/{1}", "星星 {0}/{1}", "Étoiles {0}/{1}", "Estrellas {0}/{1}" } },
            { "lantern", new[] { "등불", "Lantern", "灯", "灯笼", "Lanterne", "Farol" } },
            { "oil", new[] { "기름", "Oil", "油", "灯油", "Huile", "Aceite" } },
            { "boss", new[] { "그믐 그림자", "Newmoon Shade", "新月の影", "朔月之影", "Ombre de nouvelle lune", "Sombra de luna nueva" } },
            { "gate_open", new[] { "부적 문이 열렸어요", "A charm gate opened", "お札の門がひらいた", "符咒之门打开了", "Une porte-talisman s'ouvre", "Se abrió una puerta de talismán" } },
            { "beam", new[] { "빛살이 그림자를 꿰뚫었어요!", "A beam pierces the shade!", "光が影をつらぬいた!", "光束刺穿了影子!", "Un rayon transperce l'ombre !", "¡Un rayo atraviesa la sombra!" } },
            { "controls", new[] { "누르고 끌거나 방향키로 움직여요", "Hold and drag, or use arrow keys", "長押しで引くか矢印キーで移動", "按住拖动或用方向键移动", "Maintiens et glisse, ou flèches", "Mantén y arrastra, o usa flechas" } },
            { "ending_title", new[] { "열두 밤이 모두 밝았어요", "All twelve nights are bright", "十二夜すべてに灯りがともった", "十二夜全部点亮了", "Les douze nuits sont lumineuses", "Las doce noches brillan" } },
            { "ending_body", new[] { "숲의 반딧불이 다시 노래해요.\n별을 더 모아 보세요.", "The fireflies sing again.\nTry to collect every star.", "森のほたるがまた歌いだした。\n星をもっと集めよう。", "森林里的萤火虫又唱起歌来。\n再去收集更多星星吧。", "Les lucioles chantent à nouveau.\nRécolte toutes les étoiles.", "Las luciérnagas vuelven a cantar.\nReúne todas las estrellas." } },
            { "hint_drop", new[] { "등불 곁으로 가면 반딧불이 들어가요", "Bring them to the lantern to drop them off", "灯のそばへ行くとほたるが入る", "靠近灯笼，萤火虫就会飞进去", "Approche la lanterne pour les déposer", "Acércate al farol para dejarlas" } },
        };

        static readonly string[][] StageNames =
        {
            new[] { "첫 불빛", "First Glow", "はじめの灯", "第一缕光", "Première lueur", "Primer brillo" },
            new[] { "연못가", "Pond Edge", "池のほとり", "池塘边", "Au bord de l'étang", "Junto al estanque" },
            new[] { "그림자 첫 만남", "Meeting the Shadows", "影との出会い", "初遇影子", "Rencontre des ombres", "Encuentro con sombras" },
            new[] { "부적 문", "Charm Gate", "お札の門", "符咒之门", "Porte-talisman", "Puerta de talismán" },
            new[] { "바람 골짜기", "Windy Hollow", "風の谷", "风之谷", "Vallon venteux", "Hondonada del viento" },
            new[] { "겁 많은 반딧불", "Shy Fireflies", "こわがりなほたる", "胆小的萤火虫", "Lucioles timides", "Luciérnagas tímidas" },
            new[] { "이슬 길", "Dew Path", "露の道", "露水小径", "Sentier de rosée", "Sendero de rocío" },
            new[] { "두 개의 부적", "Twin Charms", "ふたつのお札", "两道符咒", "Deux talismans", "Dos talismanes" },
            new[] { "큰 불빛만이", "Only a Great Light", "大きな灯りだけが", "唯有大光", "Seule une grande lumière", "Solo una gran luz" },
            new[] { "미로 숲", "Maze Wood", "迷いの森", "迷宫森林", "Bois labyrinthe", "Bosque laberinto" },
            new[] { "그믐 직전", "Before the Dark Moon", "新月の前夜", "朔月前夜", "Avant la nuit noire", "Antes de la luna negra" },
            new[] { "그믐 그림자", "The Newmoon Shade", "新月の影", "朔月之影", "L'ombre de nouvelle lune", "La sombra de luna nueva" },
        };

        static readonly string[][] StageHints =
        {
            new[] { "반딧불 곁을 지나면 뒤를 따라와요. 등불까지 데려가세요.", "Pass near a firefly and it follows. Lead them to the lantern.", "ほたるのそばを通るとついてくる。灯まで連れていこう。", "经过萤火虫身边，它就会跟着你。带它们去灯笼。", "Passe près d'une luciole et elle te suit. Mène-les à la lanterne.", "Pasa cerca de una luciérnaga y te seguirá. Llévalas al farol." },
            new[] { "연못은 건널 수 없어요. 빙 돌아서 모아요.", "You cannot cross the pond. Go around it.", "池はわたれない。ぐるっと回って集めよう。", "池塘过不去，绕着走吧。", "On ne traverse pas l'étang. Fais le tour.", "No puedes cruzar el estanque. Rodéalo." },
            new[] { "그림자가 줄에 닿으면 반딧불이 흩어져요. 빛 가까이에서만 보여요.", "Shadows scatter your trail. They show only near light.", "影が列にふれるとほたるが散る。灯の近くでしか見えない。", "影子碰到队伍，萤火虫就会散开。只有靠近光才看得见。", "Les ombres dispersent ta file. On ne les voit qu'à la lumière.", "Las sombras dispersan tu fila. Solo se ven cerca de la luz." },
            new[] { "부적에 반딧불 3마리를 바치면 문이 열려요.", "Give the charm 3 fireflies to open the gate.", "お札にほたるを3匹ささげると門がひらく。", "向符咒献上3只萤火虫，门就会打开。", "Offre 3 lucioles au talisman pour ouvrir la porte.", "Da 3 luciérnagas al talismán para abrir la puerta." },
            new[] { "바람이 몸과 반딧불을 밀어요. 바람을 거슬러 가세요.", "Wind pushes you around. Push against it.", "風が体を押し流す。風に逆らって進もう。", "风会推着你走。逆风前进吧。", "Le vent te pousse. Avance contre lui.", "El viento te empuja. Avanza contra él." },
            new[] { "빨리 다가가면 달아나요. 살금살금 다가가세요.", "Rush in and they flee. Approach slowly.", "急いで近づくと逃げる。そっと近づこう。", "冲过去它们会逃跑。慢慢靠近。", "Fonce et elles fuient. Approche doucement.", "Si corres, huyen. Acércate despacio." },
            new[] { "기름이 빨리 닳아요. 파란 이슬로 채우세요.", "Oil burns fast. Refill with blue dew.", "油が早く減る。青い露で補おう。", "灯油消耗很快。用蓝色露珠补充。", "L'huile brûle vite. Recharge avec la rosée bleue.", "El aceite se gasta rápido. Rellena con rocío azul." },
            new[] { "왼쪽 부적은 가운데 문, 오른쪽 부적은 위쪽 문을 열어요.", "Left charm opens the middle gate, right charm the top gate.", "左のお札は中央の門、右のお札は上の門をひらく。", "左边符咒开中间的门，右边符咒开上面的门。", "Le talisman gauche ouvre la porte du milieu, le droit celle du haut.", "El talismán izquierdo abre la puerta central; el derecho, la de arriba." },
            new[] { "반딧불 6마리 이상이면 빛이 커져 그림자가 물러나요.", "With 6+ fireflies your light grows and shadows retreat.", "ほたるが6匹以上だと灯が大きくなり影が退く。", "带着6只以上萤火虫，光变大，影子就会退开。", "Avec 6 lucioles ou plus, ta lumière fait reculer les ombres.", "Con 6 o más luciérnagas tu luz crece y las sombras retroceden." },
            new[] { "갈림길마다 열린 쪽을 찾아요. 바람 길은 조심!", "Find the open side of each hedge. Mind the wind.", "生け垣ごとに開いた側を探そう。風に注意!", "每道树篱找到开口。小心风道!", "Trouve l'ouverture de chaque haie. Attention au vent !", "Busca el paso en cada seto. ¡Cuidado con el viento!" },
            new[] { "어둠이 짙어요. 반딧불 빛으로 길을 밝혀요.", "The dark is thick. Let fireflies light the way.", "闇が深い。ほたるの灯で道を照らそう。", "黑暗很浓。用萤火虫的光照亮道路。", "L'obscurité est dense. Les lucioles éclairent le chemin.", "La oscuridad es densa. Deja que las luciérnagas iluminen." },
            new[] { "부적 셋을 채우면 빛살이 그림자를 꿰뚫어요. 세 번!", "Fill a charm to fire a beam at the shade. Three hits!", "お札をみたすと光が影をつらぬく。3回当てよう!", "填满符咒，光束就会射向影子。命中三次!", "Remplis un talisman pour tirer un rayon. Trois fois !", "Llena un talismán para lanzar un rayo. ¡Tres veces!" },
        };

        public static string Get(string key, int lang)
        {
            if (T.TryGetValue(key, out var arr)) return arr[Clamp(lang)];
            return key;
        }

        public static string Format(string key, int lang, params object[] args) => string.Format(Get(key, lang), args);
        public static string StageName(int stage, int lang) => StageNames[stage][Clamp(lang)];
        public static string StageHint(int stage, int lang) => StageHints[stage][Clamp(lang)];

        public static int FromCode(string code)
        {
            if (string.IsNullOrEmpty(code)) return -1;
            code = code.ToLowerInvariant();
            if (code == "cn" || code.StartsWith("zh")) return 3;
            for (int i = 0; i < Codes.Length; i++) if (code.StartsWith(Codes[i])) return i;
            return -1;
        }

        static int Clamp(int lang) => lang < 0 || lang >= Langs ? 0 : lang;

        /// <summary>Every visible string, used by the font subset script.</summary>
        public static IEnumerable<string> AllStrings()
        {
            foreach (var n in LangNames) yield return n;
            foreach (var kv in T) foreach (var s in kv.Value) yield return s;
            foreach (var a in StageNames) foreach (var s in a) yield return s;
            foreach (var a in StageHints) foreach (var s in a) yield return s;
        }
    }
}
