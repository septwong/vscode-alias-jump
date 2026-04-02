import { AliasConfigReader, AliasMapping, ResolvedConfig } from './types';
import { VSCodeSettingsReader } from './vscodeSettingsReader';
import { TsConfigReader } from './tsconfigReader';
import { ViteConfigReader } from './viteConfigReader';
import { WebpackConfigReader } from './webpackConfigReader';

// Registry of all readers, sorted by priority (highest first)
export const readers: AliasConfigReader[] = [
  new VSCodeSettingsReader(), // priority: 20
  new ViteConfigReader(), // priority: 15
  new WebpackConfigReader(), // priority: 15
  new TsConfigReader(), // priority: 10
].sort((a, b) => b.priority - a.priority);

export { AliasConfigReader, AliasMapping, ResolvedConfig } from './types';