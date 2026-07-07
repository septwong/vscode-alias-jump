import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { readers, ResolvedConfig } from '../configReaders';

const DEFAULT_ALLOWED_SUFFIXES = ['js', 'vue', 'jsx', 'ts', 'tsx', 'svelte', 'css', 'scss', 'less'];

/**
 * Cached configuration with TTL
 */
class CachedConfig {
  private timestamp: number;
  private ttlMs: number = 5000; // 5 seconds TTL

  constructor(public config: ResolvedConfig) {
    this.timestamp = Date.now();
  }

  isExpired(): boolean {
    return Date.now() - this.timestamp > this.ttlMs;
  }
}

/**
 * Central configuration management service
 * Merges configs from all readers with priority chain
 */
export class ConfigService {
  private cache: Map<string, CachedConfig> = new Map();

  constructor() {}

  /**
   * Get configuration for a workspace folder
   * Uses cache if available and not expired
   */
  async getConfig(workspaceFolder: vscode.WorkspaceFolder, resourceUri?: vscode.Uri): Promise<ResolvedConfig> {
    const vscodeConfig = vscode.workspace.getConfiguration('alias-jump-pro', resourceUri ?? workspaceFolder.uri);
    const rootMarker = vscodeConfig.get<string>('rootpath', 'package.json');
    const projectRoot = this.findProjectRoot(workspaceFolder, resourceUri, rootMarker);
    const cacheKey = this.getCacheKey(workspaceFolder, projectRoot);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !cached.isExpired()) {
      return cached.config;
    }

    // Build config from all readers
    const config = await this.buildConfig(workspaceFolder, projectRoot, vscodeConfig);
    this.cache.set(cacheKey, new CachedConfig(config));
    return config;
  }

  /**
   * Build config by merging all reader outputs
   * Higher priority readers override lower priority ones
   * Falls back to default { "@": "src" } if no readers provide mappings
   */
  private async buildConfig(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    vscodeConfig: vscode.WorkspaceConfiguration
  ): Promise<ResolvedConfig> {
    const allMappings: Map<string, string> = new Map();
    const readerContext = { workspaceFolder, projectRoot };

    // Process readers in priority order (highest first)
    for (const reader of readers) {
      try {
        if (await reader.canRead(readerContext)) {
          const aliases = await reader.readAliases(readerContext);
          for (const { alias, path } of aliases) {
            // Only set if not already set (higher priority reader already set it)
            if (!allMappings.has(alias)) {
              allMappings.set(alias, this.normalizeMappingPath(path, projectRoot));
            }
          }
        }
      } catch (e) {
        // Reader failed, continue with others
        console.error(`Reader ${reader.name} failed:`, e);
      }
    }

    // Fallback to default if no mappings found
    if (allMappings.size === 0) {
      allMappings.set('@', 'src');
    }

    // Convert to final format
    const mappings: Record<string, string> = {};
    for (const [alias, path] of allMappings) {
      mappings[alias] = path;
    }

    return {
      projectRoot,
      mappings,
      allowedsuffix: vscodeConfig.get<string[]>('allowedsuffix', DEFAULT_ALLOWED_SUFFIXES)
    };
  }

  /**
   * Invalidate cache for a workspace folder
   */
  invalidateCache(workspaceFolder: vscode.WorkspaceFolder): void {
    const workspaceRoot = workspaceFolder.uri.fsPath;
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${workspaceRoot}|`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache by URI (finds workspace folder automatically)
   */
  invalidateCacheByUri(uri: vscode.Uri): void {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      this.invalidateCache(workspaceFolder);
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.cache.clear();
  }

  private getCacheKey(workspaceFolder: vscode.WorkspaceFolder, projectRoot: string): string {
    return `${workspaceFolder.uri.fsPath}|${projectRoot}`;
  }

  private findProjectRoot(
    workspaceFolder: vscode.WorkspaceFolder,
    resourceUri: vscode.Uri | undefined,
    rootMarker: string
  ): string {
    const workspaceRoot = workspaceFolder.uri.fsPath;
    const startPath = resourceUri?.scheme === 'file' ? resourceUri.fsPath : workspaceRoot;
    let currentDir = fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
      ? startPath
      : path.dirname(startPath);

    while (currentDir.startsWith(workspaceRoot)) {
      if (fs.existsSync(path.join(currentDir, rootMarker))) {
        return currentDir;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    return workspaceRoot;
  }

  private normalizeMappingPath(mappingPath: string, projectRoot: string): string {
    const cleanPath = mappingPath.trim();
    if (!cleanPath) {
      return cleanPath;
    }

    if (path.isAbsolute(cleanPath)) {
      const relativePath = path.relative(projectRoot, cleanPath);
      if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
        return relativePath;
      }

      // Preserve real absolute paths, but keep legacy "/src" style settings relative.
      return fs.existsSync(cleanPath) ? cleanPath : cleanPath.replace(/^[/\\]+/, '');
    }

    return cleanPath.replace(/^\.\//, '');
  }
}
