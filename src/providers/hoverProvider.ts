import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigService } from '../services/configService';
import {
  joiningSuffix,
  screeningPath,
  screeningRelativePath
} from '../utils';

export class AliasHoverProvider implements vscode.HoverProvider {
  constructor(private configService: ConfigService) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      return undefined;
    }

    const config = await this.configService.getConfig(workspaceFolder, document.uri);
    const lineText = document.lineAt(position).text;
    const workDir = path.dirname(document.fileName);
    const aliasResult = screeningPath(lineText, position, config.mappings);
    const relativeResult = screeningRelativePath(lineText, position);

    let targetPath = '';
    let range: vscode.Range | undefined;

    if (aliasResult) {
      targetPath = path.resolve(config.projectRoot, aliasResult.path);
      range = aliasResult.rang;
    } else if (relativeResult) {
      targetPath = path.resolve(workDir, relativeResult.text);
      range = relativeResult.rang;
    }

    if (!targetPath || !range) {
      return undefined;
    }

    const finalPath = joiningSuffix(targetPath, config.allowedsuffix);
    if (!finalPath) {
      return undefined;
    }

    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown('**Alias Jump Pro**  \n');
    markdown.appendCodeblock(finalPath, 'text');

    return new vscode.Hover(markdown, range);
  }
}
