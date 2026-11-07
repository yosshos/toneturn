// Privacy & friends (SPEC-SOCIAL §2 and §8): one preset — Open / Friends only (default) / Private — plus advanced
// overrides, and young-player mode from the year of birth (under 13; 16 in the EU) which caps everything. Pure.
// The server enforces the same rules (blocks, who may challenge / nudge / see the photo) — this is the client side.

export type Preset = 'open' | 'friends' | 'private';
export type Who = 'everyone' | 'friends' | 'none';

export interface Privacy {
  preset: Preset;
  /** Advanced overrides (absent = what the preset says). */
  photo?: Who;
  onBoards?: 'nickname' | 'anonymous';
  friendRequests?: 'everyone' | 'code' | 'none';
  challenges?: Who;
  nudges?: 'friends' | 'none';
  quickMessages?: Who;
  dontDisturb?: boolean;
  notify?: { challenges?: boolean; requests?: boolean; nudges?: boolean; duets?: boolean };
}

export interface Effective {
  photo: Who;
  onBoards: 'nickname' | 'anonymous';
  friendRequests: 'everyone' | 'code' | 'none';
  challenges: Who;
  nudges: 'friends' | 'none';
  quickMessages: Who;
  dontDisturb: boolean;
  /** Young-player mode: no photo upload, no external share sheet. */
  young: boolean;
  canUploadPhoto: boolean;
  canShareOutside: boolean;
}

const PRESETS: Record<Preset, Omit<Effective, 'young' | 'canUploadPhoto' | 'canShareOutside' | 'dontDisturb'>> = {
  open: { photo: 'everyone', onBoards: 'nickname', friendRequests: 'everyone', challenges: 'everyone', nudges: 'friends', quickMessages: 'everyone' },
  friends: { photo: 'friends', onBoards: 'nickname', friendRequests: 'everyone', challenges: 'friends', nudges: 'friends', quickMessages: 'friends' },
  private: { photo: 'none', onBoards: 'anonymous', friendRequests: 'code', challenges: 'none', nudges: 'none', quickMessages: 'none' },
};

export const DEFAULT_PRIVACY: Privacy = { preset: 'friends' };

/** Age from a year of birth (end-of-year rounding: the youngest the player can be). */
export const ageOf = (birthYear: number | null | undefined, now = new Date()) => (birthYear ? now.getFullYear() - birthYear - 1 : null);
/** Under 13 (or 16 in the EU) → young-player mode. Unknown age → not young (the gate asks before any social action). */
export const isYoung = (birthYear: number | null | undefined, eu = false, now = new Date()) => {
  const a = ageOf(birthYear, now);
  return a !== null && a < (eu ? 16 : 13);
};

const rank: Record<Who, number> = { none: 0, friends: 1, everyone: 2 };
const atMost = (w: Who, cap: Who): Who => (rank[w] <= rank[cap] ? w : cap);

/** The settings in force: preset + overrides, then the young-player caps. */
export function effectivePrivacy(p: Privacy | undefined, birthYear?: number | null, eu = false, now = new Date()): Effective {
  const base = PRESETS[p?.preset ?? 'friends'];
  const young = isYoung(birthYear, eu, now);
  const e: Effective = {
    photo: p?.photo ?? base.photo,
    onBoards: p?.onBoards ?? base.onBoards,
    friendRequests: p?.friendRequests ?? base.friendRequests,
    challenges: p?.challenges ?? base.challenges,
    nudges: p?.nudges ?? base.nudges,
    quickMessages: p?.quickMessages ?? base.quickMessages,
    dontDisturb: p?.dontDisturb ?? true,
    young,
    canUploadPhoto: !young,
    canShareOutside: !young,
  };
  if (young) {
    // SPEC-SOCIAL §8: no photo, friends-only contact, requests by code only.
    e.photo = 'none';
    e.friendRequests = e.friendRequests === 'none' ? 'none' : 'code';
    e.challenges = atMost(e.challenges, 'friends');
    e.quickMessages = atMost(e.quickMessages, 'friends');
  }
  return e;
}
