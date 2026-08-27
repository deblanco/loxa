const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

// Metro has to be told the repo root exists, or `@loxa/shared` — which ships
// raw TypeScript from outside this folder — does not resolve. Paired with
// `linker = "hoisted"` in the root bunfig.toml; change neither alone.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
