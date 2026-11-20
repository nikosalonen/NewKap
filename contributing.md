# Contributing to Ture

Thanks for helping with this Kap fork. Bug reports and focused pull requests are welcome.

## Reporting bugs

1. Search the [existing issues](https://github.com/nikosalonen/NewKap/issues) first.
2. Include your macOS version (`sw_vers`), the Ture version (**About Ture** in the menu bar icon's menu), whether you use a release or your own build, the steps to reproduce, and what you expected to happen.
3. Logs help. Run `/Applications/Ture.app/Contents/MacOS/Ture` from Terminal and copy the output around the problem, or open Console.app and filter by "Ture".

## Submitting changes

1. Fork the repository and create a branch: `git checkout -b fix/short-description`.
2. Set up the project as described in the README's [Development](README.md#development) section.
3. Keep each pull request to one change, and describe what you tested by hand.
4. Run the checks: `pnpm typecheck`, `pnpm lint`, `pnpm test:main` and `pnpm build-renderer`.
5. Open a pull request against `main`.

### Project structure

    main/               Electron main process (TypeScript)
      aperture.ts         Screen recording: start, pause and stop
      index.ts            App entry point and lifecycle
      common/             Code shared with the renderer (permissions, settings)
      utils/              Helper modules (devices, errors, native helper)
    renderer/           Next.js renderer (React)
      pages/              App windows (cropper, editor, preferences, ...)
    native/             Swift helper (kap-helper.swift) and screen recorder (recorder/)
    scripts/            Build, packaging and signing scripts
    static/             Icons and static assets
    test/               AVA tests and fixtures

### Key commands

| Command | Description |
|---------|-------------|
| `pnpm start` | Compile the main process and launch Ture (see `maintaining.md`) |
| `pnpm build` | Build the native helper, main process and renderer |
| `pnpm test` | Lint and run the tests |
| `pnpm typecheck` | Type-check the main process and tests |
| `pnpm run pack:local` | Build a test app in `dist/mac-arm64` |
| `pnpm dist` | Build the release DMG, signed with "Kap Local Signing" (see `maintaining.md`) |

### Important notes

- Always `unset ELECTRON_RUN_AS_NODE` when running from a VS Code terminal.
- Follow [`docs/electron-security.md`](docs/electron-security.md) when adding renderer access to Electron or main-process functionality.

## Code of conduct

Be kind, be respectful, be constructive. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
