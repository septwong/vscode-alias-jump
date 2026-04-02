import * as vscode from 'vscode';
import { ConfigService } from './configService';

/**
 * File watcher service for config files
 * Watches for changes and invalidates cache
 */
export class FileWatcherService {
  private watchers: vscode.FileSystemWatcher[] = [];
  private configService: ConfigService;

  constructor(context: vscode.ExtensionContext, configService: ConfigService) {
    this.configService = configService;
    this.setupWatchers(context);
  }

  /**
   * Setup file watchers for all config file patterns
   */
  private setupWatchers(context: vscode.ExtensionContext): void {
    const configPatterns = [
      '**/tsconfig.json',
      '**/jsconfig.json',
      '**/vite.config.{js,ts,mjs}',
      '**/webpack.config.{js,ts}',
      '**/webpack.common.{js,ts}'
    ];

    for (const pattern of configPatterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidChange(uri => this.onConfigFileChanged(uri));
      watcher.onDidCreate(uri => this.onConfigFileChanged(uri));
      watcher.onDidDelete(uri => this.onConfigFileChanged(uri));

      context.subscriptions.push(watcher);
      this.watchers.push(watcher);
    }
  }

  /**
   * Handle config file change event
   */
  private onConfigFileChanged(uri: vscode.Uri): void {
    this.configService.invalidateCacheByUri(uri);
  }

  /**
   * Dispose all watchers
   */
  dispose(): void {
    this.watchers.forEach(w => w.dispose());
    this.watchers = [];
  }
}