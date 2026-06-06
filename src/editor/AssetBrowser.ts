/**
 * AssetBrowser — Texture thumbnail browser for the Doomlike map editor.
 */
interface AssetDef { name: string; path: string; color: string; }

const FLOOR_ASSETS: AssetDef[] = [
  { name: 'Stone', path: 'floors/stone', color: '#666655' }, { name: 'Wood', path: 'floors/wood', color: '#664422' },
  { name: 'Metal', path: 'floors/metal', color: '#667788' }, { name: 'Grass', path: 'floors/grass', color: '#445533' },
  { name: 'Water', path: 'floors/water', color: '#224466' }, { name: 'Lava', path: 'floors/lava', color: '#884422' },
  { name: 'Marble', path: 'floors/marble', color: '#998888' }, { name: 'Sand', path: 'floors/sand', color: '#887755' },
  { name: 'Carpet', path: 'floors/carpet', color: '#663366' },
];
const WALL_ASSETS: AssetDef[] = [
  { name: 'Brick', path: 'walls/brick', color: '#884444' }, { name: 'Stone', path: 'walls/stone', color: '#777788' },
  { name: 'Wood', path: 'walls/wood', color: '#775533' }, { name: 'Metal', path: 'walls/metal', color: '#556677' },
  { name: 'Concrete', path: 'walls/concrete', color: '#666655' }, { name: 'Marble', path: 'walls/marble', color: '#aa9999' },
  { name: 'Panel', path: 'walls/panel', color: '#445566' }, { name: 'Tech', path: 'walls/tech', color: '#334455' },
  { name: 'Brick2', path: 'walls/brick2', color: '#663333' }, { name: 'Wood2', path: 'walls/wood2', color: '#554433' },
  { name: 'Grate', path: 'walls/grate', color: '#888888' },
];
const SKY_ASSETS: AssetDef[] = [
  { name: 'Default', path: 'skies/default', color: '#334466' }, { name: 'Night', path: 'skies/night', color: '#111133' },
  { name: 'Sunset', path: 'skies/sunset', color: '#663355' }, { name: 'Hell', path: 'skies/hell', color: '#442222' },
];
const ASSETS: Record<string, AssetDef[]> = { floors: FLOOR_ASSETS, walls: WALL_ASSETS, skies: SKY_ASSETS };

export interface AssetBrowser { setCategory(cat: string): void; getCategory(): string; onAssetSelected: ((path: string, cat: string) => void) | null; dispose(): void; }

export function createAssetBrowser(): AssetBrowser {
  let cat = 'walls';
  let onSel: ((path: string, cat: string) => void) | null = null;
  const tabs = document.querySelectorAll('#asset-browser .tabs button');
  const grid = document.getElementById('asset-grid')!;
  const hdlrs: (() => void)[] = [];

  function switchCat(c: string) {
    cat = c;
    tabs.forEach((b) => { const el = b as HTMLElement; el.classList.toggle('active', el.dataset.category === c); });
    grid.innerHTML = '';
    for (const a of ASSETS[c] || []) {
      const tile = document.createElement('div');
      tile.className = 'asset-tile'; tile.style.background = a.color;
      tile.dataset.path = a.path; tile.dataset.category = c;
      const name = document.createElement('span'); name.className = 'name'; name.textContent = a.name;
      tile.appendChild(name);
      tile.addEventListener('click', () => {
        grid.querySelectorAll('.asset-tile').forEach((t) => t.classList.remove('selected'));
        tile.classList.add('selected');
        onSel?.(a.path, c);
      });
      grid.appendChild(tile);
    }
  }

  tabs.forEach((b) => {
    const handler = () => { const c = (b as HTMLElement).dataset.category; if (c) switchCat(c); };
    b.addEventListener('click', handler);
    hdlrs.push(handler);
  });

  switchCat('walls');

  return {
    setCategory: switchCat,
    getCategory() { return cat; },
    onAssetSelected: null,
    dispose() { tabs.forEach((b, _i) => b.removeEventListener('click', hdlrs[_i])); },
  };
}
