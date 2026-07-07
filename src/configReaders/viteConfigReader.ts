import * as path from 'path';
import * as fs from 'fs';
import { AliasConfigReader, AliasMapping, ConfigReaderContext } from './types';

/**
 * Reader for vite.config.js/ts
 * Parses resolve.alias for alias mappings
 */
export class ViteConfigReader implements AliasConfigReader {
  name = 'vite-config';
  priority = 15;

  private configFiles = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];

  async canRead(context: ConfigReaderContext): Promise<boolean> {
    const workspacePath = context.projectRoot;
    return this.configFiles.some(file =>
      fs.existsSync(path.join(workspacePath, file))
    );
  }

  async readAliases(context: ConfigReaderContext): Promise<AliasMapping[]> {
    const workspacePath = context.projectRoot;

    // Find the first existing config file
    let configPath: string | undefined;
    let configContent: string | undefined;

    for (const file of this.configFiles) {
      const filePath = path.join(workspacePath, file);
      if (fs.existsSync(filePath)) {
        configPath = filePath;
        configContent = fs.readFileSync(filePath, 'utf-8');
        break;
      }
    }

    if (!configPath || !configContent) {
      return [];
    }

    return this.parseAliasConfig(configContent, configPath);
  }

  /**
   * Parse resolve.alias from vite config
   * Supports both object format and array format
   * Uses Map to avoid duplicate aliases (later entries override earlier ones)
   */
  private parseAliasConfig(content: string, configPath: string): AliasMapping[] {
    const aliasMap: Map<string, string> = new Map();
    const configDir = path.dirname(configPath);

    // Object format: alias: { '@': path.resolve(__dirname, 'src') }
    this.extractObjectAliases(content, configDir, aliasMap);

    // Array format: alias: [{ find: '@', replacement: '...' }]
    this.extractArrayAliases(content, configDir, aliasMap);

    // Convert Map to array
    return Array.from(aliasMap.entries()).map(([alias, path]) => ({ alias, path }));
  }

  /**
   * Extract aliases from object format
   * Pattern: alias: { '@': '/src', '~': '/lib' }
   * Supports both path.resolve() and resolve() (imported from 'path')
   */
  private extractObjectAliases(content: string, configDir: string, aliasMap: Map<string, string>): void {
    // Match alias object block
    const aliasBlockMatch = content.match(/alias\s*:\s*\{([^}]+)\}/s);
    if (!aliasBlockMatch) {
      return;
    }

    const aliasBlock = aliasBlockMatch[1];

    // Match individual alias entries
    // Pattern: '@': 'value' or '@': path.resolve(...) or '@': resolve(...)
    const entryPattern = /['"]([^'"]+)['"]\s*:\s*((?:path\.)?resolve\s*\([^)]+\)|['"][^'"]+['"])/g;

    let match;
    while ((match = entryPattern.exec(aliasBlock)) !== null) {
      const alias = match[1];
      const mappedPath = this.parseAliasValue(match[2], configDir);
      aliasMap.set(alias, mappedPath);
    }
  }

  /**
   * Extract aliases from array format
   * Pattern: alias: [{ find: '@', replacement: '/src' }]
   * Supports both path.resolve() and resolve() (imported from 'path')
   */
  private extractArrayAliases(content: string, configDir: string, aliasMap: Map<string, string>): void {
    // Find all alias entries in array format (simple string replacement)
    const entryPattern = /\{\s*find\s*:\s*['"]([^'"]+)['"]\s*,\s*replacement\s*:\s*['"]([^'"]+)['"]\s*\}/g;

    let match;
    while ((match = entryPattern.exec(content)) !== null) {
      const alias = match[1];
      const mappedPath = this.resolveStringPath(match[2], configDir);
      aliasMap.set(alias, mappedPath);
    }

    // Also match entries with resolve() or path.resolve()
    const resolveEntryPattern = /\{\s*find\s*:\s*['"]([^'"]+)['"]\s*,\s*replacement\s*:\s*(?:path\.)?resolve\s*\(([^)]+)\)\s*\}/g;
    while ((match = resolveEntryPattern.exec(content)) !== null) {
      const alias = match[1];
      const mappedPath = this.resolvePathArgs(match[2], configDir);
      aliasMap.set(alias, mappedPath);
    }
  }

  private parseAliasValue(value: string, configDir: string): string {
    const resolveMatch = value.match(/(?:path\.)?resolve\s*\(([^)]+)\)/);
    if (resolveMatch) {
      return this.resolvePathArgs(resolveMatch[1], configDir);
    }

    return this.resolveStringPath(value.replace(/^['"]|['"]$/g, ''), configDir);
  }

  private resolvePathArgs(rawArgs: string, configDir: string): string {
    const parts = rawArgs
      .split(',')
      .map(arg => arg.trim().replace(/^['"]|['"]$/g, ''))
      .filter(arg => arg && arg !== '__dirname');

    return path.resolve(configDir, ...parts);
  }

  private resolveStringPath(rawPath: string, configDir: string): string {
    if (path.isAbsolute(rawPath)) {
      return rawPath;
    }

    return path.resolve(configDir, rawPath);
  }
}
