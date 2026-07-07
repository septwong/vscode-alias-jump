import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { AliasConfigReader, AliasMapping, ConfigReaderContext } from './types';

/**
 * Reader for tsconfig.json and jsconfig.json
 * Parses compilerOptions.paths for alias mappings
 */
export class TsConfigReader implements AliasConfigReader {
  name = 'tsconfig';
  priority = 10;

  private configFiles = ['tsconfig.json', 'jsconfig.json'];

  async canRead(context: ConfigReaderContext): Promise<boolean> {
    const workspacePath = context.projectRoot;
    return this.configFiles.some(file =>
      fs.existsSync(path.join(workspacePath, file))
    );
  }

  async readAliases(context: ConfigReaderContext): Promise<AliasMapping[]> {
    const workspacePath = context.projectRoot;

    // Find the first existing config file
    let configPath: string | undefined;
    let configContent: string | undefined;

    for (const file of this.configFiles) {
      const filePath = path.join(workspacePath, file);
      if (fs.existsSync(filePath)) {
        configPath = filePath;
        configContent = fs.readFileSync(filePath, 'utf-8');
        break;
      }
    }

    if (!configPath || !configContent) {
      return [];
    }

    return this.parseConfig(configContent, configPath, context.projectRoot);
  }

  /**
   * Parse compilerOptions.paths from tsconfig/jsconfig
   * Handles patterns like "@/*": ["src/*"]
   */
  private parseConfig(content: string, configPath: string, projectRoot: string): AliasMapping[] {
    const aliasesByKey = new Map<string, string>();
    const visited = new Set<string>();

    const visitConfig = (currentContent: string, currentPath: string): void => {
      const normalizedPath = path.normalize(currentPath);
      if (visited.has(normalizedPath)) {
        return;
      }
      visited.add(normalizedPath);

      try {
        // Use jsonc-parser to properly parse JSON with comments
        const config = jsonc.parse(currentContent);

        const extendsPath = this.resolveExtendsPath(config.extends, currentPath);
        if (extendsPath && fs.existsSync(extendsPath)) {
          visitConfig(fs.readFileSync(extendsPath, 'utf-8'), extendsPath);
        }

        const compilerOptions = config.compilerOptions || {};
        const paths = compilerOptions.paths || {};
        const baseUrl = compilerOptions.baseUrl || '';
        const configDir = path.dirname(currentPath);

        for (const [pattern, pathList] of Object.entries(paths) as [string, string[]][]) {
          // Strip wildcard from pattern: "@/*" -> "@"
          const alias = pattern.replace(/\/?\*$/, '');

          // Get the first path from the list and strip wildcard
          let mappedPath = pathList[0] || '';
          mappedPath = mappedPath.replace(/\/?\*$/, '');

          const baseDir = baseUrl
            ? path.resolve(configDir, baseUrl)
            : configDir;
          const absoluteMappedPath = path.isAbsolute(mappedPath)
            ? mappedPath
            : path.resolve(baseDir, mappedPath);
          const projectRelativePath = path.relative(projectRoot, absoluteMappedPath);

          aliasesByKey.set(alias, projectRelativePath || '.');
        }
      } catch (e) {
        // Failed to parse config, keep aliases from other configs.
        console.error(`Failed to parse ${currentPath}:`, e);
      }
    };

    visitConfig(content, configPath);

    return Array.from(aliasesByKey, ([alias, path]) => ({ alias, path }));
  }

  private resolveExtendsPath(extendsValue: unknown, configPath: string): string | undefined {
    if (typeof extendsValue !== 'string' || !extendsValue) {
      return undefined;
    }

    const configDir = path.dirname(configPath);
    const candidate = path.isAbsolute(extendsValue)
      ? extendsValue
      : path.resolve(configDir, extendsValue);
    const candidates = candidate.endsWith('.json')
      ? [candidate]
      : [candidate, `${candidate}.json`, path.join(candidate, 'tsconfig.json')];

    return candidates.find(filePath => fs.existsSync(filePath));
  }
}
