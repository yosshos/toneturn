// QR code for joining a room (spec I): scanning it opens the app on the room's join link.

import { useEffect, useState } from 'react';

export function RoomQr({ link, label, size = 180 }: { link: string; label: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void import('qrcode')
      .then((q) => q.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1E1033', light: '#ffffff' } }))
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [link]);
  if (!svg) return null;
  return <div className="room-qr" role="img" aria-label={label} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
