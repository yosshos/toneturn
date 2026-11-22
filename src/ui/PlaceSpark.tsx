// The one sparkline beside a Practice place's title (SPEC-PROGRESS-CHARTS §7 phase 3): the daily snapshots on this
// device (storage/snapshots.ts), the last 30 days; nothing at all with fewer than 3 days of data.

import { useEffect, useState } from 'react';
import { loadSnapshots } from '../storage/snapshots';
import '../practice3.css';
import { placeSeries, sparkLabel, type SparkPlace } from '../engine/placeSpark';
import { localDay } from '../storage/progress';
import type { CourseId } from '../engine/courses';

export function PlaceSpark({ place, course, lang }: { place: SparkPlace; course: CourseId; lang: 'he' | 'en' }) {
  const [series, setSeries] = useState<number[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadSnapshots().then((s) => alive && setSeries(placeSeries(s, place, course, localDay(new Date()))));
    return () => {
      alive = false;
    };
  }, [place, course]);
  if (!series) return null;
  const w = 64;
  const h = 20;
  const max = Math.max(1, ...series);
  const min = Math.min(0, ...series);
  const pts = series.map((v, i) => `${((i / Math.max(1, series.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / Math.max(1e-9, max - min)) * (h - 4)).toFixed(1)}`).join(' ');
  const label = sparkLabel(place, series, lang);
  return (
    <span className="place-spark" role="img" aria-label={label} title={label} data-place-spark={place}>
      {/* the line reads left to right in both languages (time) */}
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <small>{label}</small>
    </span>
  );
}
