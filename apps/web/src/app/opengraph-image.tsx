import { ImageResponse } from 'next/og';

export const alt = 'Carvio – Quality used cars';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 90,
        color: 'white',
        background: 'linear-gradient(135deg,#0b1030,#1e1b6b 45%,#1d4ed8)',
      }}
    >
      <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -3 }}>Carvio</div>
      <div style={{ marginTop: 20, fontSize: 44, color: '#c7d2fe' }}>
        Inspected used cars. Transparent prices.
      </div>
    </div>,
    size,
  );
}
