/**
 * EditorPanel — Properties sidebar for the Doomlike map editor.
 *
 * Listens to selection changes and shows the appropriate form fields
 * for sectors, walls, and things. Mutations are written directly to
 * the LevelData object (caller pushes history snapshots externally).
 *
 * Lifecycle:
 *   const panel = createEditorPanel(handlers);
 *   panel.setLevel(level);
 *   panel.showSelection(selection); // updates form from selection + level
 *   panel.dispose();
 */
import type { LevelData, Sector, Wall } from '../level/LevelTypes';
import type { Selection } from './EditorCanvas';

// ── Callbacks ────────────────────────────────────────────────────────────────

export interface EditorPanelCallbacks {
  /** Fired when any property value changes. */
  onPropertyChanged: () => void;
}

// ── Panel factory ────────────────────────────────────────────────────────────

export interface EditorPanel {
  /** Set the level data reference. */
  setLevel(level: LevelData): void;
  /** Update the UI to reflect the current selection. */
  showSelection(sel: Selection): void;
  /** Remove event listeners. */
  dispose(): void;
}

export function createEditorPanel(callbacks: EditorPanelCallbacks): EditorPanel {
  let level: LevelData | null = null;
  let currentSelection: Selection = null;

  // ── DOM refs ───────────────────────────────────────
  const noSelMsg = document.getElementById('no-sel-msg')!;
  const sectorProps = document.getElementById('sector-props')!;
  const wallProps = document.getElementById('wall-props')!;

  // Sector inputs
  const sFloorH = document.getElementById('sector-floor-height') as HTMLInputElement;
  const sCeilH = document.getElementById('sector-ceil-height') as HTMLInputElement;
  const sFloorTex = document.getElementById('sector-floor-tex') as HTMLInputElement;
  const sCeilTex = document.getElementById('sector-ceil-tex') as HTMLInputElement;
  const sLight = document.getElementById('sector-light') as HTMLInputElement;
  const sSpecial = document.getElementById('sector-special') as HTMLSelectElement;

  // Wall inputs
  const wTex = document.getElementById('wall-texture') as HTMLInputElement;
  const wPortalSector = document.getElementById('wall-portal-sector') as HTMLInputElement;
  const wPortalKind = document.getElementById('wall-portal-kind') as HTMLSelectElement;
  const wUnpegged = document.getElementById('wall-unpegged') as HTMLSelectElement;


  // ── Show no-selection ──────────────────────────────
  function showNone() {
    noSelMsg.style.display = 'block';
    sectorProps.style.display = 'none';
    wallProps.style.display = 'none';
  }

  // ── Show sector properties ─────────────────────────
  function showSector(sector: Sector) {
    noSelMsg.style.display = 'none';
    sectorProps.style.display = 'block';
    wallProps.style.display = 'none';

    sFloorH.value = String(sector.floorHeight);
    sCeilH.value = String(sector.ceilingHeight);
    sFloorTex.value = sector.floorTexture;
    sCeilTex.value = sector.ceilingTexture;
    sLight.value = String(sector.lightLevel);
    sSpecial.value = sector.special ?? '';
  }

  // ── Show wall properties ───────────────────────────
  function showWall(wall: Wall) {
    noSelMsg.style.display = 'none';
    sectorProps.style.display = 'none';
    wallProps.style.display = 'block';

    wTex.value = wall.texture;
    wPortalSector.value = wall.portal ? String(wall.portal.sectorId) : '';
    wPortalKind.value = wall.portal?.kind ?? '';
    wUnpegged.value = wall.unpegged ?? '';
  }

  // ── Selection handler ──────────────────────────────
  function showSelection(sel: Selection) {
    currentSelection = sel;
    if (!sel || !level) {
      showNone();
      return;
    }

    if (sel.kind === 'sector') {
      const sector = level.sectors[sel.sectorIndex];
      if (!sector) { showNone(); return; }
      showSector(sector);
    } else if (sel.kind === 'wall') {
      const sector = level.sectors[sel.sectorIndex];
      if (!sector) { showNone(); return; }
      const wall = sector.walls[sel.wallIndex];
      if (!wall) { showNone(); return; }
      showWall(wall);
    } else if (sel.kind === 'vertex') {
      // Vertex properties just show a brief message
      noSelMsg.textContent = 'Vertex selected — drag to move.';
      noSelMsg.style.display = 'block';
      sectorProps.style.display = 'none';
      wallProps.style.display = 'none';
    } else if (sel.kind === 'thing') {
      noSelMsg.textContent = 'Thing selected — edit properties in code for now.';
      noSelMsg.style.display = 'block';
      sectorProps.style.display = 'none';
      wallProps.style.display = 'none';
    } else {
      showNone();
    }
  }

  // ── Property change handlers ───────────────────────
  function onSectorChange() {
    if (!level || !currentSelection || currentSelection.kind !== 'sector') return;
    const sector = level.sectors[currentSelection.sectorIndex];
    if (!sector) return;

    sector.floorHeight = parseFloat(sFloorH.value) || 0;
    sector.ceilingHeight = parseFloat(sCeilH.value) || 96;
    sector.floorTexture = sFloorTex.value || 'floors/default';
    sector.ceilingTexture = sCeilTex.value || 'ceilings/default';
    sector.lightLevel = parseInt(sLight.value) || 128;
    sector.special = (sSpecial.value || undefined) as any;

    callbacks.onPropertyChanged();
  }

  function onWallChange() {
    if (!level || !currentSelection || currentSelection.kind !== 'wall') return;
    const sector = level.sectors[currentSelection.sectorIndex];
    if (!sector) return;
    const wall = sector.walls[currentSelection.wallIndex];
    if (!wall) return;

    wall.texture = wTex.value || 'walls/default';

    const portalSectorStr = wPortalSector.value.trim();
    const portalKind = wPortalKind.value;
    if (portalSectorStr && portalKind) {
      wall.portal = {
        sectorId: parseInt(portalSectorStr) || 0,
        kind: portalKind as 'window' | 'door' | 'open',
      };
    } else {
      wall.portal = undefined;
    }

    const unpeggedVal = wUnpegged.value;
    wall.unpegged = unpeggedVal as 'upper' | 'lower' | undefined;

    callbacks.onPropertyChanged();
  }

  // ── Attach event listeners ─────────────────────────
  // Sector
  sFloorH.addEventListener('change', onSectorChange);
  sCeilH.addEventListener('change', onSectorChange);
  sFloorTex.addEventListener('change', onSectorChange);
  sCeilTex.addEventListener('change', onSectorChange);
  sLight.addEventListener('input', onSectorChange);
  sSpecial.addEventListener('change', onSectorChange);

  // Wall
  wTex.addEventListener('change', onWallChange);
  wPortalSector.addEventListener('change', onWallChange);
  wPortalKind.addEventListener('change', onWallChange);
  wUnpegged.addEventListener('change', onWallChange);

  // ── Public API ─────────────────────────────────────
  return {
    setLevel(l: LevelData) { level = l; },
    showSelection,
    dispose() {
      sFloorH.removeEventListener('change', onSectorChange);
      sCeilH.removeEventListener('change', onSectorChange);
      sFloorTex.removeEventListener('change', onSectorChange);
      sCeilTex.removeEventListener('change', onSectorChange);
      sLight.removeEventListener('input', onSectorChange);
      sSpecial.removeEventListener('change', onSectorChange);
      wTex.removeEventListener('change', onWallChange);
      wPortalSector.removeEventListener('change', onWallChange);
      wPortalKind.removeEventListener('change', onWallChange);
      wUnpegged.removeEventListener('change', onWallChange);
    },
  };
}
