const path = require('node:path');

/** @type {import('next').NextConfig} */
module.exports = {
  // `next build` writes static HTML pages to renderer/out, which Electron loads
  // from disk.
  output: 'export',
  // Otherwise `next dev` writes renderer/AGENTS.md when an AI coding agent
  // runs it.
  agentRules: false,
  turbopack: {
    // The renderer imports main/common through the renderer/common symlink.
    // Turbopack follows the symlink, so the root must contain main/ too.
    root: path.join(__dirname, '..'),
  },
};
