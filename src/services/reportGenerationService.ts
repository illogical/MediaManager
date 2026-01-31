/**
 * Report Generation Service
 * Handles generation of JSON and HTML reports for folder analysis
 */

import * as fs from "fs";
import * as path from "path";
import type { AnalysisReport } from "./indexFolderService";

export class ReportGenerationService {
  private readonly logsDir: string;

  constructor(logsDir: string = path.join(process.cwd(), "logs")) {
    this.logsDir = logsDir;
    this.ensureLogsDirectory();
  }

  /**
   * Ensure logs directory exists
   */
  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Generate timestamped filename
   */
  private generateTimestampedFilename(prefix: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    return `${prefix}_${timestamp}.${extension}`;
  }

  /**
   * Generate and save JSON report
   */
  generateJsonReport(report: AnalysisReport): string {
    const filename = this.generateTimestampedFilename("analysis-report", "json");
    const filePath = path.join(this.logsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");

    return filePath;
  }

  /**
   * Generate and save HTML report
   */
  generateHtmlReport(report: AnalysisReport, jsonReportPath: string): string {
    const filename = this.generateTimestampedFilename("analysis-report", "html");
    const filePath = path.join(this.logsDir, filename);

    const html = this.buildHtmlContent(report, path.basename(jsonReportPath));

    fs.writeFileSync(filePath, html, "utf-8");

    return filePath;
  }

  /**
   * Build HTML content
   */
  private buildHtmlContent(report: AnalysisReport, jsonFilename: string): string {
    const showFileList = report.totalFilesToAdd <= 100;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Media Manager - Analysis Report</title>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Media Manager Analysis Report</h1>
            <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        </header>

        ${this.buildSummarySection(report)}
        ${this.buildTimingSection(report)}
        ${this.buildFoldersSection(report)}
        ${showFileList ? this.buildFileListSection(report) : this.buildFileListPlaceholder(report.totalFilesToAdd)}
        ${this.buildJsonLinkSection(jsonFilename)}
        
        <footer>
            <p>MediaManager - Folder Indexing Analysis</p>
        </footer>
    </div>

    <script>
        ${this.getScript()}
    </script>
</body>
</html>`;
  }

  /**
   * Get CSS styles
   */
  private getStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }

        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .timestamp {
            opacity: 0.9;
            font-size: 0.95rem;
        }

        .section {
            padding: 30px;
            border-bottom: 1px solid #e0e0e0;
        }

        .section:last-of-type {
            border-bottom: none;
        }

        .section h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.8rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #667eea;
        }

        .stat-card.add {
            border-left-color: #28a745;
        }

        .stat-card.skip {
            border-left-color: #ffc107;
        }

        .stat-card.delete {
            border-left-color: #dc3545;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 0.9rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .folder-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }

        .folder-header {
            margin-bottom: 15px;
        }

        .folder-name {
            font-size: 1.3rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .folder-path {
            font-size: 0.9rem;
            color: #666;
            word-break: break-all;
            font-family: 'Courier New', monospace;
        }

        .folder-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }

        .folder-stat {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 6px;
        }

        .folder-stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #667eea;
        }

        .folder-stat-label {
            font-size: 0.85rem;
            color: #666;
            margin-top: 5px;
        }

        .timing-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            font-size: 0.9rem;
            color: #666;
        }

        .timing-info strong {
            color: #333;
        }

        .category-breakdown {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .category-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }

        .category-title {
            font-size: 1.1rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }

        .extension-list {
            list-style: none;
        }

        .extension-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }

        .extension-item:last-child {
            border-bottom: none;
        }

        .extension-name {
            font-family: 'Courier New', monospace;
            color: #667eea;
        }

        .extension-count {
            font-weight: bold;
            color: #333;
        }

        .file-list-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 0.9rem;
        }

        .file-list-table th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }

        .file-list-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
        }

        .file-list-table tr:hover {
            background: #f8f9fa;
        }

        .file-path {
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            color: #666;
            word-break: break-all;
        }

        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
        }

        .badge.image {
            background: #d4edda;
            color: #155724;
        }

        .badge.video {
            background: #cce5ff;
            color: #004085;
        }

        .file-size {
            color: #666;
            font-size: 0.85rem;
        }

        .json-link {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            transition: background 0.3s;
        }

        .json-link:hover {
            background: #5568d3;
        }

        .placeholder-box {
            background: #fff3cd;
            border: 2px dashed #ffc107;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            color: #856404;
        }

        .placeholder-box h3 {
            margin-bottom: 10px;
            color: #856404;
        }

        footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
        }
    `;
  }

  /**
   * Build summary section
   */
  private buildSummarySection(report: AnalysisReport): string {
    return `
        <section class="section">
            <h2>📈 Summary</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${report.totalFolders}</div>
                    <div class="stat-label">Total Folders</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.totalFilesOnDisk}</div>
                    <div class="stat-label">Files on Disk</div>
                </div>
                <div class="stat-card add">
                    <div class="stat-value">${report.totalFilesToAdd}</div>
                    <div class="stat-label">Files to Add</div>
                </div>
                <div class="stat-card skip">
                    <div class="stat-value">${report.totalFilesToSkip}</div>
                    <div class="stat-label">Files to Skip</div>
                </div>
                <div class="stat-card delete">
                    <div class="stat-value">${report.totalFilesToDelete}</div>
                    <div class="stat-label">Files to Delete</div>
                </div>
            </div>
        </section>
    `;
  }

  /**
   * Build timing section
   */
  private buildTimingSection(report: AnalysisReport): string {
    const { totalMs, averageMsPerFolder } = report.overallTiming;
    return `
        <section class="section">
            <h2>⏱️ Performance</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${(totalMs / 1000).toFixed(2)}s</div>
                    <div class="stat-label">Total Duration</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${averageMsPerFolder.toFixed(0)}ms</div>
                    <div class="stat-label">Avg per Folder</div>
                </div>
            </div>
        </section>
    `;
  }

  /**
   * Build folders section
   */
  private buildFoldersSection(report: AnalysisReport): string {
    const foldersHtml = report.folders
      .map(
        (folder) => `
        <div class="folder-card">
            <div class="folder-header">
                <div class="folder-name">${this.escapeHtml(folder.folderName)} ${
          folder.recursive ? "🔄 (Recursive)" : ""
        }</div>
                <div class="folder-path">${this.escapeHtml(folder.folderPath)}</div>
            </div>
            
            <div class="folder-stats">
                <div class="folder-stat">
                    <div class="folder-stat-value">${folder.totalFilesOnDisk}</div>
                    <div class="folder-stat-label">On Disk</div>
                </div>
                <div class="folder-stat">
                    <div class="folder-stat-value">${folder.filesToAdd.length}</div>
                    <div class="folder-stat-label">To Add</div>
                </div>
                <div class="folder-stat">
                    <div class="folder-stat-value">${folder.filesAlreadyInDb}</div>
                    <div class="folder-stat-label">Already in DB</div>
                </div>
                <div class="folder-stat">
                    <div class="folder-stat-value">${folder.filesToDelete.length}</div>
                    <div class="folder-stat-label">To Delete</div>
                </div>
            </div>

            <div class="category-breakdown">
                <div class="category-card">
                    <div class="category-title">📷 Images: ${folder.filesByCategory.image}</div>
                    <ul class="extension-list">
                        ${this.buildExtensionList(folder.filesByExtension, [
                          ".jpg",
                          ".jpeg",
                          ".png",
                          ".gif",
                          ".bmp",
                          ".webp",
                        ])}
                    </ul>
                </div>
                <div class="category-card">
                    <div class="category-title">🎥 Videos: ${folder.filesByCategory.video}</div>
                    <ul class="extension-list">
                        ${this.buildExtensionList(folder.filesByExtension, [".mp4", ".webm", ".mov", ".avi", ".mkv"])}
                    </ul>
                </div>
            </div>

            <div class="timing-info">
                <strong>Timing:</strong> 
                Filesystem: ${folder.timing.filesystemScanMs.toFixed(0)}ms | 
                Database: ${folder.timing.databaseQueryMs.toFixed(0)}ms | 
                ${folder.timing.deletionMarkingMs ? `Deletion Check: ${folder.timing.deletionMarkingMs.toFixed(0)}ms | ` : ""}
                Total: ${folder.timing.totalMs.toFixed(0)}ms
            </div>
        </div>
    `
      )
      .join("");

    return `
        <section class="section">
            <h2>📁 Folder Details</h2>
            ${foldersHtml}
        </section>
    `;
  }

  /**
   * Build extension list
   */
  private buildExtensionList(filesByExtension: Record<string, number>, extensions: string[]): string {
    const items = extensions
      .filter((ext) => filesByExtension[ext])
      .map(
        (ext) => `
        <li class="extension-item">
            <span class="extension-name">${ext}</span>
            <span class="extension-count">${filesByExtension[ext]}</span>
        </li>
    `
      )
      .join("");

    return items || '<li class="extension-item"><span style="color: #999;">No files</span></li>';
  }

  /**
   * Build file list section (for <= 100 files)
   */
  private buildFileListSection(report: AnalysisReport): string {
    const allFiles = report.folders.flatMap((f) => f.filesToAdd);

    if (allFiles.length === 0) {
      return `
        <section class="section">
            <h2>📄 Files to be Added</h2>
            <p style="color: #666;">No new files to add.</p>
        </section>
      `;
    }

    const fileRows = allFiles
      .map(
        (file) => `
        <tr>
            <td>${this.escapeHtml(file.fileName)}</td>
            <td><span class="badge ${file.category}">${file.category}</span></td>
            <td>${file.extension}</td>
            <td class="file-path">${this.escapeHtml(file.filePath)}</td>
        </tr>
    `
      )
      .join("");

    return `
        <section class="section">
            <h2>📄 Files to be Added (${allFiles.length})</h2>
            <table class="file-list-table">
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Extension</th>
                        <th>Path</th>
                    </tr>
                </thead>
                <tbody>
                    ${fileRows}
                </tbody>
            </table>
        </section>
    `;
  }

  /**
   * Build file list placeholder (for > 100 files)
   */
  private buildFileListPlaceholder(totalFiles: number): string {
    return `
        <section class="section">
            <h2>📄 Files to be Added</h2>
            <div class="placeholder-box">
                <h3>⚠️ Large File List (${totalFiles} files)</h3>
                <p>The file list is too large to display here. Please refer to the JSON report for the complete list of files.</p>
            </div>
        </section>
    `;
  }

  /**
   * Build JSON link section
   */
  private buildJsonLinkSection(jsonFilename: string): string {
    return `
        <section class="section">
            <h2>📥 Download Full Report</h2>
            <p style="margin-bottom: 15px;">For complete details including all file paths and metadata:</p>
            <a href="${jsonFilename}" class="json-link" download>Download JSON Report</a>
        </section>
    `;
  }

  /**
   * Get JavaScript
   */
  private getScript(): string {
    return `
        console.log('Media Manager Analysis Report loaded');
        
        // Add any interactive functionality here if needed
        document.querySelectorAll('.folder-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.tagName !== 'A') {
                    this.style.transform = this.style.transform === 'scale(0.98)' ? 'scale(1)' : 'scale(0.98)';
                    setTimeout(() => {
                        this.style.transform = 'scale(1)';
                    }, 100);
                }
            });
        });
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
