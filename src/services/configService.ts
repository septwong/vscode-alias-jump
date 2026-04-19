import * as vscode from 'vscode';
import { readers, ResolvedConfig } from '../configReaders';

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
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get configuration for a workspace folder
   * Uses cache if available and not expired
   */
  async getConfig(workspaceFolder: vscode.WorkspaceFolder): Promise<ResolvedConfig> {
    const cacheKey = workspaceFolder.uri.fsPath;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !cached.isExpired()) {
      return cached.config;
    }

    // Build config from all readers
    const config = await this.buildConfig(workspaceFolder);
    this.cache.set(cacheKey, new CachedConfig(config));
    return config;
  }

  /**
   * Build config by merging all reader outputs
   * Higher priority readers override lower priority ones
   * Falls back to default { "@": "src" } if no readers provide mappings
   */
  private async buildConfig(workspaceFolder: vscode.WorkspaceFolder): Promise<ResolvedConfig> {
    const allMappings: Map<string, string> = new Map();

    // Process readers in priority order (highest first)
    for (const reader of readers) {
      try {
        if (await reader.canRead(workspaceFolder)) {
          const aliases = await reader.readAliases(workspaceFolder);
          for (const { alias, path } of aliases) {
            // Only set if not already set (higher priority reader already set it)
            if (!allMappings.has(alias)) {
              allMappings.set(alias, path);
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

    // Get other settings from VS Code
    const vscodeConfig = vscode.workspace.getConfiguration('alias-jump-pro', workspaceFolder.uri);

    return {
      mappings,
      rootpath: vscodeConfig.get<string>('rootpath', 'package.json'),
      allowedsuffix: vscodeConfig.get<string[]>('allowedsuffix', ['js', 'vue', 'jsx', 'ts', 'tsx', 'svelte'])
    };
  }

  /**
   * Invalidate cache for a workspace folder
   */
  invalidateCache(workspaceFolder: vscode.WorkspaceFolder): void {
    this.cache.delete(workspaceFolder.uri.fsPath);
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
}