# Privacy

Kap from this fork collects no analytics, crash reports or usage data. Your recordings and screenshots stay on your Mac unless you share them.

## What Kap connects to

- **GitHub** (`api.github.com`): Kap checks for a newer release 10 seconds after it starts and then once an hour. Like any web request, it carries your IP address; the User-Agent header names Kap's version.
- **npm** (`api.npms.io`, `registry.npmjs.org`): when you browse plugins in Preferences, install a plugin, and when Kap updates your installed plugins at startup.
- **Links you click**, such as **Help -> Send Feedback**, open in your browser.

## Plugins

Plugins are separate programs from npm that run with the same access as Kap. Sharing plugins upload your recordings to their own services, such as an image host or cloud storage, under those services' terms. Read a plugin's description before you install it.

## Earlier versions

Kap 5.1.0 and earlier sent crash reports to the original Kap project's Sentry account when **Allow analytics** was on, which was the default. The original Kap website's privacy policy, which covered Google Analytics and email updates, does not apply to this fork.

## Questions

Open an issue at <https://github.com/nikosalonen/NewKap/issues>.

*Updated November 14, 2026*
