import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { AliasConfigReader, AliasMapping } from './types';

/**
 * Reader for tsconfig.json and jsconfig.json
 * Parses compilerOptions.paths for alias mappings
 */
export class TsConfigReader implements AliasConfigReader {
  name = 'tsconfig';
  priority = 10;

  private configFiles = ['tsconfig.json', 'jsconfig.json'];

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

    return this.parsePaths(configContent, configPath);
  }

  /**
   * Parse compilerOptions.paths from tsconfig/jsconfig
   * Handles patterns like "@/*": ["src/*"]
   */
  private parsePaths(content: string, configPath: string): AliasMapping[] {
    const aliases: AliasMapping[] = [];

    try {
      // Use jsonc-parser to properly parse JSON with comments
      const config = jsonc.parse(content);

      const compilerOptions = config.compilerOptions || {};
      const paths = compilerOptions.paths || {};
      const baseUrl = compilerOptions.baseUrl || '';

      for (const [pattern, pathList] of Object.entries(paths) as [string, string[]][]) {
        // Strip wildcard from pattern: "@/*" -> "@"
        const alias = pattern.replace(/\/?\*$/, '');

        // Get the first path from the list and strip wildcard
        let mappedPath = pathList[0] || '';
        mappedPath = mappedPath.replace(/\/?\*$/, '');

        // Resolve relative to baseUrl if specified
        if (baseUrl && !path.isAbsolute(mappedPath)) {
          mappedPath = path.join(baseUrl, mappedPath);
        }

        // Normalize path (remove leading ./ or /)
        mappedPath = mappedPath.replace(/^\.?\//, '');

        aliases.push({ alias, path: mappedPath });
      }
    } catch (e) {
      // Failed to parse config, return empty
      console.error(`Failed to parse ${configPath}:`, e);
    }

    return aliases;
  }
}