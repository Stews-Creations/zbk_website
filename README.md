# ZBK showcase

An independent Astro website for Zombies Build Kit: map experiences, contextual YouTube videos, social channels, release links, and an on-site builder guide. The standalone repository is [Stews-Creations/zbk_website](https://github.com/Stews-Creations/zbk_website). GitHub Pages deployment is available through the included workflow.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Astro. For a production preview, run `npm run build` followed by `npm run preview`.

Astro dev, check, sync, build, and preview use separate Vite dependency caches, so validation and builds do not interrupt a running dev server's 3D model loading. Check and sync also use Vite's serve mode internally, so the cache is selected by the Astro command. If a model or its runtime cannot load, the viewer suggests reloading and keeps the screenshots available.

## Content ownership

External navigation opens in a new tab; internal routes and anchors stay in the current tab. Video previews still open the on-site player, with external YouTube links opening separately.

| Location | Responsibility |
| --- | --- |
| [src/pages](src/pages) | Homepage, map showcases, downloads, builder guide, tutorials, Connect, and 404 |
| [src/data/site.ts](src/data/site.ts) | Base-aware URLs and curated video records |
| [src/data/releases.ts](src/data/releases.ts) | Minecraft compatibility and GitHub release listings |
| [src/components](src/components) | Responsive screenshots, 3D viewers, video previews, and download buttons |
| [src/layouts/Layout.astro](src/layouts/Layout.astro) | Navigation, metadata, footer, and video dialog |
| [src/styles/global.css](src/styles/global.css) | Shared visual design and mobile layout |
| [src/scripts/site.ts](src/scripts/site.ts) | Motion, mobile menu, video dialog, filters, and command copying |
| [src/scripts/model-runtime.ts](src/scripts/model-runtime.ts) | Three.js model loading, lighting, orbit controls, and resource cleanup |
| [public/images](public/images) | Optimized versions of the supplied in-game screenshots |
| [public/models](public/models) | Self-contained optimized GLBs and generated conversion reports |

The site targets Minecraft Java Edition 26.2. Downloads links to the map, datapack, and resource pack GitHub release listings configured in [src/data/releases.ts](src/data/releases.ts). Buttons say "View releases" rather than promising a direct asset or an unverified version. Availability and package details live in the release notes.

Der Eisendrache is in development. Nacht has its own showcase and world download panel. Map and starter world archives include their resource pack; structures are included in the datapack. The guide separates bundled-world installation from installing the standalone datapack and resource pack in a custom world. When Der Eisendrache releases, update its page status and replace the development-only row in Downloads with a world download panel.

Both supplied YouTube IDs are configured. Nacht starts at the beginning (0:00). Clicking a preview opens a privacy-enhanced YouTube embed; the original platform link remains available if embedding is blocked. No iframe or third-party player is loaded before a visitor chooses to play. Local screenshot posters are map previews, not claimed frames from the videos.

Verified profile links live on the Connect page; no API tokens or invented videos are included. The latest YouTube Short refreshes at build time as documented below; the full Nacht showcase stays curated. TikTok/Instagram integrations require profile identifiers and supported APIs or embeds. Never put private API tokens into browser code.

## Visual assets and motion

The footer uses the navigation bar's compact branding, horizontal links, and typography, with matching page gutters and a full-width line above the footer. Footer links and the motion control align with the bottom of the brand. Links wrap on small screens; the fan-project notice stays on one line below and scrolls horizontally when space is limited.

Downloads uses dark gradients, subtle grid lines, and shaded panels to keep the release information readable. Its decorative layers do not capture input or add animation.

The seven screenshots supplied in `todo/screenshots` of the original datapack workspace were copied as responsive WebP assets at widths 800, 1600, and 2400 pixels. Copies are independent of that workspace; no runtime symlinks or parent-repository imports are used. To regenerate from the original screenshots:

```sh
node scripts/prepare-assets.mjs /absolute/path/to/screenshots
```

The site uses original map imagery and real exported Minecraft map models. The home hero has a static, dimmed castle screenshot behind the model without image parallax; other image sections retain pointer/scroll depth. All 3D viewers load automatically when visible on every screen size, including touch devices. Hidden carousel models wait until their slide is selected. There is no activation button; reduced-motion preferences still disable entrance animation. A footer control disables parallax; its preference is stored locally when browser storage is available. Core content and links remain usable without JavaScript. Fonts are packaged locally through Fontsource; no external font requests are required.

The home hero is a manual three-slide carousel: Der Eisendrache, Nacht der Untoten, and Build your own. The Build your own hero badge reads "EARLY RELEASE" in the slide's green accent. The Nacht hero badge reads "COMPLETE"; it and the Der Eisendrache "IN DEVELOPMENT" badge use the same colors as their section status badges. Both equal-sized side arrows stay visible at the viewport edges and wrap in either direction, without automatic advancement; the scroll-to-explore link stays available. Three named buttons along the bottom jump directly to a slide and highlight the active selection. Selecting a map slide loads its 3D viewer on demand. Inactive slides are hidden from keyboard and assistive-technology navigation, and returning preserves the model rotation. Each hero Explore button scrolls to its matching home-page section: #der-eisendrache, #nacht, or #build. Without JavaScript, the first slide and its Explore link remain usable.

## 3D model pipeline

The original `de.obj`, `de.mtl`, `nacht.obj`, `nacht.mtl`, and their shared `tex` folder are read-only inputs outside the website. Generated display copies use reproducible bounds and exclusions in [scripts/model-crops.json](scripts/model-crops.json). They are presentation dioramas, not complete downloadable worlds.

```sh
node --max-old-space-size=8192 scripts/prepare-models.mjs /absolute/path/to/model-directory
```

Add `de` or `nacht` as a final argument to regenerate only one model. The converter crops before export, packs the supplied block textures into an atlas, welds matching vertices, and applies Meshopt compression. It keeps hard block edges and uses nearest-neighbor texture magnification with mipmapped minification. The output has one textured material per map and embeds all textures; no MTL or texture-folder request is needed in the browser. Reports record the precise crop, triangle count, exclusions, and output size.

Der Eisendrache focuses on the castle and immediate approach. It omits deep geology, the technical backing below Y=180 in the centered export coordinates, and a detached outer pad. The user-identified temporary birch roof pillars are removed only inside X=81.9-93.1, Y=243.9-246.1, Z=-37.1 to -11.9; other birch geometry remains. Nacht focuses on the bunker and immediate defenses, excluding the separate lower eastern area and peripheral terrain. Crop boundaries remove entire crossing polygons; these are open display cutaways rather than watertight meshes.

Mineways omits faces hidden against solid blocks. Explicit `surfacePatches` in the crop configuration restore roof contact surfaces exposed by removing the temporary pillars, using the adjacent roof material and UV orientation. These patches affect the display copy only and are included in conversion reports.

Purple/magenta stained-glass materials and their pane edge materials are excluded from both display models because the owner's resource pack makes them invisible. The crop configuration is the source of truth for these exceptions. The original supplied OBJ, MTL, and texture files are never edited.

The viewer uses a warm directional key, cool fill, hemisphere ambient light, soft filtered self-shadows, and a subtle ground shadow. It renders on interaction, resize, and visibility changes rather than running a continuous animation loop. The shadow map is baked for the static scene. While the video dialog is open, model rendering, resizing, orbit input, and page parallax are suspended; canvases are hidden behind a static map-photo backdrop with blur baked into the image to reduce GPU compositing work. Each video selects its matching DE or Nacht photograph; `node scripts/prepare-video-backdrops.mjs` regenerates these assets without live CSS blur. The static backdrop and player use brief opacity-only entrance fades, disabled by reduced-motion settings; no animation continues during playback. Closing the player restores the current model view. Orbit limits prevent going underneath open cut surfaces. Viewers allow drag and arrow-key rotation only, with fixed responsive zoom and no bottom toolbar; wheel scrolling stays with the page. Der Eisendrache opens from the courtyard side; Nacht opens toward its front courtyard and blue pool. The textured model fades in after its first rendered frame, with reduced-motion preferences respected. The home hero keeps its static map screenshot behind each model. Three.js and its decoder are dynamically imported only when a viewer loads; the production build reports an expected large lazy 3D runtime chunk.

## Validate

```sh
npm run check
npm run build
npm run validate
npm run validate:models
```

The validator checks generated internal links, fragment IDs, asset references, page titles, one H1 per page, and documentation link targets. Test the map/video navigation, playback dialog close/Escape/focus behavior, mobile menu, motion control, and copy-command feedback in the browser after interaction changes. Verify layouts at mobile and desktop widths. Download buttons open the configured GitHub release listings; they do not imply that every package already has a published release.

## GitHub Pages deployment

1. Push tested website changes to `main` or `master` in the standalone repository.
2. In GitHub Settings > Pages, set the build source to GitHub Actions.
3. The included [Pages workflow](.github/workflows/pages.yml) checks and builds the site, then publishes `dist`. GitHub's Pages configuration supplies both origin and repository base path, including a custom domain if configured.

All internal routes, images, and the favicon go through the base-aware URL helper. To simulate repository hosting locally in PowerShell:

```powershell
$env:SITE_URL = 'https://example.github.io'
$env:BASE_PATH = '/zbk-showcase/'
npm run build
npm run validate
Remove-Item Env:SITE_URL
Remove-Item Env:BASE_PATH
```

The example origin is a test value, not a published website. Keep release ZIPs and video files outside the website repository; link to GitHub Release assets and video platforms instead.

## Credits and project status

Map screenshots and ZBK content are supplied by the project owner. Nacht der Untoten and Der Eisendrache originate from Call of Duty Zombies. The website identifies ZBK as an unofficial fan project, unaffiliated with Activision, Treyarch, Mojang, or Microsoft. Review asset licensing before a public release. Font packages include their own license notices.

## Automatic latest Short

`npm run build` and `npm run dev` refresh the newest Short from [MiniStew](https://www.youtube.com/@MiniStew/shorts) before starting. `npm run refresh:youtube` refreshes it manually. The generated [latest-short.json](src/data/latest-short.json) supplies every Shorts card and the hero link; Nacht remains the selected full video starting at 0:00. The refresh validates channel identity, the Shorts tab, and Latest ordering before accepting a video. It follows the channel's newest Short, regardless of map topic.

The GitHub Pages workflow also rebuilds hourly after the repository is published and Actions/Pages are enabled. GitHub schedules may be delayed or disabled after repository inactivity. This is build-time freshness, not a live lookup on every visitor request. The local preview changes only after a new build. No API key or third-party proxy is used: the parser reads YouTube's public Shorts page, whose format may change. Local failures warn and preserve the last verified video; CI failures stop deployment so the previous site remains online. Run `npm run test:youtube` for parser checks.

## Connect page

The field guide shows the map-building flow as left-aligned numbered steps with downward arrows at every screen size.

The field guide ends with a Discord help link using the same community invite as the Connect page.

The main Connect navigation opens `/connect/`, a MiniStew and Big_Stew community/contact page with direct YouTube, Instagram, TikTok, and Discord links supplied by the owner. Discord is the contact destination; there is no nonfunctional form or invented email address. The MiniStew and Big_Stew developer portraits come from the supplied screenshots and the stew-bowl logo from the repository manager assets, copied into [public/images](public/images). The homepage links to the social cards at `/connect/#socials` for more videos and updates.

Transparent character cutouts derived from the supplied portraits use the `*-cutout.png` assets; originals are retained. Cutouts sit directly on the page with soft light and shadows, in separate columns from the copy so they do not cover text.

Connect uses a compact two-person profile layout, direct descriptive copy, and locally hosted YouTube, Instagram, TikTok, and Discord SVG brand icons from [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0). Social links belong to MiniStew; Big_Stew's profile links to the ZBK guide.

## Home-page sections

Map and builder content lives on the home page, in Der Eisendrache, Nacht, and Build your own order. The former maps and build routes are removed. DE presents a large castle image, three image cards, then the latest Short. Nacht presents its full video first, followed by three images. Both link to their Downloads entries; DE remains in development. The builder section keeps the setup overview, system links, and guide call to action. Shared navigation and internal links target the home anchors through the base-aware URL helper.

Content reveals once on entering the viewport using opacity and translation. Reduced motion and the footer motion preference keep content visible without animation. Images stay static while scrolling, and video players load only on request.
