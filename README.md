# Patra – AI Resume Builder

HTML + CSS + JavaScript project (no install, no build step).

## Kaise chalayein
1. ZIP ko extract karein.
2. `index.html` ko Chrome / Edge me double-click karke kholein.
3. Details bharein, template chunein, **Download PDF** dabayein aur "Save as PDF" select karein.

## Features
- Live preview, 3 templates (Classic, Modern, Sidebar) + colour picker
- AI summary writer, bullet-point improver, skill suggestions
- ATS score + job-description keyword match
- Auto-save (browser localStorage), JSON export/import
- Optional: Anthropic API key daalne par text Claude likhta hai (key sirf aapke browser me rehti hai)

## Files
- `index.html` – page structure
- `css/style.css` – design + resume templates + print styles
- `js/ai.js` – AI engine (offline rules + optional Claude API)
- `js/app.js` – editor, preview, buttons
