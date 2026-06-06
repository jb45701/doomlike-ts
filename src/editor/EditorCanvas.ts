/**
 * EditorCanvas — 2D top-down canvas factory.
 * Drawing: EditorDraw, hit-test: EditorHitTest, camera: EditorCamera.
 */
import type { LevelData, Vec2 } from '../level/LevelTypes';
import { pushUndo } from './LevelIO';
import type { EditorCamera } from './EditorCamera';
import { screenToWorld, snap, panStart, panMove, zoomAtCursor } from './EditorCamera';
import { hitTest } from './EditorHitTest';
import type { HitResult } from './EditorHitTest';
import { renderEditor } from './EditorDraw';

export type Selection = { kind: 'sector'; sectorIndex: number } | { kind: 'wall'; sectorIndex: number; wallIndex: number } | { kind: 'thing'; thingIndex: number } | { kind: 'vertex' } | null;

export interface EditorCanvasAPI { setTool(t: 'draw'|'select'): void; setSnap(e: boolean): void; setGridSize(s: number): void; zoomToFit(): void; render(): void; dispose(): void; }

export interface EditorCanvasCallbacks { onSelectSector: (i: number) => void; onSelectWall: (si: number, wi: number) => void; onSelectThing: (i: number) => void; onDeselectAll: () => void; onChange: () => void; }

export function createEditorCanvas(canvas: HTMLCanvasElement, lr: { level: LevelData }, cb: EditorCanvasCallbacks): EditorCanvasAPI {
  const level = lr.level;
  const ctx = canvas.getContext('2d')!;
  const cam: EditorCamera = { x: 0, y: 0, zoom: 2 };
  const st = { tool: 'draw' as 'draw'|'select', snap: true, grid: 32 };
  let dv: Vec2[] = [], dp: {x:number;y:number}|null = null, pan: {x:number;y:number;camX:number;camY:number}|null = null;

  const sz = () => { const p = canvas.parentElement; return p ? {w: p.clientWidth, h: p.clientHeight} : {w:800,h:600}; };

  const render = () => {
    const {w,h} = sz(); canvas.width=w; canvas.height=h;
    renderEditor({ctx,w,h,cam,level,tool:st.tool,drawVertices:dv,drawPreview:dp,gridSize:st.grid}); };

  const gc = (e:MouseEvent) => { const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };

  const finish = () => {
    if (dv.length<3) return; pushUndo();
    const walls = [];
    for (let i=0;i<dv.length;i++) { const n=(i+1)%dv.length; walls.push({start:{x:dv[i].x,y:dv[i].y},end:{x:dv[n].x,y:dv[n].y},texture:'textures/walls/brick'}); }
    level.sectors.push({id:level.sectors.reduce((m,s)=>Math.max(m,s.id),-1)+1,floorHeight:0,ceilingHeight:128,floorTexture:'textures/floors/gray',ceilingTexture:'textures/ceilings/white',lightLevel:200,walls});
    dv=[];dp=null;cb.onChange();render();
  };

  const drawClick = (wx:number,wy:number) => {
    let px=wx,py=wy; if(st.snap){px=snap(wx,st.grid);py=snap(wy,st.grid);}
    if(dv.length>=3){const f=dv[0];if(Math.hypot(px-f.x,py-f.y)<st.grid*1.5){finish();return;}}
    if(dv.length>0){const l=dv[dv.length-1];if(Math.abs(px-l.x)<0.001&&Math.abs(py-l.y)<0.001)return;}
    dv.push({x:px,y:py});render();
  };

  const selClick = (wx:number,wy:number) => {
    const h:HitResult=hitTest(wx,wy,level,cam.zoom);
    if(h?.kind==='sector')cb.onSelectSector(h.sectorIdx);else if(h?.kind==='wall')cb.onSelectWall(h.sectorIdx,h.wallIdx);else if(h?.kind==='thing')cb.onSelectThing(h.thingIdx);else cb.onDeselectAll();
  };

  const md = (e:MouseEvent) => {
    const {x,y}=gc(e), w=screenToWorld(x,y,cam,canvas.width,canvas.height);
    if(e.button===1){e.preventDefault();pan=panStart(cam,e);canvas.style.cursor='grabbing';return;}
    if(e.button===2){if(st.tool==='draw'&&dv.length>0){dv=[];dp=null;render();}return;}
    if(e.button!==0)return;
    if(st.tool==='draw')drawClick(w.x,w.y);else selClick(w.x,w.y);
  };

  const mm = (e:MouseEvent) => {
    if(pan){const r=panMove(pan,e,cam.zoom);cam.x=r.camX;cam.y=r.camY;render();return;}
    const {x,y}=gc(e), w=screenToWorld(x,y,cam,canvas.width,canvas.height);
    if(st.tool==='draw'){dp=st.snap?{x:snap(w.x,st.grid),y:snap(w.y,st.grid)}:{x:w.x,y:w.y};render();return;}
    if(st.tool==='select'){canvas.style.cursor=hitTest(w.x,w.y,level,cam.zoom)?'pointer':'crosshair';}
  };

  const mu = (e:MouseEvent) => {if(e.button===1&&pan){pan=null;canvas.style.cursor='crosshair';}};

  const mw = (e:WheelEvent) => {
    e.preventDefault(); const {x,y}=gc(e);
    const r=zoomAtCursor(cam,{x,y},canvas.width,canvas.height,e.deltaY);
    cam.x=r.camX;cam.y=r.camY;cam.zoom=r.zoom;render();
  };

  render(); window.addEventListener('resize',render);
  canvas.addEventListener('mousedown',md); canvas.addEventListener('mousemove',mm);
  canvas.addEventListener('mouseup',mu); canvas.addEventListener('wheel',mw,{passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  return {
    setTool(t){st.tool=t;if(t!=='draw'){dv=[];dp=null;}render();},
    setSnap(e){st.snap=e;},
    setGridSize(s){st.grid=Math.max(8,Math.min(256,s));},
    zoomToFit(){cam.x=0;cam.y=0;cam.zoom=2;render();},
    render,
    dispose(){window.removeEventListener('resize',render);canvas.removeEventListener('mousedown',md);canvas.removeEventListener('mousemove',mm);canvas.removeEventListener('mouseup',mu);canvas.removeEventListener('wheel',mw);},
  };
}
