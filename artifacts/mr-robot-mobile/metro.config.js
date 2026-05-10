const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch folders for the monorepo (allows resolving workspace dependencies)
config.watchFolders = [monorepoRoot];

// Ensure Metro resolves modules from both the project and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.server = {
  ...config.server,
  host: "0.0.0.0",
};

module.exports = config;
