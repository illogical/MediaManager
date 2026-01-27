# Project Roadmap

## Phase 1: Data Seeding & Randomization Foundations
- [x] Create a database creation script using the schema in documentation/planning/DATABASE.md.
- [x] Add a sample JSON file with seed data for all tables (folders, media, tags, playlists, history, randomization sessions, config).
- [x] Implement a seed ingestion script that reads the JSON file and populates the SQLite database.
- [ ] Scaffold randomizationService.ts and add initial unit tests covering core ordering/randomness logic.

## Phase 2: Backend & API Wiring (Bun.js)
- [x] Setup Bun.js server environment.
- [x] Build API endpoints for media fetching, tagging, randomization, and playlists.
- [ ] Connect frontend components to real API data.

## Phase 3: UI Foundations & Core Viewer
- [ ] Initialize project with global CSS theme (Dark Mode, Glassmorphism).
- [ ] Create Thumbnail Grid view with basic placeholders.
- [ ] Implement Single Image View with "Fit-to-Window" zoom logic.
- [ ] Setup UI Overlay system (Slide-in Top Action Bar, Slide-in Left Nav).
- [ ] Implement "Hide UI" toggle on click/background tap.

## Phase 4: Carousel & Interactions
- [ ] Build Carousel component with horizontal drag/scroll.
- [ ] Add support for Mouse Scroll Wheel horizontal scrolling in Carousel.
- [ ] Implement VR controller interaction basics for Carousel and Navigation.
- [ ] Add basic Like/Dislike/Tagging UI placeholders in the Top Action Bar.

## Phase 5: Navigation & Filtering
- [ ] Implement Left Side Bar for Folder, Tag, and Playlist selection.
- [ ] Design and implement Filter Menu placement (decide based on Phase 1/2 layout).
- [ ] Basic "View History" sidebar or menu.

## Phase 6: Randomization & Advanced Features
- [ ] Implement robust randomization algorithms.
- [ ] Playlist management (Save/Load/Order).
- [ ] Bulk "Delete Disliked" functionality.
- [ ] Final UI/UX polish and animations.
