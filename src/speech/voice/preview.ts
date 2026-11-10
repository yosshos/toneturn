import { pc, spokenNote, type Naming } from '../../engine/pitch';

/** The Settings voice preview (pre-recorded in both namings). */
export const previewText = (nm: Naming) => `Listen. In ${spokenNote(pc('Eb'), nm, 'en')} major, ${spokenNote(pc('Bb'), nm, 'en')} is degree five.`;
