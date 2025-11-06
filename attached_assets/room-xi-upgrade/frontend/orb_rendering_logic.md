# Mood Orb Rendering Logic

Mapping
- Hues: Cold, Stormy, Foggy, Clear, Breezy, Aurora
- Ratio = count/7, Opacity = clamp(0.3 + ratio, 0.3, 0.9)
- Blend: screen, pre baked radial textures per hue

Animation
- Breathing 8s sinus scale 0.98 to 1.02
- Slow settle 10 to 12 minutes fade between states after check in
- Reduced motion instant settle or 2 minutes

Accessibility
- High contrast outline ring, pattern overlays, color key link
