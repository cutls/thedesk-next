# TheDesk next(v25~)

Mastodon client for PC, based on [Fedistar](https://github.com/h3poteto/fedistar)

## What difference from Fedistar?

* TheDesk UI(like [TheDesk ~v24](https://github.com/cutls/TheDesk))
  * Floating post box
  * It can be color-coded by column or account
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


## Get TheDesk

[Website](https://thedesk.top) or [GitHub Release page](https://github.com/cutls/thedesk-next/releases)

## Development

```
pnpm install --shamefully-hoist
pnpm run dev
```

Because of `electron-builder`, use `shamefully-hoist` option to launch production build.
