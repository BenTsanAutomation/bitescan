#!/bin/bash
# Generate app icons from SVG
# Requires: imagemagick (sudo apt install imagemagick)

cd "$(dirname "$0")"

# Main icon (1024x1024)
convert -background none icon.svg -resize 1024x1024 icon.png

# Adaptive icon for Android (192x192)
convert icon.png -resize 192x192 adaptive-icon.png

# Favicon (48x48)
convert icon.png -resize 48x48 favicon.png

# Splash icon (200x200)
convert icon.png -resize 200x200 splash-icon.png

echo "✅ Icons generated!"
ls -la *.png
