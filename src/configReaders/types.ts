import * as vscode from 'vscode';

/**
 * Interface that all config readers must implement
 */
export interface AliasConfigReader {
  name: string;
  priority: number; // Higher = higher priority
  canRead(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean>;
  readAliases(workspaceFolder: vscode.WorkspaceFolder): Promise<AliasMapping[]>;
}

/**
 * Alias mapping from config source
 */
export interface AliasMapping {
  alias: string; // e.g., "@", "@/", "~/"
  path: string; // e.g., "src", "src/"
}

/**
 * Resolved configuration for a workspace
 */
export interface ResolvedConfig {
  mappings: Record<string, string>;
  allowedsuffix: string[];
}

/**
 * Config source type
 */
export type ConfigSource = 'vscode-settings' | 'vite-config' | 'webpack-config' | 'tsconfig' | 'jsconfig';