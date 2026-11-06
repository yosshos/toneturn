# Avatar pipeline (phase 1 showcase)

Builds `public/avatars/avatar-a.glb` (men) and `avatar-b.glb` (women) for the Avatar studio.

Inputs (not in the repo; download into `ToneTurn-3d/downloads/`):
- Quaternius **Ultimate Modular Men / Women** glTF characters (CC0): men Casual_2, Casual_Hoodie, Punk, Suit; women Casual, Punk, Suit.
- Mixamo animations, FBX, *without skin*, 30 fps: idle (Happy Idle), wave (Waving), guitar (Guitar Playing), bow (Quick Formal Bow), clap (Clapping), nod (Head Nod Yes), dance (Hip Hop Dancing), headbang (Cheering, head banging), victory (Victory), drums (Playing Drums).

What `build.py` does (Blender 5.2, background):
1. Merges the outfits onto one skeleton; each part is classified by where it sits on the body (feet / legs / body / head) and named `<outfit>__<slot>__<n>`.
2. Retargets the Mixamo clips: faces the source the same way, aligns each limb by joint positions (bone tails are import conventions), transfers world-space rotation deltas, scales hip motion by hip height, pins the feet (children of Root in this rig) to the end of the shins. Measured error: 0° on every mapped bone.
3. Models the items (headphones, shades, beanie, guitar) and parents them to bones (`item_<name>`).
4. Exports GLB with one action per emote.

```bash
blender -b --factory-startup --python build.py -- men out/men.glb render
blender -b --factory-startup --python build.py -- women out/women.glb
npx @gltf-transform/cli optimize out/men.glb out/men.opt.glb --compress meshopt --join false --instance false --flatten false --simplify false --palette false
```
