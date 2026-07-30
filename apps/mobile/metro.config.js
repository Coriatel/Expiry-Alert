const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Resolve packages from workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Keep Node-style hierarchical resolution. Disabling it only worked while a
// global react override let npm hoist every package flat; under strict peer
// resolution npm legitimately nests (e.g. expo-asset under expo/node_modules)
// and Metro must be able to walk up to find those.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
