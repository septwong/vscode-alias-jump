import * as fs from 'fs';
import * as path from 'path';
import { AliasConfigReader, AliasMapping, ConfigReaderContext } from './types';

export class UniAppConfigReader implements AliasConfigReader {
  name = 'uniapp';
  priority = 5;

  async canRead(context: ConfigReaderContext): Promise<boolean> {
    const workspacePath = context.projectRoot;
    return fs.existsSync(path.join(workspacePath, 'pages.json'));
  }

  async readAliases(context: ConfigReaderContext): Promise<AliasMapping[]> {
    const workspacePath = context.projectRoot;
    const srcPath = path.join(workspacePath, 'src');

    const aliasPath = fs.existsSync(srcPath) ? 'src' : '.';
    return [{ alias: '@', path: aliasPath }];
  }
}
