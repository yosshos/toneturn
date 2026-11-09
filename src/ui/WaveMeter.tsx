// The v2 progress meter (0.61, SPEC-REDESIGN): waveform bars that fill, instead of a smooth bar.
export function WaveMeter({ value, bars = 22, height = 22, className = '' }: { value: number; bars?: number; height?: number; className?: string }) {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * bars);
  return (
    <svg className={`wave-meter ${className}`} viewBox={`0 0 ${bars * 10} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => {
        const v = 0.35 + 0.6 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
        const h = Math.max(4, v * height);
        return <rect key={i} x={i * 10 + 1.5} y={(height - h) / 2} width={7} height={h} rx={3.5} className={i < filled ? 'on' : 'off'} />;
      })}
    </svg>
  );
}
