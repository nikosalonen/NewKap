# Maintaining

## Developing Kap

`pnpm start` compiles the main process and launches Kap. Restart it after changing code in `main/`.

- If `renderer/out` exists, Kap loads those static pages. `pnpm build`, `pnpm build-renderer` and `pnpm run pack:local` create it.
- If it doesn't, Kap starts the Next.js dev server on `http://localhost:8000` itself, with hot reload for the renderer. Delete `renderer/out` to work this way.

Install an [XO editor plugin](https://github.com/sindresorhus/xo#editor-plugins) to see lint errors and fix them on save.

## Releasing a new version

Releases are built on a Mac and published to [this fork's GitHub Releases](https://github.com/nikosalonen/NewKap/releases). They are signed with the self-signed "Kap Local Signing" certificate and are not notarized.

Sign every release with the same certificate. macOS ties Screen Recording and Microphone permissions to it, so a release signed with another key makes every user grant those permissions again.

### One-time setup

1. Run `scripts/create-local-signing-identity.sh`. It creates the certificate in your login keychain; macOS asks for your password to trust it for code signing.
2. Back up the certificate with its private key. In Keychain Access, open **login -> My Certificates**, right-click **Kap Local Signing**, choose **Export**, and save the `.p12` file with a strong password somewhere safe. To release from another Mac, double-click the `.p12` there, then open the certificate in Keychain Access and set **Trust -> Code Signing** to **Always Trust**.
3. Log in to the GitHub CLI: `gh auth login`.

### Steps

1. Set `version` in `package.json` to the new version, commit with the version as the message (for example `5.2.0`), and push.
2. Build the DMG with `pnpm dist`. It writes `dist/Kap-<version>-mac-arm64.dmg` and stops if the certificate is missing.
3. Test the DMG: install Kap from it, record a clip, and export a GIF. `codesign -dv --verbose=2 /Applications/Kap.app` should show `Authority=Kap Local Signing`.
4. Create a draft release with the DMG:

   ```bash
   gh release create v5.2.0 dist/Kap-5.2.0-mac-arm64.dmg --repo nikosalonen/NewKap --draft --title "Kap 5.2.0" --notes-file release-notes.md
   ```

   The release notes must say that the release needs an Apple Silicon Mac and macOS 13 or later, and that the first launch needs **Open Anyway** in **System Settings -> Privacy & Security**.
5. Review the draft on GitHub and publish it.

Kap's update check reads `releases/latest`, which skips drafts and pre-releases, and offers the asset whose name ends in `.dmg` and contains `mac-arm64`. Keep the file name that `pnpm dist` produces.

### Pre-releases

Add `--prerelease` to `gh release create`. The update check ignores pre-releases, so only people who download one get it.
