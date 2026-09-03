# NutriTrack — ChatGPT version (no API key)

This version removes the OpenAI API/Cloudflare Worker integration.

## How Smart Add works

1. Type what you ate in NutriTrack.
2. Tap **פתח ב‑ChatGPT**.
3. NutriTrack copies a nutrition-analysis prompt to the clipboard and opens ChatGPT.
4. Paste/send it in ChatGPT using your existing signed-in ChatGPT account.
5. ChatGPT is instructed to include a small JSON block in its answer.
6. Copy that JSON/result.
7. Return to NutriTrack → **הדבק תוצאה** → paste → **ייבא ליומן**.
8. Review the preview and add it to the selected day.

There is no OpenAI API key in this project and no separate API integration.

## Important limitation

A normal PWA cannot silently use your ChatGPT Plus session as an API or automatically read a ChatGPT answer back from chatgpt.com. Browser security and ChatGPT authentication keep the two apps separate. Therefore the handoff back to NutriTrack requires copy/paste.

## Publishing

Replace the files in your existing GitHub Pages NutriTrack repository with the contents of this folder. No Cloudflare Worker is needed.
