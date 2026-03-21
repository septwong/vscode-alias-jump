import * as vscode from 'vscode';
import * as path from 'path';
import {
  getConfig,
  screeningPath,
  rootPath,
  joiningSuffix,
  screeningRelativePath,
  removeComments
} from '../utils';

export class AliasDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private context: vscode.ExtensionContext) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.DefinitionLink[] | vscode.Definition | undefined> {
    const config = getConfig();
    const fileName = document.fileName;
    const workDir = path.dirname(fileName);

    // Get current line text
    const originText = document.lineAt(position).text;

    // Remove comments and adjust position
    const { linetext, adjustedPosition } = removeComments(originText, position);

    // Parse alias path
    const aliasResult = screeningPath(linetext, adjustedPosition, config.mappings);

    // Parse relative path
    const relativeResult = screeningRelativePath(linetext, adjustedPosition);

    // Build target path (priority: alias > relative)
    let targetPath = '';
    let target: { rang: vscode.Range } | null = null;

    if (aliasResult) {
      // Find project root
      const projectRoot = rootPath(workDir, config.rootpath, this.context.workspaceState);
      if (projectRoot) {
        targetPath = path.resolve(projectRoot, aliasResult.path);
        target = aliasResult;
      }
    } else if (relativeResult) {
      targetPath = path.resolve(workDir, relativeResult.text);
      target = relativeResult;
    }

    if (!targetPath || !target) {
      return undefined;
    }

    // Resolve suffix and verify file exists
    const finalPath = joiningSuffix(targetPath, config.allowedsuffix);

    if (!finalPath) {
      return undefined;
    }

    // Return definition link
    return [
      {
        originSelectionRange: target.rang,
        targetRange: new vscode.Range(0, 0, 0, 0),
        targetUri: vscode.Uri.file(finalPath)
      }
    ];
  }
}