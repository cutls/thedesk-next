# TheDesk next(v25~)

[Fedistar](https://github.com/h3poteto/fedistar)ベースのPC用Mastodo(とMisskey)クライアント。

## Fedistarとの違いは？

* TheDeskのUI（[TheDesk ~v24](https://github.com/cutls/TheDesk)ライクなUI）
  * フローティング投稿ボックス
  * カラムやアカウントごとに色分けできます
* TheDeskの設定
  * タイムラインに表示する時間の形式を変更可能(絶対/相対時間)
  * アイコンのアニメーション有無の設定
  * 長い投稿の自動折りたたみと省略表示
  * 投稿後に投稿ボックスを開いたままにするかどうかの設定
  * セカンダリー投稿ボタンで投稿の表示を簡単に変更可能
* TheDeskの機能
  * Spotify NowPlaying
  * Apple Music/iTunes NowPlaying(macOS)
  * タイムライン読み上げ
* その他
  * Misskeyに部分的に対応


## TheDesk を入手する

[ウェブサイト](https://thedesk.top)または[GitHub Release page](https://github.com/cutls/thedesk-next/releases)

## 開発

```
pnpm install --shamefully-hoist
pnpm run dev
```

`electron-builder` の制限により、本番ビルドを起動するには `shamefully-hoist` オプションを使用する必要があります。

## ビルド

```
pnpm run build
pnpm run pack:win # Windows(able to run on Windows)
pnpm run pack:linux # Linux(able to run on any OS)
pnpm run pack:mac # macOS(able to run on macOS)

```

### Notarize(macOS)

現在開発者の署名で公証するように設定されています。`build-tool/noratize.js`を編集してください。
公証を削除するためには`build-tool/noratize.js`の3行目の`const useNotarize`を`false`に設定してください。
