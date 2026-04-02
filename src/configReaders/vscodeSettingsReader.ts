import * as vscode from 'vscode';
import { AliasConfigReader, AliasMapping } from './types';

/**
 * Reader for VS Code settings (alias-jump.mappings)
 * Highest priority - user-defined settings always take precedence
 */
export class VSCodeSettingsReader implements AliasConfigReader {
  name = 'vscode-settings';
  priority = 20;

  canRead(_workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
    // VS Code settings are always available
    return Promise.resolve(true);
  }

  async readAliases(workspaceFolder: vscode.WorkspaceFolder): Promise<AliasMapping[]> {
    const config = vscode.workspace.getConfiguration('alias-jump', workspaceFolder.uri);
    const mappings = config.get<Record<string, string>>('mappings', { '@': '/src' });

    return Object.entries(mappings).map(([alias, path]) => ({
      alias,
      path: path.startsWith('/') ? path.slice(1) : path
    }));
  }
}