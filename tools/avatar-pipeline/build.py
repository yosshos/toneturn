# Build a modular avatar GLB: several Quaternius outfits on one skeleton, Mixamo emotes retargeted onto it,
# and low-poly items parented to bones. Run: blender -b --factory-startup --python build.py -- <gender> <out.glb>
import bpy, sys, os, math
from mathutils import Matrix, Quaternion, Vector

ROOT = r"C:\Users\user\Documents\Projects\ToneTurn-3d"
argv = sys.argv[sys.argv.index("--") + 1:]
GENDER, OUT = argv[0], argv[1]
RENDER = len(argv) > 2 and argv[2] == "render"
OUTFITS = {"men": ["Casual_2", "Casual_Hoodie", "Punk", "Suit"], "women": ["Casual", "Punk", "Suit"]}[GENDER]
ANIMS = os.environ.get("ANIMS", "idle,wave,guitar,bow,clap,nod,dance,headbang,victory,drums").split(",")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30

# ------------------------------------------------------------------ outfits on one armature
arm = None
parts = []
for outfit in OUTFITS:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "downloads", "quaternius", GENDER, "gltf", outfit + ".gltf"))
    new = [o for o in bpy.data.objects if o not in before]
    a = next(o for o in new if o.type == "ARMATURE")
    meshes = [o for o in new if o.type == "MESH"]
    # slot by where the part sits on the body (rest pose, deformed vertices in world space)
    dg = bpy.context.evaluated_depsgraph_get()
    def zr(o):
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        zs = [(o.matrix_world @ v.co).z for v in me.vertices]
        ev.to_mesh_clear()
        return min(zs), max(zs)
    hh = None
    for o in new:
        if o.type == "ARMATURE":
            hh = (o.matrix_world @ o.data.bones["Head"].head_local).z
    counts = {}
    for m in list(meshes):
        if not m.data.materials:  # helper geometry without materials
            meshes.remove(m)
            new.remove(m)
            bpy.data.objects.remove(m, do_unlink=True)
            continue
        z0, z1 = zr(m)
        if z1 < hh * 0.3:
            slot = "feet"
        elif z0 > hh * 0.85:
            slot = "head"
        elif z1 <= hh * 0.75:
            slot = "legs"
        else:
            slot = "body"
        print("Z", outfit, [mt.name for mt in m.data.materials], round(z0 / hh, 2), round(z1 / hh, 2))
        counts[slot] = counts.get(slot, 0) + 1
        m.name = f"{outfit}__{slot}__{counts[slot]}"
        m.data.name = m.name
        parts.append(m)
    print("PARTS", outfit, sorted(x.name for x in meshes))
    if arm is None:
        arm = a
        arm.name = "Avatar"
    else:
        for m in meshes:
            mw = m.matrix_world.copy()
            m.parent = arm
            m.matrix_world = mw
            for mod in m.modifiers:
                if mod.type == "ARMATURE":
                    mod.object = arm
        for o in new:
            if o.type not in ("MESH",) and o != arm:
                bpy.data.objects.remove(o, do_unlink=True)
# The artist's relaxed hand pose (first frame of the pack's Idle) — used for the fingers in every emote.
FINGERS = ("Thumb", "Index", "Middle", "Ring", "Pinky")
HAND_POSE = {}
_idle = bpy.data.actions.get("Idle") or next((a for a in bpy.data.actions if a.name.startswith("Idle")), None)
if _idle is not None:
    arm.animation_data_create()
    arm.animation_data.action = _idle
    scene.frame_set(int(_idle.frame_range[0]))
    bpy.context.view_layer.update()
    for pb in arm.pose.bones:
        if pb.name.startswith(FINGERS):
            pb.rotation_mode = "QUATERNION"
            HAND_POSE[pb.name] = pb.rotation_quaternion.copy()
    arm.animation_data.action = None
print("HAND POSE bones:", len(HAND_POSE))
# Drop the pack's own animations (combat etc.)
for act in list(bpy.data.actions):
    bpy.data.actions.remove(act)
if arm.animation_data:
    arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
    pb.scale = (1, 1, 1)
bpy.context.view_layer.update()

def wpos(obj, bone):  # rest head position, world
    return obj.matrix_world @ obj.data.bones[bone].head_local

H = max((arm.matrix_world @ arm.data.bones["Head"].tail_local).z, 0.1)
print("CHAR HEIGHT (head tail z):", H)

# ------------------------------------------------------------------ retarget Mixamo
MAP = {"Hips": "Hips", "Spine": "Abdomen", "Spine1": "Torso", "Spine2": "Chest", "Neck": "Neck", "Head": "Head"}
for side, s in (("Left", "L"), ("Right", "R")):
    MAP.update({f"{side}Shoulder": f"Shoulder.{s}", f"{side}Arm": f"UpperArm.{s}", f"{side}ForeArm": f"LowerArm.{s}", f"{side}Hand": f"Wrist.{s}",
                f"{side}UpLeg": f"UpperLeg.{s}", f"{side}Leg": f"LowerLeg.{s}", f"{side}Foot": f"Foot.{s}"})
    # fingers: the artist's hand pose instead (Mixamo's hand and this rig's differ too much to retarget well)

def facing(obj, lsh, rsh):
    v = wpos(obj, lsh) - wpos(obj, rsh)  # character's right -> left
    v.z = 0
    return math.atan2(v.y, v.x)

order = []  # target bones in hierarchy order
def walk(b):
    order.append(b.name)
    for c in b.children:
        walk(c)
for b in arm.data.bones:
    if b.parent is None:
        walk(b)
LOGICAL = {"Foot.L": "LowerLeg.L", "Foot.R": "LowerLeg.R"}
for fb in LOGICAL:
    if fb in order:
        order.remove(fb)
        order.append(fb)
print("FOOT PARENTS", {f: arm.data.bones[f].parent.name if arm.data.bones[f].parent else None for f in LOGICAL})

from mathutils.bvhtree import BVHTree
ARMISH = ("Shoulder", "UpperArm", "LowerArm", "Wrist", "Thumb", "Index", "Middle", "Ring", "Pinky")
HANDISH = ("LowerArm", "Wrist", "Thumb", "Index", "Middle", "Ring", "Pinky")
_vg_cache = {}
def dominant_groups(o):
    if o.name not in _vg_cache:
        dom = []
        for v in o.data.vertices:
            g = max(v.groups, key=lambda g: g.weight) if v.groups else None
            dom.append(o.vertex_groups[g.group].name if g else "")
        _vg_cache[o.name] = dom
    return _vg_cache[o.name]
collide_objs = [p for p in parts if "__body__" in p.name or "__legs__" in p.name]
def posed(o):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    vs = [ev.matrix_world @ v.co for v in me.vertices]
    polys = [tuple(p.vertices) for p in me.polygons]
    ev.to_mesh_clear()
    return vs, polys
DIAG = {}
def arm_hits():
    """Hand/forearm vertices (per side) inside the torso, hips or legs of any outfit — current pose."""
    hits = {"L": 0, "R": 0}
    DIAG.clear()
    meshes = [(o, *posed(o)) for o in collide_objs]
    trees = []
    for o, vs, polys in meshes:
        dom = dominant_groups(o)
        keep = [p for p in polys if not any(dom[i].startswith(ARMISH) for i in p)]
        if keep:
            trees.append(BVHTree.FromPolygons(vs, keep))
    for o, vs, polys in meshes:
        dom = dominant_groups(o)
        for i, v in enumerate(vs):
            g = dom[i]
            if not g.startswith(HANDISH):
                continue
            side = g[-1]
            for t in trees:
                loc, nrm, idx, dist = t.find_nearest(v, 0.08)
                tol = -0.015 if g.startswith("LowerArm") else -0.006  # a forearm may graze the hip; a hand never sinks in
                if loc is not None and (v - loc).dot(nrm) < tol:
                    hits[side] += 1
                    key = (o.name.split("__")[0], g, round((v - loc).dot(nrm), 2))
                    DIAG[key[:2]] = min(DIAG.get(key[:2], 0), key[2])
                    break
    return hits
def abduct(side, deg):
    """Move the upper arm clear of the body, pivoting at the shoulder: first out to the side (up to 24°), then
    forward as well for the rest (a hand in front of the hips is freed by bringing it forward, not out)."""
    side_deg = min(deg, 20)
    fwd_deg = max(0, deg - 20)
    _rot_arm(side, side_deg, fwd_world if side == "L" else -fwd_world)
    if fwd_deg:
        _rot_arm(side, fwd_deg, -lr_w if side == "L" else -lr_w)
def _rot_arm(side, deg, axis_w):
    pb = arm.pose.bones["UpperArm." + side]
    M = pb.matrix.copy()
    basis = pb.matrix_basis.copy()
    base = M @ basis.inverted()
    ax = (arm.matrix_world.inverted().to_3x3() @ axis_w).normalized()
    R = Quaternion(ax, math.radians(deg)).to_matrix()
    newM = (R @ M.to_3x3()).to_4x4()
    newM.translation = M.translation
    pb.matrix_basis = base.inverted() @ newM
lr_w = wpos(arm, "UpperArm.L") - wpos(arm, "UpperArm.R"); lr_w.z = 0; lr_w.normalize()
fwd_world = lr_w.cross(Vector((0, 0, 1)))
def fix_arms(anim, nframes):
    step = 3
    samples = list(range(0, nframes, step)) + [nframes - 1]
    need = {"L": {}, "R": {}}
    if os.environ.get("DIAGARMS"):
        for ang in (0, 12, 24, 36, 48):
            scene.frame_set(0)
            if ang:
                abduct("L", ang); abduct("R", ang)
            bpy.context.view_layer.update()
            h = arm_hits()
            print("DIAG", anim, ang, h, sorted(DIAG.items(), key=lambda kv: kv[1])[:6])
        arm.animation_data.action = None
        for pb in arm.pose.bones:
            pb.matrix_basis = Matrix()
        bpy.context.view_layer.update()
        h = arm_hits()
        print("DIAG REST", h, sorted(DIAG.items(), key=lambda kv: kv[1])[:6])
        return
    for f in samples:
        scene.frame_set(f); bpy.context.view_layer.update()
        h = arm_hits()
        for side in ("L", "R"):
            a = 0
            while h[side] > 2 and a < 40:
                a += 4
                scene.frame_set(f)
                for sd in ("L", "R"):
                    ang = a if sd == side else need[sd].get(f, 0)
                    if ang:
                        abduct(sd, ang)
                bpy.context.view_layer.update()
                h = arm_hits()
            need[side][f] = a
    # smooth: hold the peak a little either side, then ease, so the arm never pops
    for side in ("L", "R"):
        vals = [need[side].get(f, 0) for f in samples]
        held = [max(vals[max(0, i - 1): i + 2]) for i in range(len(vals))]
        sm = [sum(held[max(0, i - 1): i + 2]) / len(held[max(0, i - 1): i + 2]) for i in range(len(held))]
        need[side] = dict(zip(samples, sm))
    tot = sum(1 for sd in need for v in need[sd].values() if v > 0)
    if tot:
        for f in range(nframes):
            # interpolate between samples
            lo = max([s_ for s_ in samples if s_ <= f]); hi = min([s_ for s_ in samples if s_ >= f])
            scene.frame_set(f)
            for side in ("L", "R"):
                a0, a1 = need[side][lo], need[side][hi]
                a = a0 if hi == lo else a0 + (a1 - a0) * (f - lo) / (hi - lo)
                if a > 0.01:
                    abduct(side, a)
                    arm.pose.bones["UpperArm." + side].keyframe_insert("rotation_quaternion", frame=f)
    print("ARMS", anim, "frames corrected:", tot, "max L/R:", round(max(need["L"].values()), 1), round(max(need["R"].values()), 1))

inv_map = {}
for anim in ANIMS:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(ROOT, "downloads", "mixamo", anim + ".fbx"), automatic_bone_orientation=False)
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    pre = "mixamorig:" if "mixamorig:Hips" in src.data.bones else next(b.name for b in src.data.bones if b.name.endswith("Hips"))[:-4]
    sact = src.animation_data.action
    f0, f1 = (int(x) for x in sact.frame_range)
    # face the same way as the target
    scene.frame_set(f0)
    src.animation_data.action = None
    for pb in src.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    dz = facing(arm, "UpperArm.L", "UpperArm.R") - facing(src, pre + "LeftArm", pre + "RightArm")
    src.rotation_mode = "XYZ"
    src.rotation_euler.z += dz
    bpy.context.view_layer.update()
    # rest data
    m = {pre + k: v for k, v in MAP.items() if pre + k in src.data.bones}
    tw, sw = arm.matrix_world, src.matrix_world
    tw_q = tw.to_3x3().normalized().to_quaternion()
    rest_t = {t: (tw @ arm.data.bones[t].matrix_local).to_3x3().normalized().to_quaternion() for t in m.values()}
    rest_s = {s: (sw @ src.data.bones[s].matrix_local).to_3x3().normalized().to_quaternion() for s in m}
    # Limb directions from joint positions (bone tails are import conventions, not limbs).
    def tchild(t):
        base, side = (t.split(".") + [""])[:2]
        sfx = "." + side if side else ""
        nxt = {"Hips": "Abdomen", "Abdomen": "Torso", "Torso": "Chest", "Chest": "Neck", "Neck": "Head",
               "Shoulder": "UpperArm", "UpperArm": "LowerArm", "LowerArm": "Wrist", "Wrist": "Middle1",
               "UpperLeg": "LowerLeg", "LowerLeg": "Foot"}
        if base in nxt:
            return nxt[base] + ("" if base in ("Hips", "Abdomen", "Torso", "Chest", "Neck") else sfx)
        for f in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
            if base.startswith(f):
                n = int(base[len(f):]) + 1
                c = f"{f}{n}{sfx}"
                return c if c in arm.data.bones else None
        return None
    def schild(s):
        n = s[len(pre):]
        nxt = {"Hips": "Spine", "Spine": "Spine1", "Spine1": "Spine2", "Spine2": "Neck", "Neck": "Head", "Head": "HeadTop_End"}
        if n in nxt:
            return pre + nxt[n]
        for side in ("Left", "Right"):
            sm = {"Shoulder": "Arm", "Arm": "ForeArm", "ForeArm": "Hand", "Hand": "HandMiddle1", "UpLeg": "Leg", "Leg": "Foot", "Foot": "ToeBase"}
            for a, b in sm.items():
                if n == side + a:
                    return pre + side + b
            for f in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
                if n.startswith(side + "Hand" + f):
                    k = int(n[len(side + "Hand" + f):]) + 1
                    return pre + side + "Hand" + f + str(k)
        return None
    up = Vector((0, 0, 1))
    def tdir_rest(t):
        c = tchild(t)
        if t == "Head":
            return up.copy()
        if t.startswith("Foot"):
            v = fwd_t.copy(); v.z = -0.35; return v.normalized()
        if c is None:  # last finger joint: continue the previous segment
            base, sfx = t.split(".")
            prev = base[:-1] + str(int(base[-1]) - 1) + "." + sfx
            return (wpos(arm, t) - wpos(arm, prev)).normalized()
        return (wpos(arm, c) - wpos(arm, t)).normalized()
    def sdir_rest(s):
        c = schild(s)
        if c is None or c not in src.data.bones:
            return None
        return ((sw @ src.data.bones[c].head_local) - (sw @ src.data.bones[s].head_local)).normalized()
    lr_t = wpos(arm, "UpperArm.L") - wpos(arm, "UpperArm.R"); lr_t.z = 0; lr_t.normalize()
    fwd_t = lr_t.cross(up)
    # Full frames, not just directions: the limb direction plus the character's forward (up for the feet), so the
    # twist around each bone matches too (palms face the right way).
    def frame(p, sec):
        x = p.normalized()
        z = (sec - x * sec.dot(x))
        if z.length < 1e-4:
            z = up - x * up.dot(x)
        z.normalize()
        y = z.cross(x)
        return Matrix((x, y, z)).transposed()
    align = {}
    for s, t in m.items():
        ds = sdir_rest(s)
        dt = tdir_rest(t)
        if ds is None:
            align[t] = Quaternion()
            continue
        sec = up if t.startswith("Foot") else fwd_t
        Ft, Fs = frame(dt, sec), frame(ds, sec)
        align[t] = (Fs @ Ft.inverted()).to_quaternion()
    hip_s0 = sw @ src.data.bones[pre + "Hips"].head_local
    hip_t0 = tw @ arm.data.bones["Hips"].head_local
    k = hip_t0.z / max(hip_s0.z, 1e-6)
    src.animation_data.action = sact
    # new action on the target
    act = bpy.data.actions.new(anim)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    t_of = {t: s for s, t in m.items()}
    for f in range(f0, f1 + 1):
        scene.frame_set(f)
        M = {}  # target armature-space pose matrices
        for name in order:
            b = arm.data.bones[name]
            pb = arm.pose.bones[name]
            if b.parent:
                base = M[b.parent.name] @ (b.parent.matrix_local.inverted() @ b.matrix_local)
            else:
                base = b.matrix_local.copy()
            if name in t_of:
                s = t_of[name]
                rs = (sw @ src.pose.bones[s].matrix).to_3x3().normalized().to_quaternion()
                world = rs @ rest_s[s].inverted() @ align[name] @ rest_t[name]
                want = tw_q.inverted() @ world
                rot = base.to_quaternion().inverted() @ want
                loc = Vector((0, 0, 0))
                if name in LOGICAL:
                    lp = LOGICAL[name]
                    want_pos = (M[lp] @ (arm.data.bones[lp].matrix_local.inverted() @ b.matrix_local)).translation
                    loc = base.to_3x3().inverted() @ (want_pos - base.translation)
                if name == "Hips":
                    ps = sw @ src.pose.bones[s].head
                    pt = hip_t0 + (ps - hip_s0) * k
                    pt_arm = tw.inverted() @ pt
                    loc = base.to_3x3().inverted() @ (pt_arm - base.translation)
                pb.rotation_quaternion = rot
                pb.location = loc
                pb.keyframe_insert("rotation_quaternion", frame=f - f0)
                if name == "Hips" or name in LOGICAL:
                    pb.keyframe_insert("location", frame=f - f0)
                Mb = base @ Matrix.Translation(loc) @ rot.to_matrix().to_4x4()
            else:
                Mb = base
            M[name] = Mb
        if f == f0 + 10 and os.environ.get("DEBUG"):
            errs = []
            for s_, t_ in m.items():
                c_ = tchild(t_)
                sc_ = schild(s_)
                if not c_ or c_ not in M or not sc_ or sc_ not in src.pose.bones:
                    continue
                dt_ = (tw @ M[c_].translation - tw @ M[t_].translation).normalized()
                ds_ = (sw @ src.pose.bones[sc_].head - sw @ src.pose.bones[s_].head).normalized()
                errs.append((round(math.degrees(dt_.angle(ds_)), 1), t_))
            errs.sort(reverse=True)
            print("ERR", anim, errs[:8])
            print("TW", [round(x, 3) for x in tw.to_euler()], "scale", [round(x, 3) for x in tw.to_scale()], "SW", [round(x, 3) for x in sw.to_euler()], [round(x, 3) for x in sw.to_scale()])
    for name, q in HAND_POSE.items():
        pb = arm.pose.bones[name]
        pb.rotation_quaternion = q
        pb.keyframe_insert("rotation_quaternion", frame=0)
    if os.environ.get("NOCOLLIDE") is None:
        fix_arms(anim, f1 - f0 + 1)
    arm.animation_data.action = None
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    for a2 in list(bpy.data.actions):
        if a2 != act and a2.name not in ANIMS and not a2.use_fake_user:
            bpy.data.actions.remove(a2)
    print("retargeted", anim, f1 - f0 + 1, "frames")
for pb in arm.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)

# ------------------------------------------------------------------ items (low-poly), parented to bones
def mat(name, rgb, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    m.diffuse_color = (*rgb, 1)
    return m

def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    o.data.name = name
    return o

def parent_to_bone(o, bone):
    mw = o.matrix_world.copy()
    o.parent = arm
    o.parent_type = "BONE"
    o.parent_bone = bone
    bpy.context.view_layer.update()
    o.matrix_world = mw

def add(kind, **kw):
    getattr(bpy.ops.mesh, "primitive_" + kind + "_add")(**kw)
    return bpy.context.active_object

def flat(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = False
    return o

# ---- fitted items: per head outfit (hats, headphones, shades) + guitar front/back, measured for clipping
from mathutils.bvhtree import BVHTree

lr = (wpos(arm, "UpperArm.L") - wpos(arm, "UpperArm.R")); lr.z = 0; lr.normalize()
fwd = lr.cross(Vector((0, 0, 1)))  # character forward (world)
yaw = math.atan2(fwd.y, fwd.x) - math.atan2(-1, 0)
RZ = Matrix.Rotation(yaw, 4, "Z")
neck = wpos(arm, "Head")
FACE_MATS = ("Skin", "Eye", "Eyebrow", "Earring")

def eval_verts(o, with_mats=False):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    mw = ev.matrix_world.copy()
    vs = [mw @ v.co for v in me.vertices]
    mats = None
    if with_mats:
        mats = [""] * len(vs)
        for p in me.polygons:
            mn = o.material_slots[p.material_index].name if p.material_index < len(o.material_slots) else ""
            for vi in p.vertices:
                if not mats[vi] or mats[vi].startswith(FACE_MATS):
                    mats[vi] = mn
    ev.to_mesh_clear()
    return (vs, mats) if with_mats else vs

def is_face(mn):
    return mn.startswith(FACE_MATS)

def half_ellipse_band(ax, az, minor, segs=28):
    """A band over the head: the upper half of an ellipse in the X–Z plane (local), tube of radius `minor`."""
    import bmesh
    me = bpy.data.meshes.new("band")
    bm = bmesh.new()
    rings = []
    ring_n = 6
    for i in range(segs + 1):
        t = math.pi * i / segs
        c = Vector((math.cos(t) * ax, 0, math.sin(t) * az))
        tan = Vector((-math.sin(t) * ax, 0, math.cos(t) * az)).normalized()
        n1 = Vector((0, 1, 0))
        n2 = tan.cross(n1).normalized()
        ring = []
        for j in range(ring_n):
            a = 2 * math.pi * j / ring_n
            ring.append(bm.verts.new(c + (n1 * math.cos(a) + n2 * math.sin(a)) * minor))
        rings.append(ring)
    for i in range(segs):
        for j in range(ring_n):
            bm.faces.new((rings[i][j], rings[i][(j + 1) % ring_n], rings[i + 1][(j + 1) % ring_n], rings[i + 1][j]))
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("band", me)
    scene.collection.objects.link(o)
    return o

blk = mat("Item_Black", (0.03, 0.03, 0.035), 0.45)
red = mat("Item_Red", (0.75, 0.08, 0.08), 0.4)
glass = mat("Item_Glass", (0.02, 0.02, 0.02), 0.1, 0.3)
gold = mat("Item_Gold", (0.85, 0.62, 0.15), 0.35, 1.0)
knit = mat("Item_Knit", (0.95, 0.72, 0.1), 0.9)

ITEMS = []
FIT = {}
for outfit in OUTFITS:
    hm = next(p for p in parts if p.name.startswith(outfit + "__head__"))
    vs, mats = eval_verts(hm, True)
    face = [v for v, mn in zip(vs, mats) if is_face(mn)]
    eyes = [v for v, mn in zip(vs, mats) if mn.startswith("Eye") and not mn.startswith("Eyebrow")]
    skin_top = max(v.z for v in face)
    eye_z = sum(v.z for v in eyes) / len(eyes) if eyes else neck.z + (skin_top - neck.z) * 0.55
    cx = sum(v.x for v in face) / len(face)
    cy = sum(v.y for v in face) / len(face)
    # in character space: forward = fwd, side = lr
    def f_of(v): return (v - Vector((cx, cy, 0))).dot(fwd)
    def s_of(v): return (v - Vector((cx, cy, 0))).dot(lr)
    top_all = max(v.z for v in vs)
    print("HEAD", outfit, "eye", round(eye_z, 3), "skin_top", round(skin_top, 3), "top", round(top_all, 3))

    # --- hair above the hat line becomes its own part, hidden under a hat
    rim_z = eye_z + (skin_top - eye_z) * 0.42
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = hm
    hm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    n_sel = 0
    for p in hm.data.polygons:
        mn = hm.material_slots[p.material_index].name
        if is_face(mn):
            continue
        cz = sum(vs[i].z for i in p.vertices) / len(p.vertices)
        if cz > rim_z:
            p.select = True
            n_sel += 1
    if n_sel:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.separate(type="SELECTED")
        bpy.ops.object.mode_set(mode="OBJECT")
        ht = next(o for o in bpy.context.selected_objects if o != hm)
        ht.name = f"{outfit}__hairtop__1"
        ht.data.name = ht.name
        parts.append(ht)
    # what stays visible under a hat: face + hair below the rim
    keep = [v for v in vs if v.z <= rim_z or True and False] + [v for v, mn in zip(vs, mats) if is_face(mn)]
    above = [v for v, mn in zip(vs, mats) if is_face(mn) and v.z > rim_z - 0.002]

    # --- beanie: an ellipsoid dome over the scalp above the rim, a rim ring that clears the hair at the rim
    at_rim = [v for v in vs if abs(v.z - rim_z) < (skin_top - eye_z) * 0.18]
    rx = max([abs(s_of(v)) for v in above + at_rim] + [0.05]) * 1.10 + 0.006
    ry = max([abs(f_of(v)) for v in above + at_rim] + [0.05]) * 1.10 + 0.006
    rz = max(max([v.z - rim_z for v in above] + [0.05]) * 1.12 + 0.01, 0.85 * max(rx, ry))
    import bmesh
    dome = add("uv_sphere", segments=14, ring_count=8, radius=1)
    bm = bmesh.new(); bm.from_mesh(dome.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.01], context="VERTS")
    bm.to_mesh(dome.data); bm.free()
    dome.scale = (rx, ry, rz)
    bpy.ops.object.transform_apply(scale=True)
    rim = add("torus", major_radius=1, minor_radius=0.12, major_segments=18, minor_segments=5)
    rim.scale = (rx * 1.0, ry * 1.0, 1)
    bpy.ops.object.transform_apply(scale=True)
    for v in rim.data.vertices:
        v.co.z *= max(rx, ry) * 1.0
    pom = add("ico_sphere", subdivisions=1, radius=min(rx, ry) * 0.24)
    pom.location = (0, 0, rz * 1.02)
    bpy.ops.object.transform_apply(location=True)
    for o in (dome, rim, pom):
        flat(o, knit)
    bn = join([dome, rim, pom], f"item_beanie__{outfit}")
    bn.matrix_world = Matrix.Translation((cx, cy, rim_z)) @ RZ
    bpy.context.view_layer.update()
    parent_to_bone(bn, "Head")
    ITEMS.append(bn.name)

    # --- headphones: band over everything (hair included) in the ear plane; cups outside the widest point at ear height
    z_ear = eye_z - (skin_top - eye_z) * 0.15
    slab = [v for v in vs if abs(f_of(v)) < (skin_top - eye_z) * 0.35 and v.z > z_ear - 0.02]
    half_w = max(abs(s_of(v)) for v in slab)
    up_h = max(v.z - z_ear for v in slab)
    minor = 0.012
    ax = half_w + 0.03
    az = up_h + minor + 0.012
    tall = az > (skin_top - z_ear) * 1.9  # e.g. a mohawk: wear it as a neckband instead
    if tall:
        back = [v for v in vs if abs(v.z - z_ear) < 0.05]
        rb = max(-f_of(v) for v in back) + 0.025
        band = half_ellipse_band(ax, rb, minor)
        band.matrix_world = Matrix.Rotation(math.radians(-90), 4, "X")  # half ellipse lies flat, going round the back
        bpy.context.view_layer.objects.active = band
        band.select_set(True)
        bpy.ops.object.transform_apply(rotation=True)
        for v in band.data.vertices:
            v.co.z -= 0.0
    else:
        band = half_ellipse_band(ax, az, minor)
    flat(band, blk)
    cups = []
    for sx in (-1, 1):
        c = add("cylinder", vertices=10, radius=0.045, depth=0.035)
        c.rotation_euler = (0, math.radians(90), 0)
        c.location = (sx * (ax + 0.012), 0, 0)
        bpy.ops.object.transform_apply(rotation=True, location=True)
        flat(c, red)
        cups.append(c)
    hp = join([band] + cups, f"item_headphones__{outfit}")
    ear_y = Vector((cx, cy, 0)) + fwd * (sum(f_of(v) for v in slab) / len(slab))
    hp.matrix_world = Matrix.Translation((ear_y.x, ear_y.y, z_ear)) @ RZ
    bpy.context.view_layer.update()
    parent_to_bone(hp, "Head")
    ITEMS.append(hp.name)

    # --- shades: in front of the face (and any fringe) at eye height
    eye_band = [v for v in vs if abs(v.z - eye_z) < (skin_top - eye_z) * 0.25 and abs(s_of(v)) < half_w * 0.75]
    front = max(f_of(v) for v in eye_band) + 0.012
    fw = max(abs(s_of(v)) for v in face if abs(v.z - eye_z) < 0.03) * 0.95
    lenses = []
    for sx in (-1, 1):
        l = add("cube", size=1)
        l.scale = (fw * 0.78, 0.008, (skin_top - eye_z) * 0.32)
        l.location = (sx * fw * 0.48, 0, 0)
        bpy.ops.object.transform_apply(scale=True, location=True)
        flat(l, glass)
        lenses.append(l)
    br = add("cube", size=1)
    br.scale = (fw * 2.05, 0.006, 0.008)
    br.location = (0, 0, (skin_top - eye_z) * 0.12)
    bpy.ops.object.transform_apply(scale=True, location=True)
    flat(br, gold)
    sg = join(lenses + [br], f"item_shades__{outfit}")
    pos = Vector((cx, cy, eye_z)) + fwd * front
    sg.matrix_world = Matrix.Translation(pos) @ RZ
    bpy.context.view_layer.update()
    parent_to_bone(sg, "Head")
    ITEMS.append(sg.name)

# ---- guitar (canonical: body in the XY plane, neck along +X, thickness along Z)
body_m = mat("Item_GuitarBody", (0.85, 0.12, 0.08), 0.35)
wood = mat("Item_Wood", (0.35, 0.2, 0.08), 0.7)
white = mat("Item_White", (0.92, 0.92, 0.9), 0.5)
L = H * 0.5
TH = L * 0.06
def make_guitar(name):
    b1 = add("cylinder", vertices=12, radius=L * 0.17, depth=TH)
    b2 = add("cylinder", vertices=12, radius=L * 0.13, depth=TH)
    b2.location = (L * 0.2, 0, 0)
    bpy.ops.object.transform_apply(location=True)
    for o in (b1, b2):
        flat(o, body_m)
    pg = add("cylinder", vertices=8, radius=L * 0.08, depth=TH * 1.08)
    pg.location = (L * 0.05, -L * 0.05, 0)
    bpy.ops.object.transform_apply(location=True)
    flat(pg, white)
    nk = add("cube", size=1)
    nk.scale = (L * 0.5, L * 0.045, TH * 0.5)
    nk.location = (L * 0.5, 0, TH * 0.33)
    bpy.ops.object.transform_apply(scale=True, location=True)
    flat(nk, wood)
    hs = add("cube", size=1)
    hs.scale = (L * 0.12, L * 0.07, TH * 0.5)
    hs.location = (L * 0.81, 0, TH * 0.33)
    bpy.ops.object.transform_apply(scale=True, location=True)
    flat(hs, blk)
    return join([b1, b2, pg, nk, hs], name)

HANDISH = ("LowerArm", "Wrist", "Index", "Middle", "Ring", "Pinky", "Thumb")
_hand_idx = {}
def hand_set(o):
    if o.name not in _hand_idx:
        hs = set()
        for v in o.data.vertices:
            if not v.groups:
                continue
            g = max(v.groups, key=lambda g: g.weight)
            if o.vertex_groups[g.group].name.startswith(HANDISH):
                hs.add(v.index)
        _hand_idx[o.name] = hs
    return _hand_idx[o.name]

def guitar_hits(g, body_objs, frames, action):
    """(torso/legs/head vertices inside the guitar volume, hand/forearm vertices inside it) — worst frame each."""
    wt, wh = 0, 0
    arm.animation_data.action = bpy.data.actions[action] if action else None
    for f in frames:
        scene.frame_set(f)
        bpy.context.view_layer.update()
        gi = g.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.inverted()
        nt = nh = 0
        for o in body_objs:
            hs = hand_set(o)
            for i, v in enumerate(eval_verts(o)):
                p = gi @ v
                if abs(p.z) > TH * 0.5:
                    continue
                in_body = (p.x ** 2 + p.y ** 2) < (L * 0.17) ** 2 or ((p.x - L * 0.2) ** 2 + p.y ** 2) < (L * 0.13) ** 2
                in_neck = L * 0.25 < p.x < L * 0.87 and abs(p.y) < L * 0.035
                if in_body or in_neck:
                    if i in hs:
                        nh += 1
                    else:
                        nt += 1
        wt, wh = max(wt, nt), max(wh, nh)
    arm.animation_data.action = None
    return wt, wh

body_objs = [p for p in parts if "__body__" in p.name or "__legs__" in p.name or "__head__" in p.name or "__hairtop__" in p.name]
hip = wpos(arm, "Hips")
chest = wpos(arm, "Chest")

# Front (playing): grid search over tilt, height and distance; keep only placements where nothing pokes in
# (torso and hands), then the lowest and closest of those.
gfront = make_guitar("item_guitar")
play_frames = list(range(0, int(bpy.data.actions["guitar"].frame_range[1]), 6))
base_front = Vector((hip.x, hip.y, hip.z + H * 0.07)) - lr * (L * 0.1)
def front_matrix(tilt, dz, d):
    R = RZ @ Matrix.Rotation(math.radians(-tilt), 4, "Y") @ Matrix.Rotation(math.radians(90), 4, "X")
    return Matrix.Translation(base_front + fwd * d + Vector((0, 0, H * dz))) @ R
best = None
for tilt in (15, 25, 35):
    for dz in (0.0, 0.02, 0.04, 0.06):
        for step in range(0, 20):
            d = H * (0.06 + 0.006 * step)
            gfront.parent = None
            gfront.matrix_world = front_matrix(tilt, dz, d)
            bpy.context.view_layer.update()
            parent_to_bone(gfront, "Chest")
            th, hh_ = guitar_hits(gfront, body_objs, play_frames, "guitar")
            if th == 0 and hh_ == 0:
                score = d * 10 + dz * 6
                print("GUITAR front tilt=%d dz=%.2f d=%.3f clear score=%.3f" % (tilt, dz, d, score))
                if best is None or score < best[0]:
                    best = (score, tilt, dz, d)
                break
if best is None:
    best = (0, 25, 0.06, H * 0.2)
_, tilt, dz, d = best
gfront.parent = None
gfront.matrix_world = front_matrix(tilt, dz, d)
bpy.context.view_layer.update()
parent_to_bone(gfront, "Chest")
best = (tilt, dz, d)
FIT["guitar_front"] = best
ITEMS.append(gfront.name)

# Back (carried): slung diagonally across the back, used whenever the guitar is equipped but not played.
gback = make_guitar("item_guitar_back")
R_back = RZ @ Matrix.Rotation(math.radians(180), 4, "Z") @ Matrix.Rotation(math.radians(55), 4, "Y") @ Matrix.Rotation(math.radians(90), 4, "X")
base_back = Vector((chest.x, chest.y, (chest.z + hip.z) / 2)) + lr * (L * 0.12)
others = [a for a in ANIMS if a not in ("guitar",)]
best = None
for step in range(0, 26):
    d = H * (0.05 + 0.006 * step)
    gback.parent = None
    gback.matrix_world = Matrix.Translation(base_back - fwd * d) @ R_back
    bpy.context.view_layer.update()
    parent_to_bone(gback, "Chest")
    th = hh_ = 0
    for an in others:
        fr = bpy.data.actions[an].frame_range
        a1, a2 = guitar_hits(gback, body_objs, list(range(0, int(fr[1]), 10)), an)
        th, hh_ = max(th, a1), max(hh_, a2)
    print("GUITAR back d=%.3f torso=%d hands=%d" % (d, th, hh_))
    score = th * 50 + hh_ + d * 20
    if best is None or score < best[0]:
        best = (score, d, th, hh_)
    if th == 0 and hh_ == 0:
        break
_, d, th, hh_ = best
gback.parent = None
gback.matrix_world = Matrix.Translation(base_back - fwd * d) @ R_back
bpy.context.view_layer.update()
parent_to_bone(gback, "Chest")
FIT["guitar_back"] = best
ITEMS.append(gback.name)
print("FIT", FIT)

# Hats and headphones vs. the head across every emote: head/hair vertices inside the hat volume (none expected:
# items move with the Head bone, the head is rigid on it) — checked once at rest per head.
for outfit in OUTFITS:
    for kind in ("beanie", "headphones", "shades"):
        it = bpy.data.objects[f"item_{kind}__{outfit}"]
        bvh = BVHTree.FromObject(it, bpy.context.evaluated_depsgraph_get())
        hm = next(p for p in parts if p.name.startswith(outfit + "__head__"))
        n = 0
        for v in eval_verts(hm):
            loc, nrm, idx, dist = bvh.find_nearest(v)
            if loc is not None and dist is not None and dist < 0.004:
                n += 1
        print("CONTACT", outfit, kind, n)

# ------------------------------------------------------------------ preview renders
if RENDER:
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    scene.camera = cam
    cam.data.lens = 50
    target = Vector((hip.x, hip.y, H * 0.55))
    cam.location = target + fwd * (H * 2.6) + Vector((0, 0, H * 0.1))
    CLOSE = os.environ.get("CLOSE")
    d = (target - cam.location)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.light_add(type="SUN")
    bpy.context.active_object.rotation_euler = (math.radians(50), math.radians(10), yaw + math.radians(30))
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x, scene.render.resolution_y = 360, 480
    scene.render.film_transparent = False
    shots = argv[3].split(",") if len(argv) > 3 else ["idle:0", "guitar:20", "guitar:70", "bow:30", "dance:40"]
    o0 = OUTFITS[1 if GENDER == "men" else 0]
    vis = {"guitar": ["item_guitar", f"item_beanie__{o0}"], "idle": [f"item_headphones__{o0}", "item_guitar_back"], "bow": [f"item_shades__{o0}", "item_guitar_back"], "dance": [f"item_shades__{o0}", "item_guitar_back"], "victory": [f"item_headphones__{o0}", "item_guitar_back"]}
    for shot in shots:
        an, fr = shot.split(":")
        arm.animation_data.action = bpy.data.actions[an]
        scene.frame_set(int(fr))
        for p in parts:
            p.hide_render = not p.name.startswith(o0 + "__") or ("__hairtop__" in p.name and any(f"item_beanie__{o0}" in x for x in vis.get(an, [])))
        for it in ITEMS:
            bpy.data.objects[it].hide_render = it not in vis.get(an, [])
        if CLOSE:
            bpy.context.view_layer.update()
            tgt = arm.matrix_world @ arm.pose.bones[CLOSE].head
            cam.location = tgt + fwd * 0.9 + lr * 0.25 + Vector((0, 0, 0.15))
            cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(ROOT, "renders", f"{GENDER}_{an}_{fr}{'_' + CLOSE if CLOSE else ''}.png")
        bpy.ops.render.render(write_still=True)
    arm.animation_data.action = None
    for it in ITEMS:
        bpy.data.objects[it].hide_render = False
    for p in parts:
        p.hide_render = False
    bpy.data.objects.remove(cam, do_unlink=True)

# ------------------------------------------------------------------ export
for a2 in list(bpy.data.actions):
    if a2.name not in ANIMS:
        bpy.data.actions.remove(a2)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_animation_mode="ACTIONS", export_force_sampling=True,
                          export_frame_step=1, export_skins=True, export_yup=True, export_apply=False, export_cameras=False, export_lights=False)
print("EXPORTED", OUT)
