import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Shuffle from 'lucide-react/dist/esm/icons/shuffle'
import Heart from 'lucide-react/dist/esm/icons/heart'
import Share2 from 'lucide-react/dist/esm/icons/share-2'
import History from 'lucide-react/dist/esm/icons/history'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Search from 'lucide-react/dist/esm/icons/search'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Swords from 'lucide-react/dist/esm/icons/swords';
import menuData, { countryLabels, type CountryType, type MenuItem } from '@/lib/menu-data';

const MAX_HISTORY = 10;
const STORAGE_KEY_HISTORY = 'menu-history';
const STORAGE_KEY_FAVORITES = 'menu-favorites';

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) ?? '[]');
  } catch {
    return [];
  }
}

function addToHistory(item: string): string[] {
  const h = getHistory();
  if (h[0] === item) return h;
  const updated = [item, ...h].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  return updated;
}

function clearHistory(): void {
  localStorage.setItem(STORAGE_KEY_HISTORY, '[]');
}

function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_FAVORITES) ?? '[]');
  } catch {
    return [];
  }
}

function addFavorite(item: string): string[] {
  const favs = getFavorites();
  if (!favs.includes(item)) {
    const updated = [item, ...favs];
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
    return updated;
  }
  return favs;
}

function removeFavorite(item: string): string[] {
  const updated = getFavorites().filter((f) => f !== item);
  localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
  return updated;
}

function useThrottle<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  const lastRun = useRef(0);
  return useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastRun.current >= ms) {
        lastRun.current = now;
        fn(...args);
      }
    }) as T,
    [fn, ms]
  );
}

export default function MenuGenerator() {
  const [selectedCountry, setSelectedCountry] = useState<CountryType>('all');
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [spinText, setSpinText] = useState('');
  const [battleMode, setBattleMode] = useState(false);
  const [battleOptions, setBattleOptions] = useState<[string, string] | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
    setFavorites(getFavorites());
  }, []);

  const spin = useCallback((pool: MenuItem[]) => {
    if (pool.length === 0) return;
    setIsGenerating(true);
    setSelectedMenu(null);
    setSelectedImage(null);
    setImgError(false);
    setSpinText('');

    const duration = 2000;
    const interval = 100;
    const count = duration / interval;
    let i = 0;

    const timer = setInterval(() => {
      const r = pool[Math.floor(Math.random() * pool.length)];
      setSpinText(r.menu.split(' ')[0]);
      i++;
      if (i >= count) {
        clearInterval(timer);
        const final = pool[Math.floor(Math.random() * pool.length)];
        setSelectedMenu(final.menu);
        setSelectedImage(final.image);
        setSearchQuery(final.menu.split(' ')[0]);
        setSpinText('');
        setIsGenerating(false);
        const h = addToHistory(final.menu);
        setHistory(h);
      }
    }, interval);
  }, []);

  const generate = useThrottle(
    useCallback(() => {
      const pool = menuData[selectedCountry];
      spin(pool.length > 0 ? pool : menuData.all);
    }, [selectedCountry, spin]),
    1000
  );

  const generateSurprise = useThrottle(
    useCallback(() => {
      spin(menuData.all);
    }, [spin]),
    1000
  );

  const startBattle = useCallback(() => {
    const pool = menuData.all;
    if (pool.length < 2) return;
    let i1 = Math.floor(Math.random() * pool.length);
    let i2 = Math.floor(Math.random() * pool.length);
    while (i2 === i1) i2 = Math.floor(Math.random() * pool.length);
    setBattleOptions([pool[i1].menu, pool[i2].menu]);
    setBattleMode(true);
  }, []);

  const chooseBattle = useCallback((winner: string) => {
    setSelectedMenu(winner);
    const item = menuData.all.find((m) => m.menu === winner);
    if (item) {
      setSelectedImage(item.image);
      setSearchQuery(winner.split(' ')[0]);
      setImgError(false);
    }
    const h = addToHistory(winner);
    setHistory(h);
    setBattleMode(false);
    setBattleOptions(null);
  }, []);

  const toggleFavorite = useCallback(() => {
    if (!selectedMenu) return;
    const isFav = favorites.includes(selectedMenu);
    const updated = isFav ? removeFavorite(selectedMenu) : addFavorite(selectedMenu);
    setFavorites(updated);
  }, [selectedMenu, favorites]);

  const handleShare = useCallback(async () => {
    if (!selectedMenu) return;
    const name = selectedMenu.split(' ')[0];
    const data = { title: '오늘 뭐 먹지?', text: `오늘 메뉴는 "${name}"으로 결정!`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); alert('클립보드에 복사되었습니다!'); }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error(e);
    }
  }, [selectedMenu]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' 맛집')}`, '_blank');
  }, [searchQuery]);

  const isFav = selectedMenu ? favorites.includes(selectedMenu) : false;

  return (
    <div className="space-y-8">
      {/* Cuisine selector */}
      <div>
        <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">음식 종류</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(countryLabels) as CountryType[]).map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedCountry === c
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-card hover:bg-muted'
              }`}
            >
              {countryLabels[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={generate}
          disabled={isGenerating}
          size="lg"
          className="flex-1 text-base py-6"
        >
          <Shuffle className="mr-2 size-5" />
          {isGenerating ? '선택 중...' : '랜덤 메뉴 고르기'}
        </Button>
        <Button
          onClick={generateSurprise}
          disabled={isGenerating}
          size="lg"
          variant="outline"
          className="flex-1 text-base py-6"
        >
          <Shuffle className="mr-2 size-5" />
          깜짝 메뉴 (전체)
        </Button>
        <Button
          onClick={startBattle}
          disabled={isGenerating}
          size="lg"
          variant="secondary"
          className="flex-1 text-base py-6"
        >
          <Swords className="mr-2 size-5" />
          메뉴 배틀 ⚔️
        </Button>
      </div>

      {/* Spin animation */}
      {isGenerating && spinText && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-4xl font-bold animate-pulse">{spinText}</p>
            <p className="text-sm text-muted-foreground mt-2">메뉴를 고르는 중...</p>
          </CardContent>
        </Card>
      )}

      {/* Battle mode */}
      {battleMode && battleOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">⚔️ 메뉴 배틀</CardTitle>
            <CardDescription className="text-center">먹고 싶은 메뉴를 선택하세요!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {battleOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => chooseBattle(opt)}
                  className="group min-h-[160px] rounded-xl border-2 border-border p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="text-4xl mb-3">{idx === 0 ? '👈' : '👉'}</div>
                  <div className="text-xl font-bold">{opt.split(' ')[0]}</div>
                  {opt.includes(' ') && (
                    <div className="text-xs text-muted-foreground mt-1">{opt.split(' ').slice(1).join(' ')}</div>
                  )}
                </button>
              ))}
            </div>
            <div className="text-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setBattleMode(false); setBattleOptions(null); }}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {selectedMenu && !isGenerating && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="size-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">오늘의 메뉴 결정!</CardTitle>
            <CardDescription>맛있게 드세요 😊</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {selectedImage && !imgError && (
              <div className="aspect-video overflow-hidden bg-muted">
                <img
                  src={selectedImage}
                  alt={selectedMenu.split(' ')[0]}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            )}
            <div className="p-6 text-center space-y-4">
              <p className="text-3xl font-bold">{selectedMenu.split(' ')[0]}</p>
              {selectedMenu.includes(' ') && (
                <p className="text-sm text-muted-foreground">{selectedMenu.split(' ').slice(1).join(' ')}</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={toggleFavorite}
                  variant="outline"
                  size="lg"
                  className={`flex-1 ${isFav ? 'border-destructive bg-destructive/10 text-destructive' : ''}`}
                >
                  <Heart className={`mr-2 size-4 ${isFav ? 'fill-current' : ''}`} />
                  {isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                </Button>
                <Button onClick={handleShare} variant="outline" size="lg" className="flex-1">
                  <Share2 className="mr-2 size-4" />
                  공유
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedMenu && !isGenerating && !battleMode && (
        <div className="my-8 rounded-xl border-2 border-dashed border-border py-16 text-center text-muted-foreground">
          <Shuffle className="mx-auto mb-3 size-8 opacity-40" />
          <p className="font-medium">음식 종류를 선택하고 버튼을 눌러보세요!</p>
          <p className="text-sm mt-1">매일 메뉴 고민, 이제 끝!</p>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-5 text-primary" />
            맛집 검색
          </CardTitle>
          <CardDescription>결정된 메뉴의 맛집을 바로 찾아보세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="메뉴명 입력..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit" size="default">
              <Search className="size-4" />
              <span className="ml-1">구글 검색</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Heart className="size-5 text-destructive" />
            즐겨찾기
          </h3>
          <Card>
            <CardContent className="p-4">
              <ul className="max-h-52 space-y-1 overflow-y-auto">
                {favorites.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                    <span className="text-sm">{item.split(' ')[0]}</span>
                    <button
                      onClick={() => setFavorites(removeFavorite(item))}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label="즐겨찾기 삭제"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <History className="size-5 text-primary" />
            최근 기록
          </h3>
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { clearHistory(); setHistory([]); }}
            >
              <Trash2 className="mr-1 size-3.5" />
              초기화
            </Button>
          )}
        </div>
        {history.length > 0 ? (
          <Card>
            <CardContent className="p-4">
              <ol className="max-h-52 list-decimal list-inside space-y-1 overflow-y-auto text-sm text-muted-foreground">
                {history.map((item, i) => (
                  <li key={i} className="truncate">{item.split(' ')[0]}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">아직 기록이 없어요. 메뉴를 골라보세요!</p>
        )}
      </div>
    </div>
  );
}
