# MediaManager Project Tasks

## Phase 1: UI Foundations & Core Viewer
- [ ] Initialize project with global CSS theme (`src/main.css`).
    - [ ] Define color palette and glassmorphism variables.
    - [ ] Reset and utility styles.
- [ ] Create UI Shell (`index.html`).
    - [ ] Basic structure for Overlay, Nav, and Main content.
- [ ] Implement UI Overlay Logic (`src/components/UIOverlay.ts`).
    - [ ] Toggle Top/Left bars on background click.
- [ ] Build Thumbnail Grid (`src/components/ThumbnailGrid.ts`).
    - [ ] Responsive grid with placeholder cards.
- [ ] Build Single Media View (`src/components/SingleMediaView.ts`).
    - [ ] Fit-to-window aspect ratio logic.
    - [ ] Manual zoom placeholder (scroll wheel).
- [ ] Build Carousel Component (`src/components/Carousel.ts`).
    - [ ] Horizontal scroll/drag behavior.

## Phase 2: Interactivity & Mock Persistence
- [ ] Implement `localStorage` handler for view history/likes.
- [ ] Add basic Like/Dislike/Tagging buttons to the Top Bar.
- [ ] Implement "Previous/Next" navigation logic.
- [ ] Support Mouse Scroll Wheel horizontal scrolling for Carousel.

## Phase 3: Selection & Filtering
- [ ] Implement Left Sidebar content:
    - [ ] Folder selection mockup.
    - [ ] Tag selection cloud mockup.
- [ ] Decide and implement Filter Menu placement.
- [ ] Basic View History display.

## Phase 4: Backend Integration (Bun.js)
- [ ] Initialize Bun project and SQLite database.
- [ ] Implement Media Discovery (scan folders).
- [ ] REST API for Media, Tags, and History.

## Phase 5: Randomization & Polish
- [ ] Implement Randomization Algorithms (Least viewed, Weighted, etc.).
- [ ] Playlist management and serialization.
- [ ] VR Controller support (WebXR).
- [ ] Final visual polish and transitions.
