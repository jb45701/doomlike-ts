interface AD { name: string; path: string; color: string; }
const FA: AD[] = [
  { name: 'Default', path: 'floors/default', color: '#555' }, { name: 'Stone', path: 'floors/stone', color: '#665' },
  { name: 'Wood', path: 'floors/wood', color: '#642' }, { name: 'Metal', path: 'floors/metal', color: '#678' },
  { name: 'Grass', path: 'floors/grass', color: '#453' }, { name: 'Water', path: 'floors/water', color: '#246' },
  { name: 'Lava', path: 'floors/lava', color: '#842' }, { name: 'Marble', path: 'floors/marble', color: '#988' },
  { name: 'Sand', path: 'floors/sand', color: '#875' }, { name: 'Carpet', path: 'floors/carpet', color: '#636' },
];
const WA: AD[] = [
  { name: 'Brick', path: 'walls/brick', color: '#844' }, { name: 'Stone', path: 'walls/stone', color: '#778' },
  { name: 'Wood', path: 'walls/wood', color: '#753' }, { name: 'Metal', path: 'walls/metal', color: '#567' },
  { name: 'Concrete', path: 'walls/concrete', color: '#665' }, { name: 'Marble', path: 'walls/marble', color: '#a99' },
  { name: 'Panel', path: 'walls/panel', color: '#456' }, { name: 'Tech', path: 'walls/tech', color: '#345' },
  { name: 'Brick2', path: 'walls/brick2', color: '#633' }, { name: 'Wood2', path: 'walls/wood2', color: '#543' },
  { name: 'Grate', path: 'walls/grate', color: '#888' },
];
const SA: AD[] = [
  { name: 'Default', path: 'skies/default', color: '#346' }, { name: 'Night', path: 'skies/night', color: '#113' },
  { name: 'Sunset', path: 'skies/sunset', color: '#635' }, { name: 'Hell', path: 'skies/hell', color: '#422' },
];
const ABC: Record<string, AD[]> = { floors: FA, walls: WA, skies: SA };

export interface AssetBrowser {
  setCategory(c: string): void;
  getCategory(): string;
  onAssetSelected: ((p: string, c: string) => void) | null;
  dispose(): void;
}

export function createAssetBrowser(): AssetBrowser {
  let cur = 'walls';
  const btns = document.querySelectorAll('#asset-browser .tabs button');
  const grid = document.getElementById('asset-grid')!;
  const api: AssetBrowser = {
    setCategory(c: string) {
      cur = c;
      btns.forEach((b) => (b as HTMLElement).classList.toggle('active', (b as HTMLElement).dataset.category === c));
      grid.innerHTML = '';
      for (const a of ABC[c] || []) {
        const t = document.createElement('div');
        t.className = 'asset-tile';
        t.style.background = a.color;
        t.dataset.path = a.path;
        t.dataset.category = c;
        const n = document.createElement('span');
        n.className = 'name';
        n.textContent = a.name;
        t.appendChild(n);
        t.addEventListener('click', () => {
          grid.querySelectorAll('.asset-tile').forEach((x) => x.classList.remove('selected'));
          t.classList.add('selected');
          api.onAssetSelected?.(a.path, c);
        });
        grid.appendChild(t);
      }
    },
    getCategory() { return cur; },
    onAssetSelected: null,
    dispose() {
      btns.forEach((b) => b.removeEventListener('click', tabH));
    },
  };

  const tabH = (e: Event) => {
    const c = (e.currentTarget as HTMLElement).dataset.category;
    if (c) api.setCategory(c);
  };
  btns.forEach((b) => b.addEventListener('click', tabH));
  api.setCategory('walls');
  return api;
}
