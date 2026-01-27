/**
 * Folders API routes
 */

import { Hono } from "hono";
import { sqlService } from "../../services/sqlService";
import { logService } from "../../services/logService";
import { FileSystemService, FolderAlreadyExistsError } from "../../services/fileSystemService";
import { type Folder, type CreateFolder, type ApiResponse, CreateFolderSchema } from "../schemas";

const folders = new Hono();
const fileSystemService = new FileSystemService(sqlService);

/**
 * GET /api/folders - List all folders
 */
folders.get("/", (c) => {
  logService.trace("GET /api/folders called");

  try {
    const results = sqlService.queryAll<Folder>("SELECT * FROM Folders ORDER BY name ASC");

    logService.info(`Retrieved ${results.length} folders`);

    const response: ApiResponse<Folder[]> = {
      status: 200,
      data: results,
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to fetch folders", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to fetch folders" },
    };
    return c.json(response, 500);
  }
});

/**
 * POST /api/folders - Create a new folder and index its media files
 */
folders.post("/", async (c) => {
  logService.trace("POST /api/folders called");

  try {
    // Parse and validate request body
    const bodyData = await c.req.json();
    const validatedData = CreateFolderSchema.parse(bodyData) as CreateFolder;

    // Create folder in database
    const folderId = fileSystemService.createFolder(validatedData.name, validatedData.path);

    // Scan directory and index files
    logService.info(`Scanning directory: ${validatedData.path} (recursive: ${validatedData.recursive})`);
    const scanResult = fileSystemService.scan(validatedData.path, {
      recursive: validatedData.recursive,
    });

    logService.info(
      `Scan completed - Added: ${scanResult.filesAdded}, Skipped: ${scanResult.filesSkipped}, Errors: ${scanResult.errors}`
    );

    const response: ApiResponse<{
      folderId: number;
      folderName: string;
      scanResults: {
        filesAdded: number;
        filesSkipped: number;
        errors: number;
      };
    }> = {
      status: 201,
      data: {
        folderId,
        folderName: validatedData.name,
        scanResults: scanResult,
      },
    };

    return c.json(response, 201);
  } catch (error) {
    if (error instanceof SyntaxError) {
      logService.error("Invalid JSON in request body", error as Error);
      const response: ApiResponse<{ error: string }> = {
        status: 400,
        data: { error: "Invalid request body" },
      };
      return c.json(response, 400);
    }

    if (error instanceof Error && error.message.includes("validation")) {
      logService.error("Validation error", error as Error);
      const response: ApiResponse<{ error: string }> = {
        status: 400,
        data: { error: "Invalid request: " + error.message },
      };
      return c.json(response, 400);
    }

    if (error instanceof FolderAlreadyExistsError) {
      logService.warn(error.message);
      const response: ApiResponse<{ error: string }> = {
        status: 409,
        data: { error: error.message },
      };
      return c.json(response, 409);
    }

    logService.error("Failed to create folder and index files", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to create folder and index files" },
    };
    return c.json(response, 500);
  }
});

export default folders;
