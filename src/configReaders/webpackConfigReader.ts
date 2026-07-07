import * as path from 'path';
import * as fs from 'fs';
import { AliasConfigReader, AliasMapping, ConfigReaderContext } from './types';

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

    return this.parseAliasConfig(configContent, path.dirname(configPath));
  }

  /**
   * Parse resolve.alias from webpack config
   * Uses Map to avoid duplicate aliases
   */
  private parseAliasConfig(content: string, configDir: string): AliasMapping[] {
    const aliasMap: Map<string, string> = new Map();

    // Try resolve.alias block first: resolve: { alias: { '@': path.resolve(...) } }
    const resolveBlockMatch = content.match(/resolve\s*:\s*\{[^}]*alias\s*:\s*\{([^}]+)\}[^}]*\}/s);
    if (resolveBlockMatch) {
      const aliasBlockMatch = resolveBlockMatch[0].match(/alias\s*:\s*\{([^}]+)\}/s);
      if (aliasBlockMatch) {
        this.extractAliasesFromBlock(aliasBlockMatch[1], configDir, aliasMap);
      }
    }

    // Also try standalone alias block: alias: { '@': ... }
    const simpleMatch = content.match(/alias\s*:\s*\{([^}]+)\}/s);
    if (simpleMatch && !resolveBlockMatch) {
      this.extractAliasesFromBlock(simpleMatch[1], configDir, aliasMap);
    }

    return Array.from(aliasMap.entries()).map(([alias, path]) => ({ alias, path }));
  }

  /**
   * Extract aliases from an alias block
   * Supports both path.resolve() and resolve() (imported from 'path')
   */
  private extractAliasesFromBlock(block: string, configDir: string, aliasMap: Map<string, string>): void {
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
        const mappedPath = this.resolvePathArgs(resolveMatch[1], configDir);
        aliasMap.set(alias, mappedPath);
        continue;
      }

      // Try to match direct string value
      const stringMatch = remaining.match(/^['"]([^'"]+)['"]/);
      if (stringMatch) {
        const mappedPath = this.resolveStringPath(stringMatch[1], configDir);
        aliasMap.set(alias, mappedPath);
      }
    }
  }

  private resolvePathArgs(rawArgs: string, configDir: string): string {
    const parts = rawArgs
      .split(',')
      .map(arg => arg.trim().replace(/^['"]|['"]$/g, ''))
      .filter(arg => arg && arg !== '__dirname' && !arg.match(/^\d+$/));

    return path.resolve(configDir, ...parts);
  }

  private resolveStringPath(rawPath: string, configDir: string): string {
    if (path.isAbsolute(rawPath)) {
      return rawPath;
    }

    return path.resolve(configDir, rawPath);
  }
}
