# TheDesk next(v25~)

[English](https://github.com/cutls/thedesk-next)

[Fedistar](https://github.com/h3poteto/fedistar)ベースのPC用Mastodo(とMisskey)クライアント。

## Fedistarとの違いは？

* TheDeskのUI（[TheDesk ~v24](https://github.com/cutls/TheDesk)ライクなUI）
  * フローティング投稿ボックス
  * カラムやアカウントごとに色分けできます
  * 柔軟かつ直感的にに横幅をリサイズできるタイムライン
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
  * メディアだけのタイムライン
  * タイムラインの縦積み
* その他
  * Misskeyに部分的に対応


## TheDesk を入手する

[ウェブサイト](https://thedesk.top)または[GitHub Release page](https://github.com/cutls/thedesk-next/releases)

### システム設定

システム設定はAppData(macOS: Application Support)フォルダ内のconfig.jsonで編集できます。このフォルダへは設定画面から簡単に飛ぶことができます。

`hardwareAcceleration`: ハードウェアアクセラレーション(default: true)  
`allowDoH`: DNS over HTTPS (default: true)
## 開発

```
pnpm install
npx electron-rebuild
pnpm run dev
```

`electron-builder` の制限により、本番ビルドを起動するには `shamefully-hoist` オプションを使用する必要があります。(`.npmrc`に記載)

## ビルド

```
pnpm install
npx electron-rebuild
pnpm run build

# 環境に合わせて以下を選択

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

デフォルトでは公証は行われませんが、あなたの証明書で公証したい場合は`.env.sample`を編集して`.env`にリネームしてください。


## お知らせ

この製品にはLLM(Cursor, Codex)で作成された成果物が含まれています。
