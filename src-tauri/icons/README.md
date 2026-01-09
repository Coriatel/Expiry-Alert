# App Icons

## Required Icons for Tauri

To build the application, you need to provide icons in the following formats:

### Required Files:
- `32x32.png` - Small icon
- `128x128.png` - Medium icon
- `128x128@2x.png` - Retina medium icon
- `icon.icns` - macOS icon (if building for Mac)
- `icon.ico` - Windows icon

### How to Generate Icons:

#### Option 1: Use Tauri Icon Generator (Recommended)

```bash
npm install --save-dev @tauri-apps/cli

# Create a 1024x1024 PNG image called "app-icon.png"
# Then run:
npx tauri icon path/to/app-icon.png
```

This will automatically generate all required icon sizes.

#### Option 2: Manual Creation

1. Create a high-resolution icon (1024x1024 or 512x512)
2. Use an online tool like:
   - https://www.iconsgenerator.com/
   - https://icon.kitchen/
   - https://redketchup.io/icon-editor

3. Generate all required sizes
4. Place them in this `icons/` folder

#### Option 3: Use Placeholder

For development, you can use placeholder icons. The app will still work but won't have a custom icon.

### Icon Design Tips:

- Use simple, recognizable imagery
- Consider medical/laboratory themes (e.g., flask, test tube, calendar)
- Ensure good contrast and visibility at small sizes
- Use a transparent background (PNG)
- Icon should look good on both light and dark backgrounds

### Example Icon Ideas for This App:
- 🧪 Test tube with calendar
- 📅 Calendar with alert icon
- 🔬 Microscope or laboratory flask
- ⏰ Clock/timer with medical symbol
