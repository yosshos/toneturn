// Avatar studio — phase 1 showcase (docs/AVATAR_SPEC.md, AA decisions): two modular low-poly avatars on a
// small stage. Mix outfits part by part (hair, top, bottom, shoes), try items (headphones, shades, beanie,
// guitar) and play emotes. Models: Quaternius Ultimate Modular Men/Women (CC0); emotes: Mixamo, retargeted in
// Blender (ToneTurn-3d/build.py); items modelled in Blender. three.js loads only when this screen opens.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';

type Slot = 'head' | 'body' | 'legs' | 'feet';
type Item = 'headphones' | 'shades' | 'beanie' | 'guitar';
export interface AvatarLook {
  outfit: Record<Slot, string>;
  items: Item[];
}
export interface AvatarPair {
  a: AvatarLook;
  b: AvatarLook;
}

/** Bump when the GLBs change (browsers and the CDN cache them). */
const ASSET_REV = 3;
const MODELS = {
  a: { url: 'avatars/avatar-a.glb', outfits: ['Casual_2', 'Casual_Hoodie', 'Punk', 'Suit'] },
  b: { url: 'avatars/avatar-b.glb', outfits: ['Casual', 'Punk', 'Suit'] },
} as const;
type Who = keyof typeof MODELS;
/** Parts that only fit together (measured in Blender: her punk trousers end at the knee, only the punk boots reach
 * up to meet them — any other shoe would leave a gap). Choosing one brings the other. */
const PAIRS: Record<Who, { slot: Slot; outfit: string; with: Slot }[]> = {
  a: [],
  b: [
    { slot: 'legs', outfit: 'Punk', with: 'feet' },
    { slot: 'feet', outfit: 'Punk', with: 'legs' },
  ],
};
export function pairUp(who: Who, look: AvatarLook, changed: Slot): AvatarLook {
  const out = { ...look.outfit };
  for (const p of PAIRS[who]) {
    if (p.slot === changed && out[changed] === p.outfit) out[p.with] = p.outfit;
    // leaving a pair: the partner goes back to a part that fits anything
    if (p.with === changed && out[changed] !== p.outfit && out[p.slot] === p.outfit) out[p.slot] = out[changed];
  }
  return { ...look, outfit: out };
}
const SLOTS: Slot[] = ['head', 'body', 'legs', 'feet'];
const ITEMS: { id: Item; emoji: string; price: number; rarity: 'common' | 'rare' | 'epic' | 'legendary' }[] = [
  { id: 'beanie', emoji: '🧢', price: 150, rarity: 'common' },
  { id: 'shades', emoji: '🕶️', price: 600, rarity: 'rare' },
  { id: 'headphones', emoji: '🎧', price: 1500, rarity: 'epic' },
  { id: 'guitar', emoji: '🎸', price: 8000, rarity: 'legendary' },
];
// (Seated air drums are left out: without a kit they read poorly and the hands brush the thighs.)
const EMOTES = ['wave', 'guitar', 'bow', 'clap', 'nod', 'dance', 'headbang', 'victory'] as const;
type Emote = (typeof EMOTES)[number];
const EMOTE_ICON: Record<Emote, string> = { wave: '👋', guitar: '🎸', bow: '🙇', clap: '👏', nod: '🙂', dance: '🕺', headbang: '🤘', victory: '🏆' };
/** Long clips are cut so an emote is a short moment (seconds). */
const MAX_EMOTE_S = 6;

export const DEFAULT_PAIR: AvatarPair = {
  a: { outfit: { head: 'Casual_Hoodie', body: 'Punk', legs: 'Casual_Hoodie', feet: 'Casual_2' }, items: ['headphones'] },
  b: { outfit: { head: 'Punk', body: 'Casual', legs: 'Punk', feet: 'Punk' }, items: ['shades'] },
};

interface Rig {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationClip>;
  idle: THREE.AnimationAction;
  current: THREE.AnimationAction | null;
  timer: number | null;
  parts: Map<string, THREE.Object3D[]>; // "<outfit>__<slot>" -> meshes (slot: head, hairtop, body, legs, feet)
  /** Items: "<item>" or "<item>__<head outfit>" (fitted per head) -> object; guitar has "guitar" (played) and "guitar_back". */
  items: Map<string, THREE.Object3D>;
  emoting: Emote | null;
}

// No clipping (built and measured in Blender, ToneTurn-3d/build.py): hats, headphones and shades are fitted to each
// head; the hair above the hat line is hidden under the beanie; the guitar is played in front and carried on the
// back otherwise, at placements where no body vertex enters it in any frame of any emote.
function applyLook(rig: Rig, look: AvatarLook) {
  const hat = look.items.includes('beanie');
  for (const [key, objs] of rig.parts) {
    const [outfit, slot] = key.split('__') as [string, Slot | 'hairtop'];
    const show = slot === 'hairtop' ? look.outfit.head === outfit && !hat : look.outfit[slot] === outfit;
    for (const o of objs) o.visible = show;
  }
  const playing = rig.emoting === 'guitar';
  const head = look.outfit.head;
  for (const [id, o] of rig.items) {
    const [kind, fit] = id.split('__');
    if (kind === 'guitar') o.visible = playing;
    else if (kind === 'guitar_back') o.visible = look.items.includes('guitar') && !playing;
    else o.visible = look.items.includes(kind as Item) && (!fit || fit === head);
  }
}


function prepare(gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }): Rig {
  const root = gltf.scene;
  const parts = new Map<string, THREE.Object3D[]>();
  const items = new Map<string, THREE.Object3D>();
  root.traverse((o) => {
    const m = /^([A-Za-z0-9_]+?)__(head|hairtop|body|legs|feet)__\d+$/.exec(o.name);
    if (m) {
      const k = `${m[1]}__${m[2]}`;
      parts.set(k, [...(parts.get(k) ?? []), o]);
    }
    const it = /^item_((?:headphones|shades|beanie)__[A-Za-z0-9_]+|guitar|guitar_back)$/.exec(o.name);
    if (it) items.set(it[1], o);
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.frustumCulled = false; // skinned bounds do not follow emotes
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mt of mats) if ((mt as THREE.MeshStandardMaterial).isMeshStandardMaterial) (mt as THREE.MeshStandardMaterial).flatShading = true;
    }
  });
  const mixer = new THREE.AnimationMixer(root);
  const clips = new Map(gltf.animations.map((c) => [c.name, c]));
  const idle = mixer.clipAction(clips.get('idle')!);
  idle.play();
  return { root, mixer, clips, idle, current: null, timer: null, parts, items, emoting: null };
}

function playEmote(rig: Rig, name: Emote, look: AvatarLook) {
  const clip = rig.clips.get(name);
  if (!clip) return;
  if (rig.timer) window.clearTimeout(rig.timer);
  const a = rig.mixer.clipAction(clip);
  a.reset();
  a.setLoop(THREE.LoopRepeat, Infinity);
  a.enabled = true;
  a.setEffectiveWeight(1);
  (rig.current ?? rig.idle).crossFadeTo(a, 0.25, false);
  a.play();
  if (rig.current && rig.current !== a) {
    const prev = rig.current;
    window.setTimeout(() => prev.stop(), 300);
  }
  rig.current = a;
  rig.emoting = name;
  applyLook(rig, look);
  const secs = Math.min(clip.duration, MAX_EMOTE_S);
  rig.timer = window.setTimeout(() => {
    rig.idle.reset().play();
    a.crossFadeTo(rig.idle, 0.4, false);
    window.setTimeout(() => {
      if (rig.current === a) {
        a.stop();
        rig.current = null;
      }
    }, 450);
    rig.emoting = null;
    applyLook(rig, look);
    rig.timer = null;
  }, secs * 1000);
}

/** A soft round shadow / selection ring under each avatar. */
function floorDisc(color: string, opacity: number, r: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.005;
  return m;
}

export default function AvatarStudio({ t, settings, onBack, onSave }: { t: Strings; settings: Settings; onBack: () => void; onSave: (p: AvatarPair) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const rigs = useRef<Partial<Record<Who, Rig>>>({});
  const rings = useRef<Partial<Record<Who, THREE.Mesh>>>({});
  const [pair, setPair] = useState<AvatarPair>(() => {
    const saved = (settings.avatars as AvatarPair | undefined) ?? DEFAULT_PAIR;
    return { a: pairUp('a', saved.a, 'legs'), b: pairUp('b', saved.b, 'legs') };
  });
  const [who, setWho] = useState<Who>('a');
  const [tab, setTab] = useState<'look' | 'items' | 'emotes'>('look');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const pairRef = useRef(pair);
  pairRef.current = pair;
  const lang = settings.uiLang;
  const reduced = settings.reducedMotion === true;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.35, 5.4);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.95, 0);
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 8;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.enableDamping = true;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a2a55, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.5, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -1;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc94d, 1.1);
    rim.position.set(-3, 2.5, -2.5);
    scene.add(rim);
    // stage
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.35, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x2a2140, roughness: 0.9 }));
    stage.position.y = -0.06;
    stage.receiveShadow = true;
    scene.add(stage);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.02, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffc94d }));
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.002;
    scene.add(edge);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const base = import.meta.env.BASE_URL;
    let alive = true;
    const xs: Record<Who, number> = { a: -0.62, b: 0.62 };
    Promise.all(
      (Object.keys(MODELS) as Who[]).map(
        (k) =>
          new Promise<void>((resolve, reject) =>
            loader.load(
              `${base}${MODELS[k].url}?v=${ASSET_REV}`,
              (g) => {
                if (!alive) return resolve();
                const rig = prepare(g);
                rig.root.position.x = xs[k];
                rig.root.rotation.y = k === 'a' ? 0.18 : -0.18;
                scene.add(rig.root);
                const ring = floorDisc('rgba(255,201,77,0.9)', 0.75, 0.55);
                ring.position.x = xs[k];
                scene.add(ring);
                const shadow = floorDisc('rgba(0,0,0,0.55)', 1, 0.42);
                shadow.position.x = xs[k];
                scene.add(shadow);
                rings.current[k] = ring;
                rigs.current[k] = rig;
                applyLook(rig, pairRef.current[k]);
                resolve();
              },
              undefined,
              reject,
            ),
          ),
      ),
    )
      .then(() => alive && setReady(true))
      .catch(() => alive && setFailed(true));

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      // Narrow screens: step back so both avatars fit.
      const dir = camera.position.clone().sub(controls.target).setLength(w < 420 ? 5.9 : 5.2);
      camera.position.copy(controls.target).add(dir);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      for (const r of Object.values(rigs.current)) r?.mixer.update(reduced ? dt * 0.6 : dt);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    // Tap an avatar to edit it.
    const ray = new THREE.Raycaster();
    const onTap = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(p, camera);
      const hit = ray.intersectObjects(scene.children, true).find((h) => (Object.keys(rigs.current) as Who[]).some((k) => isUnder(h.object, rigs.current[k]!.root)));
      if (hit) {
        const k = (Object.keys(rigs.current) as Who[]).find((kk) => isUnder(hit.object, rigs.current[kk]!.root));
        if (k) setWho(k);
      }
    };
    renderer.domElement.addEventListener('pointerup', onTap);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerup', onTap);
      for (const r of Object.values(rigs.current)) {
        if (r?.timer) window.clearTimeout(r.timer);
        r?.mixer.stopAllAction();
      }
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        for (const mt of mats) mt.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      rigs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply looks and the selection ring.
  useEffect(() => {
    for (const k of Object.keys(rigs.current) as Who[]) applyLook(rigs.current[k]!, pair[k]);
    for (const k of Object.keys(rings.current) as Who[]) rings.current[k]!.visible = k === who;
  }, [pair, who, ready]);

  const look = pair[who];
  /** Functional update: fast taps in a row must not overwrite each other. */
  const setLook = (f: (l: AvatarLook) => AvatarLook) => setPair((p) => ({ ...p, [who]: f(p[who]) }));
  const outfits = MODELS[who].outfits;
  const outfitName = (o: string) => (who === 'b' && o === 'Suit' ? t.avatarLateShow : null) ?? t.avatarOutfits[o.replace('_2', '')] ?? o;
  const emote = (e: Emote, k: Who = who) => {
    const r = rigs.current[k];
    if (r) playEmote(r, e, pairRef.current[k]);
  };
  const jam = () => {
    emote('guitar', 'a');
    emote('headbang', 'b');
  };

  return (
    <main className="panel-screen avatar-studio">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.avatarStudio}</h1>
        <span className="new-chip">{t.previewChip}</span>
      </header>
      <div className="stage-wrap">
        <div ref={host} className="avatar-stage" aria-label={t.avatarStageLabel} role="img" />
        {!ready && !failed && <p className="stage-msg">{t.avatarLoading}</p>}
        {failed && <p className="stage-msg">{t.avatarFailed}</p>}
        <div className="who-switch" role="radiogroup" aria-label={t.avatarWho}>
          {(['a', 'b'] as Who[]).map((k) => (
            <button key={k} role="radio" aria-checked={who === k} className={who === k ? 'on' : ''} onClick={() => setWho(k)}>
              {k === 'a' ? t.avatarA : t.avatarB}
            </button>
          ))}
        </div>
      </div>

      <div className="seg studio-tabs" role="tablist">
        {(['look', 'items', 'emotes'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {k === 'look' ? t.avatarTabLook : k === 'items' ? t.avatarTabItems : t.avatarTabEmotes}
          </button>
        ))}
      </div>

      {tab === 'look' && (
        <section className="set-card studio-panel" data-panel="look">
          {SLOTS.map((slot) => (
            <div key={slot} className="slot-row">
              <b>{t.avatarSlots[slot]}</b>
              <div className="chips">
                {outfits.map((o) => (
                  <button key={o} className={`chip ${look.outfit[slot] === o ? 'on' : ''}`} aria-pressed={look.outfit[slot] === o} data-slot={slot} data-outfit={o} onClick={() => setLook((l) => pairUp(who, { ...l, outfit: { ...l.outfit, [slot]: o } }, slot))}>
                    {outfitName(o)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            className="btn ghost small"
            onClick={() => {
              const pick = () => outfits[Math.floor(Math.random() * outfits.length)];
              setLook((l) => pairUp(who, { ...l, outfit: { head: pick(), body: pick(), legs: pick(), feet: pick() } }, 'legs'));
            }}
          >
            🎲 {t.avatarShuffle}
          </button>
        </section>
      )}

      {tab === 'items' && (
        <section className="set-card studio-panel" data-panel="items">
          <p className="field-hint">{t.avatarItemsHint}</p>
          <div className="item-grid">
            {ITEMS.map((it) => {
              const on = look.items.includes(it.id);
              return (
                <button key={it.id} className={`item-card r-${it.rarity} ${on ? 'on' : ''}`} aria-pressed={on} data-item={it.id} onClick={() => setLook((l) => ({ ...l, items: l.items.includes(it.id) ? l.items.filter((x) => x !== it.id) : [...l.items, it.id] }))}>
                  <span className="item-emoji" aria-hidden="true">
                    {it.emoji}
                  </span>
                  <b>{t.avatarItems[it.id]}</b>
                  <small>
                    {t.avatarRarity[it.rarity]} · <span dir="ltr">{it.price.toLocaleString(lang === 'he' ? 'he-IL' : 'en-US')} XP</span>
                  </small>
                  <span className="item-state">{on ? t.avatarWearing : t.avatarTryOn}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'emotes' && (
        <section className="set-card studio-panel" data-panel="emotes">
          <div className="emote-grid">
            {EMOTES.map((e) => (
              <button key={e} className="emote-btn" data-emote={e} onClick={() => emote(e)} disabled={!ready}>
                <span aria-hidden="true">{EMOTE_ICON[e]}</span>
                <small>{t.avatarEmotes[e]}</small>
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={jam} disabled={!ready} data-emote="jam">
            🎸🤘 {t.avatarJam}
          </button>
        </section>
      )}

      <button className="btn mega" onClick={() => onSave(pair)}>
        {t.avatarSave}
      </button>
      <p className="field-hint credits">{t.avatarCredits}</p>
    </main>
  );
}

function isUnder(o: THREE.Object3D, root: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === root) return true;
  return false;
}
