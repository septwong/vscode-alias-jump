import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AliasConfigReader, AliasMapping } from './types';

/**
 * Reader for vite.config.js/ts
 * Parses resolve.alias for alias mappings
 */
export class ViteConfigReader implements AliasConfigReader {
  name = 'vite-config';
  priority = 15;

  private configFiles = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];

  async canRead(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
    const workspacePath = workspaceFolder.uri.fsPath;
    return this.configFiles.some(file =>
      fs.existsSync(path.join(workspacePath, file))
    );
  }

  async readAliases(workspaceFolder: vscode.WorkspaceFolder): Promise<AliasMapping[]> {
    const workspacePath = workspaceFolder.uri.fsPath;

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
    const entryPattern = /['"]([^'"]+)['"]\s*:\s*(?:(?:path\.)?resolve\s*\([^)]+\)|['"]([^'"]+)['"])/g;

    let match;
    while ((match = entryPattern.exec(aliasBlock)) !== null) {
      const alias = match[1];

      // Extract path from either resolve() or direct string
      let mappedPath: string;

      if (match[2]) {
        // Direct string value
        mappedPath = match[2];
      } else {
        // resolve() or path.resolve() - extract the last argument
        const resolveMatch = aliasBlock.match(new RegExp(`['"]${alias}['"]\\s*:\\s*(?:path\\.)?resolve\\s*\\([^)]+\\)`));
        if (resolveMatch) {
          const resolveCall = resolveMatch[0];
          const argsMatch = resolveCall.match(/(?:path\.)?resolve\s*\(([^)]+)\)/);
          if (argsMatch) {
            // Get the path argument (usually last one, or second after __dirname)
            const args = argsMatch[1].split(',').map(a => a.trim());
            const pathArg = args[args.length - 1] || args[1] || '';
            mappedPath = pathArg.replace(/['"]/g, '').replace(/^__dirname\s*,?\s*/, '');

            // If path starts with ./ or is relative, resolve it
            if (!path.isAbsolute(mappedPath) && !mappedPath.startsWith('./')) {
              mappedPath = path.join(configDir, mappedPath);
            }
          } else {
            continue;
          }
        } else {
          continue;
        }
      }

      // Normalize path
      mappedPath = mappedPath.replace(/^\.?\//, '');

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
      let mappedPath = match[2];

      // Normalize path
      mappedPath = mappedPath.replace(/^\.?\//, '');

      aliasMap.set(alias, mappedPath);
    }

    // Also match entries with resolve() or path.resolve()
    const resolveEntryPattern = /\{\s*find\s*:\s*['"]([^'"]+)['"]\s*,\s*replacement\s*:\s*(?:path\.)?resolve\s*\(([^)]+)\)\s*\}/g;
    while ((match = resolveEntryPattern.exec(content)) !== null) {
      const alias = match[1];
      const args = match[2].split(',').map(a => a.trim());
      const pathArg = args[args.length - 1] || '';
      let mappedPath = pathArg.replace(/['"]/g, '');

      // Normalize path
      mappedPath = mappedPath.replace(/^\.?\//, '');

      aliasMap.set(alias, mappedPath);
    }
  }
}