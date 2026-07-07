import * as vscode from 'vscode';
import { AliasConfigReader, AliasMapping, ConfigReaderContext } from './types';

/**
 * Reader for VS Code settings (alias-jump-pro.mappings)
 * Highest priority - user-defined settings always take precedence
 * Note: Only returns mappings if user has explicitly configured them
 */
export class VSCodeSettingsReader implements AliasConfigReader {
  name = 'vscode-settings';
  priority = 20;

  canRead(_context: ConfigReaderContext): Promise<boolean> {
    // VS Code settings are always available
    return Promise.resolve(true);
  }

  async readAliases(context: ConfigReaderContext): Promise<AliasMapping[]> {
    const config = vscode.workspace.getConfiguration('alias-jump-pro', context.workspaceFolder.uri);

    // Check if user has explicitly configured mappings (not using default)
    const mappings = config.inspect<Record<string, string>>('mappings');

    // Only return aliases if user has actually configured them
    // This allows other readers (tsconfig, vite, webpack) to provide defaults
    if (mappings?.globalValue || mappings?.workspaceValue || mappings?.workspaceFolderValue) {
      const actualMappings = config.get<Record<string, string>>('mappings', {});
      return Object.entries(actualMappings).map(([alias, path]) => ({
        alias,
        path
      }));
    }

    // No user configuration, return empty to let other readers take over
    return [];
  }
}
