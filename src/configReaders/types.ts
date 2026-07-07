import * as vscode from 'vscode';

/**
 * Interface that all config readers must implement
 */
export interface AliasConfigReader {
  name: string;
  priority: number; // Higher = higher priority
  canRead(context: ConfigReaderContext): Promise<boolean>;
  readAliases(context: ConfigReaderContext): Promise<AliasMapping[]>;
}

/**
 * Context shared by all config readers.
 */
export interface ConfigReaderContext {
  workspaceFolder: vscode.WorkspaceFolder;
  projectRoot: string;
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
  projectRoot: string;
  mappings: Record<string, string>;
  allowedsuffix: string[];
}

/**
 * Config source type
 */
export type ConfigSource = 'vscode-settings' | 'vite-config' | 'webpack-config' | 'tsconfig' | 'jsconfig';
