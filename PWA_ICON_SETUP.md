# PWA Icon Setup Instructions

The PWA requires two icon files in the `/public` directory:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

## Temporary Solution
For now, you can:
1. Copy the existing `favicon.ico` and rename it, or
2. Create simple icons using an online tool like:
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/

## Design Guidelines
- Use the HomeKart brand colors:
  - Primary: #5dd9c1 (vibrant cyan/teal)
  - Background: #1a1f2e (dark blue-gray)
- Include a house/building icon or "HK" monogram
- Keep it simple and recognizable at small sizes

## Quick Command (if you have ImageMagick installed)
```bash
# Convert favicon to 192x192
magick convert public/favicon.ico -resize 192x192 public/icon-192.png

# Convert favicon to 512x512
magick convert public/favicon.ico -resize 512x512 public/icon-512.png
```

For now, the app will work without these icons, but they're recommended for a complete PWA experience.
