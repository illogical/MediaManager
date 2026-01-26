import { MediaFile } from "../types";
import "./ThumbnailGrid.css";

export class ThumbnailGrid {
  private mediaFiles: MediaFile[];
  private container: HTMLElement;

  constructor(mediaFiles: MediaFile[]) {
    this.mediaFiles = mediaFiles;
    this.container = document.createElement("div");
    this.container.className = "thumbnail-grid";
  }

  public render(): HTMLElement {
    this.container.innerHTML = ""; // Clear previous content

    this.mediaFiles.forEach((file) => {
      const item = document.createElement("div");
      item.className = "thumbnail-item";
      item.dataset.id = file.id;

      let content;
      if (file.url) {
        const img = document.createElement("img");
        img.src = file.url;
        img.alt = file.filename;
        img.className = "thumbnail-img";
        img.loading = "lazy";
        content = img;
      } else {
        // Fallback placeholder
        const placeholder = document.createElement("div");
        placeholder.className = "thumbnail-placeholder";
        placeholder.textContent = file.filename;
        content = placeholder;
      }

      item.appendChild(content);

      // Event Listener
      item.addEventListener("click", () => {
        // TODO: Handle image click event
        console.log(`TODO: Handle image click for ${file.filename} (ID: ${file.id})`);
      });

      this.container.appendChild(item);
    });

    return this.container;
  }
}
