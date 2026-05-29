import globals from 'globals';
import { config as baseConfig } from './base.js';

/**
 * ESLint config for Node.js apps (server) and backend packages.
 */
export const nodeConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
