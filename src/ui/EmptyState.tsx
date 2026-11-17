// An empty state in the studio look (redesign 2026-11): a Paper drawing on a tinted circle, one sentence, one primary
// action and, optionally, a text link. Callers render it only in the studio look; the classic look keeps its own line.
import { PaperGlyph, type GlyphKind } from './Glyph';

export function EmptyState({ glyph, text, action, link, tint = 'var(--ss-tint)', data }: { glyph: GlyphKind; text: string; action?: { label: string; onClick: () => void }; link?: { label: string; onClick: () => void }; tint?: string; data?: string }) {
  return (
    <div className="st-empty" data-empty={data}>
      <span className="st-em-art" style={{ background: tint }} aria-hidden="true">
        <PaperGlyph kind={glyph} width={64} height={58} />
      </span>
      <p className="st-em-text" dir="auto">
        {text}
      </p>
      {action && (
        <button type="button" className="btn primary st-em-btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
      {link && (
        <button type="button" className="link st-em-link" onClick={link.onClick}>
          {link.label}
        </button>
      )}
    </div>
  );
}
