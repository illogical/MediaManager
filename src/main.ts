import "./main.css";
import { ThumbnailGrid } from "./components/ThumbnailGrid";
import { MediaFile } from "./types";

// Mock Data for Phase 1
const mockMediaFiles: MediaFile[] = Array.from({ length: 50 }, (_, i) => ({
  id: `mock-${i}`,
  filename: `Image ${i + 1}`,
  url: "", // Empty URL to trigger placeholder
  type: "image",
}));

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  const thumbnailGrid = new ThumbnailGrid(mockMediaFiles);
  app.appendChild(thumbnailGrid.render());
} else {
  console.error("App container not found!");
}
