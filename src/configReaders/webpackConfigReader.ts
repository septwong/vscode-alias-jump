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

    return this.parseAliasConfig(configContent, configPath);
  }

  /**
   * Parse resolve.alias from webpack config
   */
  private parseAliasConfig(content: string, configPath: string): AliasMapping[] {
    const aliases: AliasMapping[] = [];
    const configDir = path.dirname(configPath);

    // Match resolve.alias block
    // Pattern: resolve: { alias: { '@': path.resolve(__dirname, 'src') } }
    const resolveBlockMatch = content.match(/resolve\s*:\s*\{[^}]*alias\s*:\s*\{([^}]+)\}[^}]*\}/s);
    if (!resolveBlockMatch) {
      // Try simpler pattern
      const simpleMatch = content.match(/alias\s*:\s*\{([^}]+)\}/s);
      if (!simpleMatch) {
        return aliases;
      }
      return this.extractAliasesFromBlock(simpleMatch[1], configDir);
    }

    // Extract alias block from resolve block
    const aliasBlockMatch = resolveBlockMatch[0].match(/alias\s*:\s*\{([^}]+)\}/s);
    if (aliasBlockMatch) {
      aliases.push(...this.extractAliasesFromBlock(aliasBlockMatch[1], configDir));
    }

    return aliases;
  }

  /**
   * Extract aliases from an alias block
   */
  private extractAliasesFromBlock(block: string, configDir: string): AliasMapping[] {
    const aliases: AliasMapping[] = [];

    // Match individual alias entries
    // Pattern: '@': 'value' or '@': path.resolve(__dirname, 'src')
    const entryPattern = /['"]([^'"]+)['"]\s*:\s*/g;

    let match;
    while ((match = entryPattern.exec(block)) !== null) {
      const alias = match[1];
      const startIndex = match.index + match[0].length;

      // Extract the value after the colon
      const remaining = block.slice(startIndex);

      // Try to match path.resolve()
      const resolveMatch = remaining.match(/path\.resolve\s*\(([^)]+)\)/);
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
          aliases.push({ alias, path: mappedPath });
        }
        continue;
      }

      // Try to match direct string value
      const stringMatch = remaining.match(/^['"]([^'"]+)['"]/);
      if (stringMatch) {
        let mappedPath = stringMatch[1];
        mappedPath = mappedPath.replace(/^\.?\//, '');
        aliases.push({ alias, path: mappedPath });
      }
    }

    return aliases;
  }
}