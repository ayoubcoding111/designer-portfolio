# Designer Portfolio (Mahdi, graphic designer)

A one-page portfolio site. It's plain HTML, CSS and JavaScript with GSAP, ScrollTrigger and Lenis, which ship in `vendor/`. There's no build step, so upload the folder to any static host and it works.

The pencil sketch, the trees, the stamps and the textures are drawn in code. The project and hero pictures are free-licensed **stand-in photos** in `images/` (credited in `CREDITS.md`) to swap for real work (see below).

## Run it locally

Serve this folder with any static server, for example:

```bash
npx serve .
```

Then open the address it prints. Any static server works, and opening `index.html` directly works too.

## What's on the page

| Part | What it does |
|---|---|
| Loader | A stamp is thrown in and bounces across, and each orange column lifts as it passes. Click, scroll or any key skips it. It plays once per visit; add `?intro` to the URL to see it again. |
| Hero | Three lines rise in. Three picture slots take turns changing and pause while you hover one. |
| Intro | A pencil sketch draws itself as you scroll. Each caption appears once its object is drawn. |
| Work | Cards stack as you scroll. Each picture wipes up as it enters, and a "View project" label follows the cursor. |
| The details | The word arrives spread out and closes up. Drag any letter sideways (or use the arrow keys) to kern it. Each pair can close only until the two glyph shapes would touch, so letters never run into each other. "Scramble it" and "Put it back" animate. |
| Footer | A small physics toy: stamps fall onto the words and stay inside the footer. Your cursor pushes them, you can grab and throw one, and a click flicks one up. On phones, tilting the device changes gravity. Clicking the email copies it. |
| System view | Press **S**, the eye button (bottom left) or "Show the guides". It shows the grid, the column numbers and the type guides. The column numbers sit right under the header and slide up with it, so they stay at the top of the screen when the header hides. Hovering any element outlines it (text is outlined around its letters) and shows its size, font and grid position; the outline stays on it while you scroll or drag. **Escape** closes it. |
| Language | EN / FR toggle in the header. English is the default; the choice is remembered. |

## Change the details

| What | Where |
|---|---|
| Name, location line, email, social links | `index.html` (header, menu, footer) and `js/i18n.js` |
| All visible text, English and French | `js/i18n.js` (`en` and `fr` blocks) |
| Clock time zone | `js/main.js`, search for `Africa/Algiers` |
| Colors, fonts, spacing | Top of `css/style.css` (`:root`) |
| The word in section 03 and its orange letter | `js/main.js`, search for `KW` |

The name **Mahdi**, the line **Based in Algeria**, the email **hello@mahdi.design** and the social links (`href="#"`) are placeholders.

## Swap a stand-in picture for real work

Each project card in `index.html` is one `<article class="card">`. Put the new picture in `images/`, change the `src` and `alt` of the card's `<img class="art">`, and point the link at the case study:

```html
<a class="card__img" href="/your-case-study" data-case>
  <img class="art" src="images/project-one.jpg" alt="Project One brand identity on a poster" loading="lazy" decoding="async">
</a>
```

Card pictures are about 1800 px wide; the frame crops them to fill (`object-fit: cover`), and `style="object-position: center 38%"` moves the crop. Edit the title in `index.html` and the one-line description in `js/i18n.js` (`d1` to `d3`, English and French).

The three hero slots cycle through the six photos in `HERO_PICS` at the top of the hero code in `js/main.js` (about 720 × 500 px each). `data-slot="4,0,2"` on each slot in `index.html` sets which photos it shows, in order.

Update `CREDITS.md` when you swap a picture.

## Notes

- Fonts: Geist and Source Code Pro from Google Fonts, both open-licensed (SIL OFL).
- Libraries: GSAP and ScrollTrigger (GreenSock standard license, free), Lenis (MIT).
- `prefers-reduced-motion` is respected. It turns off the loader, smooth scroll and the scroll-driven effects.
- Adding `?still` to the URL freezes the motion for screenshots.
- The browser's own scrollbar is hidden; the thin meter on the right edge shows the position instead. A classic Windows scrollbar takes width out of the page but not out of the width unit the layout uses, so the grid would drift off its column lines.
- Performance: every scroll-driven effect reads cached positions instead of asking the browser for layout each frame, and the moving parts (picture wipes, the pen sketch, the stamps) animate on their own GPU layers.
- Tested in Chrome at 1440×900 (with and without a scrollbar, on an Intel UHD 620) and 390×844. Touch dragging and device tilt were not tested on a real phone.
