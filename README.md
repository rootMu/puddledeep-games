# Puddledeep Games

**Small puddle. Deep worlds.**

The Puddledeep Games studio website: [rootmu.github.io/puddledeep-games](https://rootmu.github.io/puddledeep-games/).

The selected Moonpool design includes a purple dark theme, lavender light theme, tiny octopus mascot, and an interactive winding road through our games.

- **Project Sprawl — In development:** an isometric open-world magic RPG. Its preview links to [the game website](https://rootmu.github.io/sprawl-site/).
- **Project Crawl — Planned:** a dungeon-diving adventure.
- **Project Brawl — Planned:** a playful 2D fighting game. The squat low-poly bean fighters are exploratory concept artwork; the final character style is still undecided.

## Hosting

GitHub Pages publishes the root of the `main` branch. There is no build step, backend, API key, or external runtime dependency. Keep `.nojekyll` and the `assets/` directory alongside `index.html`.

Changes pushed to `main` are published automatically by GitHub Pages. Deployment status appears in the repository's Actions tab and Settings → Pages.

## Editing and previewing

- `index.html`: page content, project descriptions, links and social metadata.
- `assets/moonpool.css` and `assets/variants.css`: theme and studio layout.
- `assets/games.css` and `assets/road.css`: game cards, winding road and expanded previews.
- `assets/road-geometry.js` and `assets/road.js`: perspective, camera travel and preview controls.
- `assets/theme-init.js` and `assets/variants.js`: theme preference and toggle.

Run `python3 -m http.server 8000` in this directory, then visit `http://localhost:8000`.

Run `node --test tests/road.test.cjs` for interaction and perspective checks. These use a small DOM harness and do not replace browser layout testing.

## Interaction

Use next/back or the named project buttons to move along the road. Selecting a preview brings it forward and opens a larger detail box. Only Sprawl has an external website link. Arrow keys, Home and End work while the road is focused. Escape closes previews, and closing returns focus to the selected project. Reduced-motion preferences skip camera travel. Page scrolling is never intercepted.

The page has readable cards when JavaScript or native dialogs are unavailable. Theme preference is stored locally when permitted. There are no analytics, sign-up forms or tracking cookies.

## Artwork and fonts

Studio artwork and the Crawl/Brawl concept illustrations were generated for Puddledeep Games. The latter are labelled as concept artwork on the site. The Sprawl image is from the official Project Sprawl website. See `ARTWORK.md` for asset notes.

Fraunces and DM Sans are self-hosted under the SIL Open Font License; their licences are in `assets/licenses/`. No general licence is granted for the studio's branding, artwork or project content by these font licences.
