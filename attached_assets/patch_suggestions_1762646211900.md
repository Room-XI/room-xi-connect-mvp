# Patch Suggestions

## 1) Explore Gate Hook (Edmonton 08:00 with 2-min drift)

```ts
// src/hooks/useExploreGate.ts
import { DateTime } from 'luxon';
import api from '@/lib/api';

export function useExploreGate() {
  async function hasTodayCheckIn(): Promise<boolean> {
    const res = await api.checkins.summary('7d');
    const zone = 'America/Edmonton';
    const now = DateTime.now().setZone(zone);
    const today = now.toISODate();
    return !!res.data?.today?.hasCheckIn;
  }

  function isAfterGate(): boolean {
    const zone = 'America/Edmonton';
    const now = DateTime.now().setZone(zone);
    const gate = now.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
    const driftEnd = gate.plus({ minutes: 2 });
    return now >= gate && now <= driftEnd ? true : now > driftEnd;
  }

  return { hasTodayCheckIn, isAfterGate };
}
```

Use in `routes/Explore.tsx`:

```tsx
const { hasTodayCheckIn, isAfterGate } = useExploreGate();
useEffect(() => {
  (async () => {
    if (isAfterGate() && !(await hasTodayCheckIn())) {
      navigate('/checkin?gate=explore');
    }
  })();
}, []);
```

## 2) High-contrast CSS

```css
/* src/styles.css */
@media (prefers-contrast: more) {
  .mood-orb {
    outline: 2px solid rgba(0,0,0,0.35);
    box-shadow: 0 0 0 3px rgba(255,255,255,0.25) inset;
  }
  .mood-orb::after {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(circle, rgba(0,0,0,.15), rgba(255,255,255,.1));
    mix-blend-mode: overlay;
    pointer-events: none;
  }
}
```

## 3) Server-side H3 + Laplace

```ts
// server/geo.ts (Node/Express)
import h3 from 'h3-js';

function laplaceNoise(count: number, epsilon = 0.5) {
  const u = Math.random() - 0.5;
  return Math.round(count + (-Math.sign(u)) * Math.log(1 - 2*Math.abs(u)) / epsilon);
}

app.post('/api/geo/aggregate', requireConsent, async (req, res) => {
  const { checkins } = req.body as { checkins: Array<{ lat:number; lng:number; mood:string; user:string }> };
  const buckets = new Map<string, Record<string, number>>();
  for (const c of checkins) {
    const hex = h3.geoToH3(c.lat, c.lng, 8);
    const entry = buckets.get(hex) ?? { cold:0, stormy:0, foggy:0, clear:0, breezy:0, aurora:0, users:new Set<string>() };
    entry[c.mood]++; entry.users.add(c.user);
    buckets.set(hex, entry);
  }
  const out = [];
  for (const [hex, entry] of buckets) {
    const n = entry.users.size;
    if (n < 7) continue;
    const noisy = Object.fromEntries(Object.entries(entry).filter(([k]) => k!=='users').map(([m,v]) => [m, laplaceNoise(v as number, 0.5)]));
    out.push({ hex, ...noisy, n });
  }
  res.json({ data: out, privacy: { epsilon: 0.5, k: 7 } });
});
```

## 4) Pattern overlays in Orb

Inside `MoodOrb.tsx` draw loop, after gradient layers, overlay textures per hue when `showPatterns`:

```ts
function overlayPattern(ctx: CanvasRenderingContext2D, hue: string, ratio: number) {
  if (ratio <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.08 + ratio * 0.12;
  // dots for warm, lines for cool
  if (['aurora','breezy','clear'].includes(hue)) {
    // lines
    for (let y=0; y<height; y+=8) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke();
    }
  } else {
    // dots
    for (let y=4; y<height; y+=10) for (let x=4; x<width; x+=10) { ctx.fillRect(x,y,1,1); }
  }
  ctx.restore();
}
```

