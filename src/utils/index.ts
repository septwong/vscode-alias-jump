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

/**
 * Parse alias path from line text
 * Supports both '@' and '@/' format aliases
 * Input: "import Button from '@/components/Button'"
 * Output: { path: 'src/components/Button', rang: Range, columns: [14, 34] }
 */
export function screeningPath(linetext: string, position: vscode.Position, mappings: Record<string, string>): PathResult | null {
  // Match quoted strings
  const arr = linetext.match(/('[^']+')|("[^"]+")/);
  if (!arr) {
    return null;
  }

  // Remove quotes
  const text = arr[0].substring(1, arr[0].length - 1);
  const i = linetext.indexOf(text);
  const columns: [number, number] = [i, i + text.length];

  // Find matching alias key
  // Try both formats: '@' and '@/' (with trailing slash)
  for (const key of Object.keys(mappings)) {
    const keyWithSlash = key.endsWith('/') ? key : key + '/';

    // Check if path starts with alias (with or without trailing slash)
    if (text === key || text.startsWith(keyWithSlash)) {
      let mappedPath = mappings[key];
      // Remove leading '/' if present
      if (mappedPath[0] === '/') {
        mappedPath = mappedPath.substring(1);
      }

      // Get the rest of the path after the alias
      let restPath: string;
      if (text === key) {
        restPath = '';
      } else if (text.startsWith(keyWithSlash)) {
        restPath = text.substring(keyWithSlash.length);
      } else {
        // text starts with key (no slash), e.g. '@components' when key is '@'
        restPath = text.substring(key.length);
      }

      return {
        path: restPath ? path.join(mappedPath, restPath) : mappedPath,
        rang: new vscode.Range(position.line, columns[0], position.line, columns[1]),
        columns
      };
    }
  }

  return null;
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
  const arr = linetext.match(/('[^']+')|("[^"]+")/);
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
