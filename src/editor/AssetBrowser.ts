/**
 * AssetBrowser — Texture thumbnail browser for the Doomlike map editor.
 *
 * Shows placeholder coloured squares as texture previews, organised by
 * category (floors, walls, skies). Clicking a tile assigns it to the
 * currently selected sector or wall (if applicable).
 *
 * Lifecycle:
 *   const browser = createAssetBrowser();
 *   browser.setCategory('walls');  // switch tab
 *   browser.onAssetSelected = (path, category) => { ... };
 *   browser.dispose();
 */
// ── Built-in placeholder textures ───────────────────────────────────────────

interface AssetDef {
  name: string;
  path: string;
  color: string;
}

const FLOOR_ASSETS: AssetDef[] = [
  { name: 'Default', path: 'floors/default', color: '#555555' },
  { name: 'Stone',   path: 'floors/stone',   color: '#666655' },
  { name: 'Wood',    path: 'floors/wood',    color: '#664422' },
  { name: 'Metal',   path: 'floors/metal',   color: '#667788' },
  { name: 'Grass',   path: 'floors/grass',   color: '#445533' },
  { name: 'Water',   path: 'floors/water',   color: '#224466' },
  { name: 'Lava',    path: 'floors/lava',    color: '#884422' },
  { name: 'Marble',  path: 'floors/marble',  color: '#998888' },
  { name: 'Sand',    path: 'floors/sand',    color: '#887755' },
  { name: 'Carpet',  path: 'floors/carpet',  color: '#663366' },
];

const WALL_ASSETS: AssetDef[] = [
  { name: 'Default', path: 'walls/default',  color: '#666666' },
  { name: 'Brick',   path: 'walls/brick',    color: '#884444' },
  { name: 'Stone',   path: 'walls/stone',    color: '#777788' },
  { name: 'Wood',    path: 'walls/wood',     color: '#775533' },
  { name: 'Metal',   path: 'walls/metal',    color: '#556677' },
  { name: 'Concrete',path: 'walls/concrete', color: '#666655' },
  { name: 'Marble',  path: 'walls/marble',   color: '#aa9999' },
  { name: 'Brick2',  path: 'walls/brick2',   color: '#663333' },
  { name: 'Panel',   path: 'walls/panel',    color: '#445566' },
  { name: 'Tech',    path: 'walls/tech',     color: '#334455' },
  { name: 'Wood2',   path: 'walls/wood2',    color: '#554433' },
  { name: 'Grate',   path: 'walls/grate',    color: '#888888' },
];

const SKY_ASSETS: AssetDef[] = [
  { name: 'Default', path: 'skies/default',  color: '#334466' },
  { name: 'Night',   path: 'skies/night',    color: '#111133' },
  { name: 'Sunset',  path: 'skies/sunset',   color: '#663355' },
  { name: 'Hell',    path: 'skies/hell',     color: '#442222' },
];

interface CategoryMap {
  [category: string]: AssetDef[];
}

const ASSETS_BY_CATEGORY: CategoryMap = {
  floors: FLOOR_ASSETS,
  walls: WALL_ASSETS,
  skies: SKY_ASSETS,
};


// ── AssetBrowser factory ─────────────────────────────────────────────────────

export interface AssetBrowser {
  /** Switch to a different category tab. */
  setCategory(category: string): void;
  /** Get current category. */
  getCategory(): string;
  /** Callback fired when user clicks an asset tile. */
  onAssetSelected: ((path: string, category: string) => void) | null;
  /** Remove event listeners. */
  dispose(): void;
}

export function createAssetBrowser(): AssetBrowser {
  let currentCategory = 'walls';
  let onAssetSelected: ((path: string, category: string) => void) | null = null;

  const tabButtons = document.querySelectorAll('#asset-browser .tabs button');
  const assetGrid = document.getElementById('asset-grid')!;

  // ── Tab switching ─────────────────────────────────
  function switchCategory(category: string) {
    currentCategory = category;

    // Update tab active state
    tabButtons.forEach((btn) => {
      const el = btn as HTMLElement;
      if (el.dataset.category === category) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Rebuild asset grid
    renderAssets(category);
  }

  function renderAssets(category: string) {
    const assets = ASSETS_BY_CATEGORY[category] || [];
    assetGrid.innerHTML = '';

    for (const asset of assets) {
      const tile = document.createElement('div');
      tile.className = 'asset-tile';
      tile.style.background = asset.color;
      tile.dataset.path = asset.path;
      tile.dataset.category = category;

      const nameLabel = document.createElement('span');
      nameLabel.className = 'name';
      nameLabel.textContent = asset.name;
      tile.appendChild(nameLabel);

      tile.addEventListener('click', () => {
        // Remove previous selection highlight
        assetGrid.querySelectorAll('.asset-tile').forEach((t) => t.classList.remove('selected'));
        tile.classList.add('selected');

        onAssetSelected?.(asset.path, category);
      });

      assetGrid.appendChild(tile);
    }
  }

  // ── Tab click handlers ────────────────────────────
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = (btn as HTMLElement).dataset.category;
      if (category) switchCategory(category);
    });
  });

  // ── Initial render ────────────────────────────────
  switchCategory('walls');

  // ── Public API ─────────────────────────────────────
  return {
    setCategory: switchCategory,
    getCategory() { return currentCategory; },
    onAssetSelected: null,
    dispose() {
      tabButtons.forEach((btn) => {
        btn.removeEventListener('click', () => {});
      });
    },
  };
}
