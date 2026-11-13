import eslintConfigXoReact from 'eslint-config-xo-react';
import globals from 'globals';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
  {
    ignores: [
      'dist-js',
      'dist',
      'renderer/.next',
      'renderer/out',
      'renderer/next.config.js',
      // A symlink to main/common. Lint those files once, as main code.
      'renderer/common',
      // Next writes this file.
      'renderer/next-env.d.ts',
    ],
  },
  {
    space: 2,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  ...eslintConfigXoReact({space: 2}),
  {
    settings: {
      'react-x': {
        version: '17',
      },
    },
    rules: {
      // Off before the xo 5 move too. Turning these on means typing the
      // untyped code (plugins, aperture, IPC payloads) first.
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-await-in-loop': 'off',
      'ava/use-test': 'off',
      'unicorn/prefer-set-has': 'off',
      '@stylistic/jsx-closing-tag-location': 'off',
      'import-x/no-unassigned-import': 'off',
      'import-x/no-named-as-default-member': 'off',

      // New in typescript-eslint 8. Like the `checksVoidReturn` check that xo
      // keeps off, it flags async functions used as event handlers.
      '@typescript-eslint/strict-void-return': 'off',

      // The renderer imports styled-jsx, which comes with Next.
      'import-x/no-extraneous-dependencies': 'off',
      'n/no-extraneous-import': 'off',

      // The code is CommonJS until the ESM move: TypeScript emits CommonJS,
      // imports have no file extensions, and tests `require` modules after
      // mocking them.
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-top-level-await': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'import-x/extensions': 'off',
      'n/file-extension-in-import': 'off',
      'n/prefer-process-get-builtin-module': 'off',
      // The import-x/order rule counts top-level `require()` calls as imports
      // and wants no empty line before them, while import-x/newline-after-import
      // wants one. Same groups as xo, without the empty-line check.
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'ignore',
          warnOnUnassignedImports: true,
        },
      ],

      // Next 10 compiles the renderer with Babel 7.12, which can't parse inline
      // type specifiers (`import {type A}`). Use `import type` everywhere.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: false,
        },
      ],
      'import-x/consistent-type-specifier-style': [
        'error',
        'prefer-top-level',
      ],
      'import-x/no-duplicates': [
        'error',
        {
          'prefer-inline': false,
        },
      ],

      // Electron provides `process` and `Buffer` in every window, and Next 10's
      // webpack 4 can't bundle `node:` imports for the renderer.
      'n/prefer-global/process': 'off',
      'n/prefer-global/buffer': 'off',

      // Kap is an app: modules such as main/index.ts set things up when loaded.
      'unicorn/no-top-level-side-effects': 'off',

      // The React 19 move replaces the class components and unstated
      // containers. Revisit the React Compiler rules then.
      '@eslint-react/no-class-component': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',

      // TypeScript only allows the `v` flag when targeting ES2024 or later.
      'require-unicode-regexp': 'off',
      'regexp/prefer-named-capture-group': 'off',

      // Moving class fields changes the order their initializers run in.
      'unicorn/consistent-class-member-order': 'off',
      // Flags functions that return a boolean, such as
      // `ensureScreenCapturePermissions`.
      'unicorn/consistent-boolean-name': 'off',
      // `Number()` is not a drop-in for `parseInt` and `parseFloat`: it turns ''
      // into 0 and '12px' into NaN. The code parses form fields and ffmpeg output.
      'unicorn/prefer-number-coercion': 'off',
      // Style only. Components are `const` arrow functions exported at the end.
      'unicorn/default-export-style': 'off',
      // Reordering conditions can change what runs, for little gain.
      'unicorn/prefer-simple-condition-first': 'off',
      // Plugins and exports use Node's EventEmitter API, and plugins see it.
      'unicorn/prefer-event-target': 'off',
      // The videos are screen recordings, with no captions to show.
      'jsx-a11y-x/media-has-caption': 'off',

      // The styled-jsx library uses `<style jsx>` and `<style jsx global>`.
      '@eslint-react/dom-no-unknown-property': [
        'error',
        {
          ignore: [
            'jsx',
            'global',
          ],
        },
      ],
    },
  },
  {
    // Next 10 bundles this code with webpack 4, which can't parse `node:`
    // imports or logical assignment (`||=`, `??=`), and Babel 7.12, which
    // can't parse `export type *`. The renderer also bundles main/common
    // through the renderer/common symlink.
    files: [
      'renderer/**/*.{js,ts,tsx}',
      'main/common/**/*.ts',
    ],
    rules: {
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/logical-assignment-operators': 'off',
      '@typescript-eslint/consistent-type-exports': 'off',
    },
  },
  {
    // Same reason: don't suggest `??=` in code the renderer bundles.
    files: [
      'main/common/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignoreIfStatements: true,
        },
      ],
    },
  },
  {
    // SVG path data.
    files: [
      'renderer/vectors/**',
    ],
    rules: {
      '@stylistic/max-len': 'off',
    },
  },
  {
    files: [
      '**/package.json',
    ],
    rules: {
      // Kap is an Electron app in CommonJS, not a library: no exports map and
      // no `type: module` yet. postinstall builds the Swift helper, and exact
      // versions pin packages on purpose (aperture is patched).
      'package-json/prefer-type-module': 'off',
      'package-json/prefer-exports': 'off',
      'package-json/no-install-scripts': 'off',
      'package-json/dependency-version-range': 'off',
    },
  },
  {
    // The renderer tsconfig has `strict: false`. These rules need
    // `strictNullChecks` and otherwise report one error per file.
    files: [
      'renderer/**/*.ts',
      'renderer/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-useless-default-assignment': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    files: [
      'test/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/member-ordering': 'off',
      'import-x/no-anonymous-default-export': 'off',
      'unicorn/no-anonymous-default-export': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
];

export default xoConfig;
