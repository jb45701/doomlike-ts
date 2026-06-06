/**
 * EditorPanel — Properties sidebar for the Doomlike map editor.
 *
 * Listens to selection changes and shows the appropriate form fields
 * for sectors, walls, and things. Mutations are written directly to
 * the LevelData object (caller handles undo history externally).
 */
import type { LevelData, Sector, Wall } from '../level/LevelTypes';
import type { Selection } from './EditorCanvas';

// ── Callbacks ────────────────────────────────────────────────────────────────

export interface EditorPanelCallbacks {
  /** Fired BEFORE a property mutation (caller should push undo snapshot). */
  onBeforePropertyChange: () => void;
  /** Fired AFTER a property mutation has been applied. */
  onPropertyChanged: () => void;
}

// ── Panel factory ────────────────────────────────────────────────────────────

export interface EditorPanel {
  setLevel(level: LevelData): void;
  showSelection(sel: Selection): void;
  dispose(): void;
}

export function createEditorPanel(callbacks: EditorPanelCallbacks): EditorPanel {
  let level: LevelData | null = null;
  let currentSelection: Selection = null;

  // ── DOM refs ───────────────────────────────────────
  const noSelMsg = document.getElementById('no-sel-msg')!;
  const noSelOriginalText = noSelMsg.textContent || 'Select a sector, wall, or thing to edit its properties.';
  const sectorProps = document.getElementById('sector-props')!;
  const wallProps = document.getElementById('wall-props')!;
  const thingProps = document.getElementById('thing-props')!;

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

  // Thing inputs
  const tType = document.getElementById('thing-type') as HTMLSelectElement;
  const tPosX = document.getElementById('thing-pos-x') as HTMLInputElement;
  const tPosY = document.getElementById('thing-pos-y') as HTMLInputElement;
  const tPosZ = document.getElementById('thing-pos-z') as HTMLInputElement;
  const tAngle = document.getElementById('thing-angle') as HTMLInputElement;

  // ── Show no-selection ──────────────────────────────
  function showNone() {
    noSelMsg.textContent = noSelOriginalText;
    noSelMsg.style.display = 'block';
    sectorProps.style.display = 'none';
    wallProps.style.display = 'none';
    thingProps.style.display = 'none';
  }

  // ── Show sector ────────────────────────────────────
  function showSector(sector: Sector) {
    noSelMsg.style.display = 'none';
    sectorProps.style.display = 'block';
    wallProps.style.display = 'none';
    thingProps.style.display = 'none';

    sFloorH.value = String(sector.floorHeight);
    sCeilH.value = String(sector.ceilingHeight);
    sFloorTex.value = sector.floorTexture;
    sCeilTex.value = sector.ceilingTexture;
    sLight.value = String(sector.lightLevel);
    sSpecial.value = sector.special ?? '';
  }

  // ── Show wall ──────────────────────────────────────
  function showWall(wall: Wall) {
    noSelMsg.style.display = 'none';
    sectorProps.style.display = 'none';
    wallProps.style.display = 'block';
    thingProps.style.display = 'none';

    wTex.value = wall.texture;
    wPortalSector.value = wall.portal ? String(wall.portal.sectorId) : '';
    wPortalKind.value = wall.portal?.kind ?? '';
    wUnpegged.value = wall.unpegged ?? '';
  }

  // ── Show thing ─────────────────────────────────────
  function showThing(thing: import('../level/LevelTypes').Thing) {
    noSelMsg.style.display = 'none';
    sectorProps.style.display = 'none';
    wallProps.style.display = 'none';
    thingProps.style.display = 'block';

    tType.value = thing.type;
    tPosX.value = String(thing.position.x);
    tPosY.value = String(thing.position.y);
    tPosZ.value = String(thing.position.z);
    tAngle.value = String(thing.angle);
  }

  // ── Selection handler ──────────────────────────────
  function showSelection(sel: Selection) {
    currentSelection = sel;
    if (!sel || !level) { showNone(); return; }

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
    } else if (sel.kind === 'thing') {
      const thing = level.things[sel.thingIndex];
      if (!thing) { showNone(); return; }
      showThing(thing);
    } else if (sel.kind === 'vertex') {
      noSelMsg.textContent = 'Vertex selected — drag to move.';
      noSelMsg.style.display = 'block';
      sectorProps.style.display = 'none';
      wallProps.style.display = 'none';
      thingProps.style.display = 'none';
    } else {
      showNone();
    }
  }

  // ── Property change handlers ───────────────────────
  function onSectorChange() {
    if (!level || !currentSelection || currentSelection.kind !== 'sector') return;
    const sector = level.sectors[currentSelection.sectorIndex];
    if (!sector) return;
    callbacks.onBeforePropertyChange();
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
    callbacks.onBeforePropertyChange();
    wall.texture = wTex.value || 'walls/default';
    const portalSectorStr = wPortalSector.value.trim();
    const portalKind = wPortalKind.value;
    if (portalSectorStr && portalKind) {
      wall.portal = { sectorId: parseInt(portalSectorStr) || 0, kind: portalKind as 'window' | 'door' | 'open' };
    } else {
      wall.portal = undefined;
    }
    wall.unpegged = wUnpegged.value as 'upper' | 'lower' | undefined;
    callbacks.onPropertyChanged();
  }

  function onThingChange() {
    if (!level || !currentSelection || currentSelection.kind !== 'thing') return;
    const thing = level.things[currentSelection.thingIndex];
    if (!thing) return;
    callbacks.onBeforePropertyChange();
    thing.type = tType.value || 'enemy_soldier';
    thing.position.x = parseFloat(tPosX.value) || 0;
    thing.position.y = parseFloat(tPosY.value) || 0;
    thing.position.z = parseFloat(tPosZ.value) || 0;
    thing.angle = parseFloat(tAngle.value) || 0;
    callbacks.onPropertyChanged();
  }

  // ── Attach event listeners ─────────────────────────
  sFloorH.addEventListener('change', onSectorChange);
  sCeilH.addEventListener('change', onSectorChange);
  sFloorTex.addEventListener('change', onSectorChange);
  sCeilTex.addEventListener('change', onSectorChange);
  sLight.addEventListener('change', onSectorChange);
  sSpecial.addEventListener('change', onSectorChange);

  wTex.addEventListener('change', onWallChange);
  wPortalSector.addEventListener('change', onWallChange);
  wPortalKind.addEventListener('change', onWallChange);
  wUnpegged.addEventListener('change', onWallChange);

  tType.addEventListener('change', onThingChange);
  tPosX.addEventListener('change', onThingChange);
  tPosY.addEventListener('change', onThingChange);
  tPosZ.addEventListener('change', onThingChange);
  tAngle.addEventListener('change', onThingChange);

  // ── Public API ─────────────────────────────────────
  return {
    setLevel(l: LevelData) { level = l; showSelection(null); },
    showSelection,
    dispose() {
      sFloorH.removeEventListener('change', onSectorChange);
      sCeilH.removeEventListener('change', onSectorChange);
      sFloorTex.removeEventListener('change', onSectorChange);
      sCeilTex.removeEventListener('change', onSectorChange);
      sLight.removeEventListener('change', onSectorChange);
      sSpecial.removeEventListener('change', onSectorChange);
      wTex.removeEventListener('change', onWallChange);
      wPortalSector.removeEventListener('change', onWallChange);
      wPortalKind.removeEventListener('change', onWallChange);
      wUnpegged.removeEventListener('change', onWallChange);
      tType.removeEventListener('change', onThingChange);
      tPosX.removeEventListener('change', onThingChange);
      tPosY.removeEventListener('change', onThingChange);
      tPosZ.removeEventListener('change', onThingChange);
      tAngle.removeEventListener('change', onThingChange);
    },
  };
}
