# Image Pattern Analysis Tool - Version History

## Version 2.0.1 (Current)
**Release Date:** 2025-08-07

### 🔧 **Bug Fixes**
- **Fixed blue resize handles visibility** in rotated images
- **Fixed coordinate system mismatch** between handle generation and drawing
- **Enhanced debugging** with detailed console logging for handle interactions

### ✨ **New Features**
- **Visual feedback for active handles**: Active handles show yellow with red border
- **Smart resize cursors**: Directional cursors (↖️↗️↙️↘️⬆️⬇️⬅️➡️) based on handle position
- **Cursor pointer feedback**: Pointer cursor when hovering over handles
- **Enhanced handle interaction**: Better visual and cursor feedback during resize operations

### 📍 **Version Display**
- **Web interface**: Version 2.0.1 shown in top-right header
- **Browser title**: Dynamic version in page title
- **Console logging**: Version info displayed on app initialization
- **Batch files**: DOS mode shows version 2.0.1 in all launchers

---

## Version 1.3.1 (Previous)
**Features:**
- Streamlined layout with left/right canvas panels
- Enhanced drag & drop support
- Clipboard support (Ctrl+C/Ctrl+V)
- Canvas upload functionality
- Auto-detection of rectangular patterns
- Manual rectangle drawing tools
- Scale calibration system
- Area and perimeter calculations
- Results panel with numbered shapes
- Dark theme with blue accents

---

## Technical Details

### **File Structure**
- `index.html` - Main application entry point
- `app.js` - Core application logic (v1.3.2)
- `styles.css` - UI styling and themes
- `calculator.js` - Measurement calculations
- `canvas-tools.js` - Drawing and shape tools
- `image-processor.js` - Image processing utilities

### **Supported Formats**
- **Images**: JPG, GIF only
- **Max Size**: 10MB
- **Upload Methods**: Drag & drop, clipboard paste, file browser

### **Browser Compatibility**
- Modern browsers with HTML5 Canvas support
- File API support required
- Clipboard API support for paste functionality
