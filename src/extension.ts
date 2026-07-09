import * as vscode from 'vscode';
import { AliasDefinitionProvider } from './providers/definitionProvider';
import { AliasHoverProvider } from './providers/hoverProvider';
import { ConfigService } from './services/configService';
import { FileWatcherService } from './services/fileWatcherService';

let configService: ConfigService;
let fileWatcherService: FileWatcherService;

export function activate(context: vscode.ExtensionContext) {
  console.log('Alias Jump extension is now active!');

  // Initialize services
  configService = new ConfigService();
  fileWatcherService = new FileWatcherService(context, configService);

  // Supported languages
  const languages = [
    { scheme: 'file', language: 'vue' },
    { scheme: 'file', language: 'scss' },
    { scheme: 'file', language: 'css' },
    { scheme: 'file', language: 'less' },
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascriptreact' },
    { scheme: 'file', language: 'typescriptreact' },
    { scheme: 'file', language: 'svelte' },
    { scheme: 'file', language: 'nvue' },
    { scheme: 'file', language: 'uvue' }
  ];

  // Register providers with services
  const definitionProvider = new AliasDefinitionProvider(configService);
  const hoverProvider = new AliasHoverProvider(configService);

  const definitionDisposable = vscode.languages.registerDefinitionProvider(
    languages,
    definitionProvider
  );
  const hoverDisposable = vscode.languages.registerHoverProvider(
    languages,
    hoverProvider
  );

  context.subscriptions.push(definitionDisposable, hoverDisposable);

  // Register reload config command
  const reloadCommand = vscode.commands.registerCommand('alias-jump-pro.reloadConfig', () => {
    configService.clearAllCaches();
    vscode.window.showInformationMessage('Alias Jump configuration reloaded!');
  });

  context.subscriptions.push(reloadCommand);

  // Register show config command
  const showConfigCommand = vscode.commands.registerCommand('alias-jump-pro.showConfig', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showInformationMessage('No workspace folder open');
      return;
    }
    const config = await configService.getConfig(workspaceFolder);
    const msg = `Project root: ${config.projectRoot}\nMappings: ${JSON.stringify(config.mappings, null, 2)}\nAllowed suffixes: [${config.allowedsuffix.join(', ')}]`;
    vscode.window.showInformationMessage(msg);
    console.log('[Alias Jump] Config:', msg);
  });

  context.subscriptions.push(showConfigCommand);
}

export function deactivate() {
  // Cleanup watchers
  if (fileWatcherService) {
    fileWatcherService.dispose();
  }
}
