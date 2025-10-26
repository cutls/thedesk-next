#!/usr/bin/osascript -l JavaScript

function run() {
	// 'delay' を使用するために StandardAdditions を読み込みます
	Application.currentApplication().includeStandardAdditions = true
	const app = Application.currentApplication()

	// アプリケーション 'System Events' を参照します
	const systemEvents = Application('System Events')

	// プロセス 'Dock' を参照します
	const dock = systemEvents.processes['Dock']

	// Dock の UI 要素 (list 1 -> lists[0]) から 'ミュージック' を取得します
	// JXA は 0 から始まるインデックスを使用します
	const musicIcon = dock.lists[0].uiElements['ミュージック']

	let menu // メニューを格納する変数

	try {
		// 'AXShowMenu' アクションを実行 (右クリックメニューを表示)
		musicIcon.actions['AXShowMenu'].perform()

		// メニューが表示されるまで最大5秒間待機します (0.1秒 * 50回)
		for (let i = 0; i < 50; i++) {
			if (musicIcon.menus[0].exists()) {
				menu = musicIcon.menus[0] // menu 1 -> menus[0]
				break
			}
			app.delay(0.1)
		}

		if (menu) {
			// メニュー項目を取得します
			// menu item 2 -> menuItems[1]
			// menu item 3 -> menuItems[2]
			const trackName = menu.menuItems[1].name()
			const artistAndAlbum = menu.menuItems[2].name()

			// JavaScript のオブジェクトを作成します
			const result = {
				trackName: trackName,
				artistAndAlbum: artistAndAlbum
			}

			// メニューを閉じるために Enter キーを押します (key code 36)
			systemEvents.keyCode(36)

			// オブジェクトを JSON 文字列に自動的に変換して返します
			// JXA (JavaScript) では JSON.stringify を使うのが標準です
			return JSON.stringify(result)
		} else {
			// メニューが見つからなかった場合
			const errorResult = {
				error: 'メニューの取得に失敗しました。'
			}
			return JSON.stringify(errorResult)
		}
	} catch (e) {
		// 'ミュージック' アイコンが見つからない場合などのエラー
		const errorResult = {
			error: 'スクリプトの実行に失敗しました: ' + e.message
		}
		return JSON.stringify(errorResult)
	}
}
