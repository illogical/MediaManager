# MediaManager Design Specification

This document elaborates on the visual and interactive design of the Multimedia Manager application.

## UI/UX Principles
- **Atmosphere**: Medium-dark theme with a "premium" feel. Use of glassmorphism (backdrop-blur) for overlays.
- **Immersion**: Content-first approach. UI elements remain hidden during active viewing unless explicitly toggled or hovered.
- **Interactivity**: Smooth transitions for slide-in menus and zoom animations.

## Components

### 1. UI Overlay System
- **Top Action Bar**: Slide-in from the top. Contains persistent actions (Like/Dislike, Tags, Settings, Navigation).
- **Left Navigation Bar**: Slide-in from the left. Contains Folder tree, Tag cloud, and Playlist selection.
- **Toggle Mechanism**: 
    - A single click on the content area (not on an interactive element) toggles the visibility of both bars.
    - Bars should have a semi-transparent blurred background.

### 2. Single Image View (Zoom Logic)
- **Initial State**: Always "Fit to Viewport".
    - If `image_ratio > window_ratio`: Width = 100vw, Height = auto (centered vertically).
    - If `image_ratio < window_ratio`: Height = 100vh, Width = auto (centered horizontally).
- **Manual Zoom**:
    - Mouse Scroll: Incremental zoom centered on the cursor position.
    - Pinch: Standard touch zoom behavior.
- **Navigation**: Click and drag (when zoomed in) to pan across the image.

### 3. Carousel Component
- **Placement**: Full-width strip at the bottom of the "Single View" or as a dedicated "Filmstrip" mode.
- **Interaction**:
    - **Drag & Swipe**: Standard horizontal movement.
    - **Scroll Wheel**: Mouse wheel vertical movement should be captured and translated to horizontal scroll for the carousel specifically when hovering it.
    - **VR Controllers**: Pointer-based click-and-drag for natural "grabbing" of the strip.

### 4. Thumbnail Grid
- **Layout**: Flexible CSS Grid (`repeat(auto-fill, minmax(200px, 1fr))`).
- **Aspect Ratio**: Thumbnails should be fixed aspect ratio (e.g., 1:1 or 16:9) with `object-fit: cover` to maintain grid consistency.
- **Hover**: Subtle scale-up or border highlight.

## Color Palette & Styles
- **Primary Background**: HSL(220, 15%, 10%)
- **Overlay Background**: HSLA(220, 15%, 15%, 0.8) with `backdrop-filter: blur(10px)`
- **Accent Color**: HSL(210, 100%, 60%) (Electric Blue)
- **Border**: Thin 1px borders with low opacity for depth.

## Simulation & Persistence (Temporary)
- Until the Bun.js backend is implemented, `localStorage` will be used to store:
    - View counts and "Last Viewed" timestamps.
    - Like/Dislike states.
    - Current folder/filter settings.
