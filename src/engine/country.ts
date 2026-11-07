// Country for the profile flag (SPEC-SOCIAL §1.2): suggested from the device — time zone first, then the language's
// region — with no location permission and nothing sent anywhere. The player can change it or choose "no flag". Pure.

/** IANA time zone → ISO 3166-1 alpha-2 (the common zones; others fall back to the language region). */
const TZ_COUNTRY: Record<string, string> = {
  'Asia/Jerusalem': 'IL', 'Asia/Tel_Aviv': 'IL', 'Asia/Hebron': 'PS', 'Asia/Gaza': 'PS',
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Lisbon': 'PT', 'Europe/Madrid': 'ES', 'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE', 'Europe/Amsterdam': 'NL', 'Europe/Luxembourg': 'LU', 'Europe/Berlin': 'DE', 'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT', 'Europe/Rome': 'IT', 'Europe/Malta': 'MT', 'Europe/Copenhagen': 'DK', 'Europe/Oslo': 'NO',
  'Europe/Stockholm': 'SE', 'Europe/Helsinki': 'FI', 'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT',
  'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Bratislava': 'SK', 'Europe/Budapest': 'HU', 'Europe/Ljubljana': 'SI',
  'Europe/Zagreb': 'HR', 'Europe/Belgrade': 'RS', 'Europe/Sarajevo': 'BA', 'Europe/Skopje': 'MK', 'Europe/Tirane': 'AL',
  'Europe/Athens': 'GR', 'Europe/Sofia': 'BG', 'Europe/Bucharest': 'RO', 'Europe/Chisinau': 'MD', 'Europe/Kiev': 'UA',
  'Europe/Kyiv': 'UA', 'Europe/Minsk': 'BY', 'Europe/Moscow': 'RU', 'Europe/Istanbul': 'TR', 'Asia/Nicosia': 'CY',
  'Atlantic/Reykjavik': 'IS', 'Asia/Beirut': 'LB', 'Asia/Amman': 'JO', 'Asia/Damascus': 'SY', 'Asia/Baghdad': 'IQ',
  'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH', 'Asia/Kuwait': 'KW', 'Asia/Muscat': 'OM',
  'Asia/Tehran': 'IR', 'Asia/Baku': 'AZ', 'Asia/Tbilisi': 'GE', 'Asia/Yerevan': 'AM', 'Asia/Karachi': 'PK', 'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN', 'Asia/Dhaka': 'BD', 'Asia/Kathmandu': 'NP', 'Asia/Colombo': 'LK', 'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN', 'Asia/Jakarta': 'ID', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Singapore': 'SG', 'Asia/Manila': 'PH',
  'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW', 'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP',
  'Asia/Almaty': 'KZ', 'Asia/Tashkent': 'UZ', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Pacific/Auckland': 'NZ',
  'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN', 'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE', 'Africa/Addis_Ababa': 'ET', 'Africa/Johannesburg': 'ZA',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Phoenix': 'US', 'America/Los_Angeles': 'US',
  'America/Anchorage': 'US', 'Pacific/Honolulu': 'US', 'America/Detroit': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/Montreal': 'CA', 'America/Mexico_City': 'MX',
  'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL', 'America/Argentina/Buenos_Aires': 'AR',
  'America/Buenos_Aires': 'AR', 'America/Sao_Paulo': 'BR', 'America/Montevideo': 'UY', 'America/Caracas': 'VE',
  'America/Panama': 'PA', 'America/Costa_Rica': 'CR', 'America/Havana': 'CU', 'America/Puerto_Rico': 'PR',
};

/** Language tags whose region is a good guess when the time zone is unknown (en-US → US); a bare "he" → IL. */
const LANG_DEFAULT: Record<string, string> = { he: 'IL', iw: 'IL', ar: 'EG', ru: 'RU', uk: 'UA', fr: 'FR', de: 'DE', es: 'ES', it: 'IT', pt: 'BR', ja: 'JP', ko: 'KR', zh: 'CN', nl: 'NL', pl: 'PL', tr: 'TR', el: 'GR' };

export function guessCountry(tz: string | undefined, languages: readonly string[] = []): string | null {
  if (tz && TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  for (const l of languages) {
    const m = /^[a-z]{2,3}[-_]([A-Z]{2})\b/i.exec(l);
    if (m) return m[1].toUpperCase();
  }
  for (const l of languages) {
    const base = l.slice(0, 2).toLowerCase();
    if (LANG_DEFAULT[base]) return LANG_DEFAULT[base];
  }
  return null;
}

/** The device's guess (browser only). */
export function deviceCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return guessCountry(tz, typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []);
  } catch {
    return null;
  }
}

/** All ISO 3166-1 alpha-2 codes that have a flag (and a display name via Intl.DisplayNames). */
export const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(
    ' ',
  );

/** Country name in the UI language (Intl.DisplayNames; falls back to the code). */
export function countryName(code: string, lang: 'en' | 'he'): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
