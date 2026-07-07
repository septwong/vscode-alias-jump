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

interface PathToken {
  text: string;
  columns: [number, number];
}

function findPathTokenAtPosition(linetext: string, position: vscode.Position): PathToken | null {
  const character = position.character;
  const quotedTokenPattern = /(['"`])([^'"`]*)\1/g;
  let match: RegExpExecArray | null;

  while ((match = quotedTokenPattern.exec(linetext)) !== null) {
    const start = match.index + 1;
    const end = start + match[2].length;
    if (character >= start && character <= end) {
      return {
        text: match[2],
        columns: [start, end]
      };
    }
  }

  const unquotedUrlPattern = /url\(\s*([^'"`\s)][^)]*?)\s*\)/g;
  while ((match = unquotedUrlPattern.exec(linetext)) !== null) {
    const text = match[1].trim();
    const start = linetext.indexOf(match[1], match.index);
    const end = start + text.length;
    if (character >= start && character <= end) {
      return {
        text,
        columns: [start, end]
      };
    }
  }

  return null;
}

/**
 * Parse alias path from line text
 * Supports both '@' and '@/' format aliases
 * Input: "import Button from '@/components/Button'"
 * Output: { path: 'src/components/Button', rang: Range, columns: [14, 34] }
 */
export function screeningPath(linetext: string, position: vscode.Position, mappings: Record<string, string>): PathResult | null {
  const token = findPathTokenAtPosition(linetext, position);
  if (!token) {
    return null;
  }

  const { text, columns } = token;

  // Find matching alias key
  // Try both formats: '@' and '@/' (with trailing slash)
  const aliases = Object.keys(mappings).sort((a, b) => b.length - a.length);
  for (const key of aliases) {
    const keyWithoutSlash = key.endsWith('/') ? key.slice(0, -1) : key;
    const keyWithSlash = key.endsWith('/') ? key : `${key}/`;

    // Check if path starts with alias (with or without trailing slash)
    if (text === keyWithoutSlash || text.startsWith(keyWithSlash)) {
      let mappedPath = mappings[key];
      // Remove leading '/' if present
      if (mappedPath[0] === '/' && !fs.existsSync(mappedPath)) {
        mappedPath = mappedPath.substring(1);
      }

      // Get the rest of the path after the alias
      let restPath: string;
      if (text === keyWithoutSlash) {
        restPath = '';
      } else {
        restPath = text.substring(keyWithSlash.length);
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
  const token = findPathTokenAtPosition(linetext, position);
  if (!token) {
    return null;
  }

  const { text, columns } = token;

  // Only process relative paths
  if (!text.startsWith('./') && !text.startsWith('../')) {
    return null;
  }

  return {
    text,
    rang: new vscode.Range(position.line, columns[0], position.line, columns[1]),
    columns
  };
}
