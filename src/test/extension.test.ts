import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { TsConfigReader } from '../configReaders/tsconfigReader';
import { ViteConfigReader } from '../configReaders/viteConfigReader';
import { WebpackConfigReader } from '../configReaders/webpackConfigReader';
import { ConfigReaderContext } from '../configReaders/types';
import { ConfigService } from '../services/configService';
import {
  joiningSuffix,
  screeningPath,
  screeningRelativePath
} from '../utils';

function createTempProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'alias-jump-'));
}

function createWorkspaceFolder(projectRoot: string): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(projectRoot),
    name: path.basename(projectRoot),
    index: 0
  };
}

function writeFile(filePath: string, content = ''): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

suite('Path parsing', () => {
  test('uses the quoted path under the cursor when a line contains multiple imports', () => {
    const line = 'import a from "@/first"; import b from "@components/Button"';
    const position = new vscode.Position(0, line.indexOf('@components') + 2);
    const result = screeningPath(line, position, {
      '@': 'src',
      '@components': 'src/components'
    });

    assert.ok(result);
    assert.strictEqual(result.path, path.join('src/components', 'Button'));
    assert.deepStrictEqual(result.columns, [line.indexOf('@components'), line.indexOf('@components') + '@components/Button'.length]);
  });

  test('supports relative paths and template literal imports', () => {
    const line = 'const module = import(`../shared/util`)';
    const position = new vscode.Position(0, line.indexOf('../shared') + 3);
    const result = screeningRelativePath(line, position);

    assert.ok(result);
    assert.strictEqual(result.text, '../shared/util');
  });

  test('supports unquoted CSS url alias paths', () => {
    const line = 'background: url(@/assets/logo);';
    const position = new vscode.Position(0, line.indexOf('@/assets') + 2);
    const result = screeningPath(line, position, { '@': 'src' });

    assert.ok(result);
    assert.strictEqual(result.path, path.join('src', 'assets/logo'));
  });
});

suite('File resolution', () => {
  test('resolves direct suffixes and directory index files', () => {
    const projectRoot = createTempProject();
    try {
      const buttonBase = path.join(projectRoot, 'src/components/Button');
      const modalDir = path.join(projectRoot, 'src/components/Modal');
      writeFile(`${buttonBase}.vue`);
      writeFile(path.join(modalDir, 'index.ts'));

      assert.strictEqual(joiningSuffix(buttonBase, ['ts', 'vue']), `${buttonBase}.vue`);
      assert.strictEqual(joiningSuffix(modalDir, ['ts', 'vue']), path.join(modalDir, 'index.ts'));
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

suite('Config readers', () => {
  test('reads tsconfig paths with baseUrl from a nested project root', async () => {
    const workspaceRoot = createTempProject();
    try {
      const projectRoot = path.join(workspaceRoot, 'packages/app');
      writeFile(path.join(projectRoot, 'package.json'), '{}');
      writeFile(path.join(projectRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
            '~/*': ['src/shared/*']
          }
        }
      }));

      const context: ConfigReaderContext = {
        workspaceFolder: createWorkspaceFolder(workspaceRoot),
        projectRoot
      };
      const aliases = await new TsConfigReader().readAliases(context);

      assert.deepStrictEqual(aliases, [
        { alias: '@', path: 'src' },
        { alias: '~', path: 'src/shared' }
      ]);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('merges tsconfig extends chain and lets child paths override parent paths', async () => {
    const projectRoot = createTempProject();
    try {
      writeFile(path.join(projectRoot, 'tsconfig.base.json'), JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/base/*'],
            '~/*': ['shared/*']
          }
        }
      }));
      writeFile(path.join(projectRoot, 'packages/app/tsconfig.json'), JSON.stringify({
        extends: '../../tsconfig.base',
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
            '#/*': ['types/*']
          }
        }
      }));

      const appRoot = path.join(projectRoot, 'packages/app');
      const context: ConfigReaderContext = {
        workspaceFolder: createWorkspaceFolder(projectRoot),
        projectRoot: appRoot
      };
      const aliases = await new TsConfigReader().readAliases(context);

      assert.deepStrictEqual(aliases, [
        { alias: '@', path: 'src' },
        { alias: '~', path: path.join('../..', 'shared') },
        { alias: '#', path: 'types' }
      ]);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('reads vite object and array alias formats', async () => {
    const projectRoot = createTempProject();
    try {
      writeFile(path.join(projectRoot, 'vite.config.ts'), `
        import { resolve } from 'path';
        export default {
          resolve: {
            alias: {
              '@': resolve(__dirname, 'src'),
              '~': '/src/shared'
            }
          }
        };
      `);

      const context: ConfigReaderContext = {
        workspaceFolder: createWorkspaceFolder(projectRoot),
        projectRoot
      };
      const objectAliases = await new ViteConfigReader().readAliases(context);
      assert.deepStrictEqual(objectAliases, [
        { alias: '@', path: path.join(projectRoot, 'src') },
        { alias: '~', path: '/src/shared' }
      ]);

      fs.unlinkSync(path.join(projectRoot, 'vite.config.ts'));
      writeFile(path.join(projectRoot, 'vite.config.js'), `
        import path from 'path';
        export default {
          resolve: {
            alias: [
              { find: '@', replacement: path.resolve(__dirname, './src') },
              { find: '~', replacement: '/src/shared' }
            ]
          }
        };
      `);

      const arrayAliases = await new ViteConfigReader().readAliases(context);
      assert.deepStrictEqual(arrayAliases, [
        { alias: '~', path: '/src/shared' },
        { alias: '@', path: path.join(projectRoot, 'src') }
      ]);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('reads webpack aliases', async () => {
    const projectRoot = createTempProject();
    try {
      writeFile(path.join(projectRoot, 'webpack.config.js'), `
        const path = require('path');
        module.exports = {
          resolve: {
            alias: {
              '@': path.resolve(__dirname, 'src'),
              '~': '/src/shared'
            }
          }
        };
      `);

      const context: ConfigReaderContext = {
        workspaceFolder: createWorkspaceFolder(projectRoot),
        projectRoot
      };
      const aliases = await new WebpackConfigReader().readAliases(context);

      assert.deepStrictEqual(aliases, [
        { alias: '@', path: path.join(projectRoot, 'src') },
        { alias: '~', path: '/src/shared' }
      ]);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('ConfigService resolves aliases from the closest rootpath marker', async () => {
    const workspaceRoot = createTempProject();
    try {
      const projectRoot = path.join(workspaceRoot, 'packages/app');
      const sourceFile = path.join(projectRoot, 'src/pages/Home.vue');
      writeFile(path.join(workspaceRoot, 'package.json'), '{}');
      writeFile(path.join(projectRoot, 'package.json'), '{}');
      writeFile(path.join(projectRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*']
          }
        }
      }));
      writeFile(sourceFile);

      const config = await new ConfigService().getConfig(
        createWorkspaceFolder(workspaceRoot),
        vscode.Uri.file(sourceFile)
      );

      assert.strictEqual(config.projectRoot, projectRoot);
      assert.strictEqual(config.mappings['@'], 'src');
      assert.deepStrictEqual(config.allowedsuffix, ['js', 'vue', 'jsx', 'ts', 'tsx', 'svelte', 'css', 'scss', 'less']);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});
