import * as vscode from 'vscode';
import { AliasDefinitionProvider } from './providers/definitionProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Alias Jump extension is now active!');

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

  // Register DefinitionProvider
  const definitionProvider = new AliasDefinitionProvider(context);
  const disposable = vscode.languages.registerDefinitionProvider(
    languages,
    definitionProvider
  );

  context.subscriptions.push(disposable);

  // Register reload config command
  const reloadCommand = vscode.commands.registerCommand('alias-jump.reloadConfig', () => {
    // Clear the root path cache
    context.workspaceState.update('rootList', []);
    vscode.window.showInformationMessage('Alias Jump configuration reloaded!');
  });

  context.subscriptions.push(reloadCommand);
}

export function deactivate() {}