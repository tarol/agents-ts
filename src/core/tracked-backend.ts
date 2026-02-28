import { FilesystemBackend } from "deepagents";

/**
 * 简单包装 FilesystemBackend，保持原有功能
 */
export function createTrackedBackend(rootDir: string): FilesystemBackend {
  return new FilesystemBackend({ rootDir });
}
