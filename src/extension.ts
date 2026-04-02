import * as vscode from 'vscode';
import { AliasDefinitionProvider } from './providers/definitionProvider';
import { ConfigService } from './services/configService';
import { FileWatcherService } from './services/fileWatcherService';

let configService: ConfigService;
let fileWatcherService: FileWatcherService;

export function activate(context: vscode.ExtensionContext) {
  console.log('Alias Jump extension is now active!');

  // Initialize services
  configService = new ConfigService(context);
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
    { scheme: 'file', language: 'typescriptreact' }
  ];

  // Register DefinitionProvider with services
  const definitionProvider = new AliasDefinitionProvider(configService);

  const disposable = vscode.languages.registerDefinitionProvider(
    languages,
    definitionProvider
  );

  context.subscriptions.push(disposable);

  // Register reload config command
  const reloadCommand = vscode.commands.registerCommand('alias-jump-pro.reloadConfig', () => {
    configService.clearAllCaches();
    vscode.window.showInformationMessage('Alias Jump configuration reloaded!');
  });

  context.subscriptions.push(reloadCommand);
}

export function deactivate() {
  // Cleanup watchers
  if (fileWatcherService) {
    fileWatcherService.dispose();
  }
}