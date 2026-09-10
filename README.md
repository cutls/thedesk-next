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
pnpm install
npx electron-rebuild
pnpm run dev
```

Because of `electron-builder`, use `shamefully-hoist` option to launch production build.(check .npmrc)

## Build

```
pnpm install
npx electron-rebuild
pnpm run build

# choose your environment

pnpm run pack:win # Windows(x64)
pnpm run pack:winArm64 # Windows(arm64)

pnpm run pack:appx # Windows Microsoft Store
pnpm run pack:linux # Linux(x64)

pnpm run pack:mac # macOS(Universal; Intel & Apple Silicon)
pnpm run pack:macArm64 # macOS(Apple Silicon)
pnpm run pack:macX64 #macOS(Intel)
pnpm run pack:mas # macOS App Store(Universal)
```

### Notarize(macOS)

It is currently set to be notarized with the developer's signature. Edit `build/noratize.js` and `.env`
If you want to notarize it by your certification, edit `.env.sample` and rename it to `.env`

## Notice

This app includes some product created by LLM (Cursor, Codex).
