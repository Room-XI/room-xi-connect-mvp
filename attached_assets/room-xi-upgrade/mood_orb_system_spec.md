# Mood Orb System Specification

- Always-on 7-day gradient that shows all hues: Cold, Stormy, Foggy, Clear, Breezy, Aurora.
- Ratios = count/7. Opacity = clamp(0.3 + ratio, 0.3, 0.9). Blending = screen, pre baked textures.
- Slow settle tween 1 to 2 minutes after each check in. Breathing motion 8 seconds. Reduced motion honors OS setting, instant or 2 second settle.
- Streak halo 0 to 7. Ambient background mirrors dominant hue at 25 percent.
- Weekly snapshot every Sunday at 08 00 America/Edmonton. 30 day time lapse reflection.
- Accessibility: high contrast ring, pattern overlays (dots warm, lines cool), color key drawer.
- Privacy: weekly aggregates only on UI; no per day visualization. DP noise applied to any exported aggregates.
