// Classify browser capture / recognition failures into actionable codes.

import type { AccessError, AccessErrorCode } from '../game/adapters';

export interface EnvFacts {
  secure: boolean;
  embedded: boolean;
  /** document.permissionsPolicy / featurePolicy says microphone is allowed here (null = unknown). */
  policyAllowsMic: boolean | null;
  /** navigator.permissions state for 'microphone' (null = unknown). */
  micPermission: PermissionState | null;
}

export function classifyCaptureError(err: unknown, env: EnvFacts): AccessError {
  const name = (err as { name?: string })?.name ?? 'Error';
  const message = (err as { message?: string })?.message ?? String(err);
  const raw = `${name}: ${message}`;
  let code: AccessErrorCode = 'unknown';
  if (!env.secure) code = 'insecure-context';
  else if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    if (env.embedded && env.policyAllowsMic === false) code = 'iframe-policy';
    else if (/system/i.test(message)) code = 'os-blocked'; // Chrome: "Permission denied by system"
    else code = 'permission-denied';
  } else if (name === 'NotSupportedError' && env.micPermission !== 'granted') {
    // Seen when an automated/embedded browser auto-dismisses the permission prompt.
    code = 'permission-denied';
  } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') code = 'no-device';
  else if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') code = 'device-busy';
  else if (name === 'TypeError') code = env.secure ? 'unsupported' : 'insecure-context';
  return { stage: 'capture', code, raw };
}

/**
 * Map a SpeechRecognitionErrorEvent.error. `captureOk` tells whether getUserMedia
 * succeeded for this origin; a recognizer 'not-allowed' after a working capture
 * means the speech service (not the microphone) refused.
 */
export function classifyRecognitionError(error: string, message: string, env: EnvFacts, captureOk: boolean): AccessError {
  const raw = message ? `${error}: ${message}` : error;
  let code: AccessErrorCode = 'unknown';
  switch (error) {
    case 'not-allowed':
      if (!env.secure) code = 'insecure-context';
      else if (env.embedded && env.policyAllowsMic === false) code = 'iframe-policy';
      else code = captureOk ? 'service-denied' : 'permission-denied';
      break;
    case 'service-not-allowed':
      code = 'service-denied';
      break;
    case 'audio-capture':
      code = 'no-device';
      break;
    case 'network':
      code = 'network';
      break;
    case 'language-not-supported':
      code = 'language-unsupported';
      break;
  }
  return { stage: 'recognition', code, raw };
}

export function detectBrowser(ua = navigator.userAgent): { browser: string; version: string; os: string } {
  const brands = (navigator as unknown as { userAgentData?: { brands: { brand: string; version: string }[]; platform: string } }).userAgentData;
  let browser = 'Unknown';
  let version = '';
  const m =
    /Edg\/([\d.]+)/.exec(ua) ? ['Edge', /Edg\/([\d.]+)/.exec(ua)![1]] :
    /OPR\/([\d.]+)/.exec(ua) ? ['Opera', /OPR\/([\d.]+)/.exec(ua)![1]] :
    /SamsungBrowser\/([\d.]+)/.exec(ua) ? ['Samsung Internet', /SamsungBrowser\/([\d.]+)/.exec(ua)![1]] :
    /Firefox\/([\d.]+)/.exec(ua) ? ['Firefox', /Firefox\/([\d.]+)/.exec(ua)![1]] :
    /Chrome\/([\d.]+)/.exec(ua) ? ['Chrome', /Chrome\/([\d.]+)/.exec(ua)![1]] :
    /Version\/([\d.]+).*Safari/.exec(ua) ? ['Safari', /Version\/([\d.]+)/.exec(ua)![1]] : null;
  if (m) [browser, version] = m;
  const os = brands?.platform ||
    (/Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown');
  return { browser, version, os };
}

export async function gatherEnv(): Promise<EnvFacts> {
  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch {
    embedded = true; // cross-origin parent
  }
  let policyAllowsMic: boolean | null = null;
  const doc = document as unknown as {
    permissionsPolicy?: { allowsFeature(f: string): boolean };
    featurePolicy?: { allowsFeature(f: string): boolean };
  };
  const pol = doc.permissionsPolicy ?? doc.featurePolicy;
  if (pol) {
    try {
      policyAllowsMic = pol.allowsFeature('microphone');
    } catch {
      policyAllowsMic = null;
    }
  }
  let micPermission: PermissionState | null = null;
  try {
    const st = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    micPermission = st?.state ?? null;
  } catch {
    micPermission = null;
  }
  return { secure: window.isSecureContext, embedded, policyAllowsMic, micPermission };
}
