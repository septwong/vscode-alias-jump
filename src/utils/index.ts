import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface PathResult {
  path: string;
  rang: vscode.Range;
  columns: [number, number];
}

export interface RelativePathResult {
  text: string;
  rang: vscode.Range;
  columns: [number, number];
}

// Get configuration values
export function getConfig() {
  const config = vscode.workspace.getConfiguration('alias-jump-pro');
  return {
    mappings: config.get<Record<string, string>>('mappings', { '@': '/src' }),
    rootpath: config.get<string>('rootpath', 'package.json'),
    allowedsuffix: config.get<string[]>('allowedsuffix', ['js', 'vue', 'jsx', 'ts', 'tsx', 'svelte'])
  };
}

/**
 * Parse alias path from line text
 * Input: "import Button from '@/components/Button'"
 * Output: { path: 'src/components/Button', rang: Range, columns: [14, 34] }
 */
export function screeningPath(linetext: string, position: vscode.Position, mappings: Record<string, string>): PathResult | null {
  // Match quoted strings
  const arr = linetext.match(/('.+')|(".+")/);
  if (!arr) {
    return null;
  }

  // Remove quotes
  const text = arr[0].substring(1, arr[0].length - 1);
  const i = linetext.indexOf(text);
  const columns: [number, number] = [i, i + text.length];

  // Split by '/' and get the first part as alias key
  const parts = text.split('/');
  const key = parts[0];

  // Check if the key exists in mappings
  if (mappings.hasOwnProperty(key)) {
    let mappedPath = mappings[key];
    // Remove leading '/' if present
    if (mappedPath[0] === '/') {
      mappedPath = mappedPath.substring(1);
    }
    // Join the mapped path with the rest of the path
    const restParts = parts.slice(1);
    return {
      path: path.join(mappedPath, ...restParts),
      rang: new vscode.Range(position.line, columns[0], position.line, columns[1]),
      columns
    };
  }

  return null;
}

/**
 * Find project root directory by looking for rootpath file
 * Uses cache from workspaceState for performance
 */
export function rootPath(presentPath: string, rootfile: string, memento: vscode.Memento): string {
  // Check cache
  const rootList = memento.get<string[]>('rootList', []);

  // Cache hit
  for (const item of rootList) {
    if (presentPath.indexOf(item) === 0) {
      return item;
    }
  }

  // Walk up the directory tree
  let arr = presentPath.split(path.sep);
  for (let i = 0; i < arr.length; i++) {
    const currentPath = path.join(...arr);
    if (fs.existsSync(path.join(currentPath, rootfile))) {
      // Cache the result
      memento.update('rootList', [...rootList, currentPath]);
      return currentPath;
    }
    arr.pop();
  }

  return '';
}

/**
 * Try to add file extension to a path without extension
 * Input: '/Users/x/project/src/components/Button'
 * Output: '/Users/x/project/src/components/Button.vue' (if exists)
 */
export function joiningSuffix(targetPath: string, allowedsuffix: string[]): string {
  const extname = path.extname(targetPath);

  if (!extname) {
    // Try direct suffix
    for (const suffix of allowedsuffix) {
      const fullPath = `${targetPath}.${suffix}`;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Try index file
    const indexPath = path.join(targetPath, 'index');
    for (const suffix of allowedsuffix) {
      const fullPath = `${indexPath}.${suffix}`;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  } else if (fs.existsSync(targetPath)) {
    return targetPath;
  }

  return '';
}

/**
 * Parse relative path (./ or ../) from line text
 */
export function screeningRelativePath(linetext: string, position: vscode.Position): RelativePathResult | null {
  const arr = linetext.match(/('.+')|(".+")/);
  if (!arr) {
    return null;
  }

  const text = arr[0].substring(1, arr[0].length - 1);

  // Only process relative paths
  if (!text.startsWith('./') && !text.startsWith('../')) {
    return null;
  }

  const i = linetext.indexOf(text);
  const columns: [number, number] = [i, i + text.length];

  return {
    text,
    rang: new vscode.Range(position.line, i, position.line, i + text.length),
    columns
  };
}

/**
 * Remove comments from line text and adjust position
 */
export function removeComments(originText: string, position: vscode.Position): { linetext: string; adjustedPosition: vscode.Position } {
  const reg = /\/\*{1,2}[\s\S]*?\*\//g;
  const linetext = originText.replace(reg, '');
  const commentMatch = originText.match(reg);
  const numComment = commentMatch ? commentMatch.join('').length : 0;
  const adjustedPosition = position.translate(0, -numComment);

  return { linetext, adjustedPosition };
}