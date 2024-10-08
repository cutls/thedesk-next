# TheDesk next(v25~)

[日本語](https://github.com/cutls/thedesk-next/blob/main/README.ja.md)

Mastodon(and Misskey) client for PC, based on [Fedistar](https://github.com/h3poteto/fedistar)

## What difference from Fedistar?

* TheDesk UI(like [TheDesk ~v24](https://github.com/cutls/TheDesk))
  * Floating post box
  * It can be color-coded by column or account
  * Flexible and intuitive width resizing timeline
* TheDesk config
  * The format of the time displayed on the timeline can be changed(absolute/relative)
  * Allow icons to animate or not
  * Automatic folding and abbreviated display of long posts
  * Setting whether to leave the post box open after posting
  * Secondary post button to change visibility of post easily
* TheDesk features
  * Spotify NowPlaying
  * Apple Music/iTunes NowPlaying(macOS only)
  * Text-to-speech of timeline posts
  * Media only timeline
  * Vertical stacking of timeline
* Others
  * Partial support for Misskey


## Get TheDesk

[Website](https://thedesk.top) or [GitHub Release page](https://github.com/cutls/thedesk-next/releases)

### System Config

Can be edited in config.json in AppData(macOS: Application Support) folder.
You can easily jump to this folder from the settings screen

`hardwareAcceleration`: Hardware Acceleration(default: true)  
`allowDoH`: Use DNS over HTTPS (default: true)

## Development

```
pnpm install --shamefully-hoist
pnpm run dev
```

Because of `electron-builder`, use `shamefully-hoist` option to launch production build.

## Build

```
pnpm run build
pnpm run pack:win # Windows(able to run on Windows)
pnpm run pack:linux # Linux(able to run on any OS)
pnpm run pack:mac # macOS(able to run on macOS)

```

### Notarize(macOS)

It is currently set to be notarized with the developer's signature. Edit `build-tool/noratize.js`.
To remove notarization, set `const useNotarize` to `false` in the third line of `build-tool/noratize.js`.
