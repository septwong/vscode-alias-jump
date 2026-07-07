import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AliasConfigReader, AliasMapping } from './types';

/**
 * Reader for webpack.config.js/ts
 * Parses resolve.alias for alias mappings
 */
export class WebpackConfigReader implements AliasConfigReader {
  name = 'webpack-config';
  priority = 15;

  private configFiles = [
    'webpack.config.ts',
    'webpack.config.js',
    'webpack.common.ts',
    'webpack.common.js'
  ];

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

    return this.parseAliasConfig(configContent);
  }

  /**
   * Parse resolve.alias from webpack config
   * Uses Map to avoid duplicate aliases
   */
  private parseAliasConfig(content: string): AliasMapping[] {
    const aliasMap: Map<string, string> = new Map();

    // Try resolve.alias block first: resolve: { alias: { '@': path.resolve(...) } }
    const resolveBlockMatch = content.match(/resolve\s*:\s*\{[^}]*alias\s*:\s*\{([^}]+)\}[^}]*\}/s);
    if (resolveBlockMatch) {
      const aliasBlockMatch = resolveBlockMatch[0].match(/alias\s*:\s*\{([^}]+)\}/s);
      if (aliasBlockMatch) {
        this.extractAliasesFromBlock(aliasBlockMatch[1], aliasMap);
      }
    }

    // Also try standalone alias block: alias: { '@': ... }
    const simpleMatch = content.match(/alias\s*:\s*\{([^}]+)\}/s);
    if (simpleMatch && !resolveBlockMatch) {
      this.extractAliasesFromBlock(simpleMatch[1], aliasMap);
    }

    return Array.from(aliasMap.entries()).map(([alias, path]) => ({ alias, path }));
  }

  /**
   * Extract aliases from an alias block
   * Supports both path.resolve() and resolve() (imported from 'path')
   */
  private extractAliasesFromBlock(block: string, aliasMap: Map<string, string>): void {
    // Match individual alias entries
    // Pattern: '@': 'value' or '@': path.resolve(...) or '@': resolve(...)
    const entryPattern = /['"]([^'"]+)['"]\s*:\s*/g;

    let match;
    while ((match = entryPattern.exec(block)) !== null) {
      const alias = match[1];
      const startIndex = match.index + match[0].length;

      // Extract the value after the colon
      const remaining = block.slice(startIndex);

      // Try to match resolve() or path.resolve()
      const resolveMatch = remaining.match(/(?:path\.)?resolve\s*\(([^)]+)\)/);
      if (resolveMatch) {
        const args = resolveMatch[1].split(',').map(a => a.trim());
        // Get the path argument (skip __dirname)
        let mappedPath = '';
        for (const arg of args) {
          const cleanArg = arg.replace(/['"]/g, '');
          if (cleanArg !== '__dirname' && !cleanArg.match(/^\d+$/)) {
            mappedPath = cleanArg;
            break;
          }
        }

        if (mappedPath) {
          mappedPath = mappedPath.replace(/^\.?\//, '');
          aliasMap.set(alias, mappedPath);
        }
        continue;
      }

      // Try to match direct string value
      const stringMatch = remaining.match(/^['"]([^'"]+)['"]/);
      if (stringMatch) {
        let mappedPath = stringMatch[1];
        mappedPath = mappedPath.replace(/^\.?\//, '');
        aliasMap.set(alias, mappedPath);
      }
    }
  }
}