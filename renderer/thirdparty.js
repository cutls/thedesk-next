export const thirdparty = [{"package_name":"@cutls/megalodon@6.0.14","license":"MIT","publisher":"h3poteto","repository":"https://github.com/h3poteto/megalodon"},{"package_name":"@emoji-mart/react@1.1.1","license":"MIT","repository":"https://github.com/missive/emoji-mart"},{"package_name":"@rsuite/icons@1.0.3","license":"MIT","publisher":"hiyangguo@gmail.com","repository":"https://github.com/rsuite/rsuite-icons"},{"package_name":"cheerio@1.0.0-rc.12","license":"MIT","publisher":"Matt Mueller","repository":"https://github.com/cheeriojs/cheerio"},{"package_name":"dayjs@1.11.11","license":"MIT","publisher":"iamkun","repository":"https://github.com/iamkun/dayjs"},{"package_name":"electron-is-dev@1.2.0","license":"MIT","publisher":"Sindre Sorhus","repository":"https://github.com/sindresorhus/electron-is-dev"},{"package_name":"electron-next@3.1.5","license":"MIT","publisher":"leo","repository":"https://github.com/leo/electron-next"},{"package_name":"electron-window-state@5.0.3","license":"MIT","publisher":"Marcel Wiehle","repository":"https://github.com/mawie81/electron-window-state"},{"package_name":"emoji-mart@5.6.0","license":"MIT","repository":"https://github.com/missive/emoji-mart"},{"package_name":"font-list@1.5.1","license":"MIT","publisher":"oldj","repository":"https://github.com/oldj/node-font-list"},{"package_name":"parse-link-header@2.0.0","license":"MIT","publisher":"Thorsten Lorenz","repository":"https://github.com/thlorenz/parse-link-header"},{"package_name":"react-blurhash@0.3.0","license":"MIT","publisher":"nygardk","repository":"https://github.com/woltapp/react-blurhash"},{"package_name":"react-dom@18.2.0","license":"MIT","repository":"https://github.com/facebook/react"},{"package_name":"react-draggable@4.4.6","license":"MIT","publisher":"Matt Zabriskie","repository":"https://github.com/react-grid-layout/react-draggable"},{"package_name":"react-icons@5.2.1","license":"MIT","publisher":"Goran Gajic","repository":"https://github.com/react-icons/react-icons"},{"package_name":"react-intl@6.6.8","license":"BSD-3-Clause","publisher":"Eric Ferraiuolo","repository":"https://github.com/formatjs/formatjs"},{"package_name":"react-resizable@3.0.5","license":"MIT","publisher":"Samuel Reed","repository":"https://github.com/react-grid-layout/react-resizable"},{"package_name":"react-viewer@3.2.2","license":"MIT","publisher":"infeng","repository":"https://github.com/infeng/react-viewer"},{"package_name":"react-virtuoso@4.7.11","license":"MIT","publisher":"Petyo Ivanov","repository":"https://github.com/petyosi/react-virtuoso"},{"package_name":"react@18.2.0","license":"MIT","repository":"https://github.com/facebook/react"},{"package_name":"rsuite@5.60.2","license":"MIT","publisher":"React Suite Team","repository":"https://github.com/rsuite/rsuite"},{"package_name":"sanitize-html@2.13.0","license":"MIT","publisher":"Apostrophe Technologies, Inc.","repository":"https://github.com/apostrophecms/sanitize-html"},{"package_name":"sass@1.77.4","license":"MIT","publisher":"Natalie Weizenbaum","repository":"https://github.com/sass/dart-sass"},{"package_name":"superagent@9.0.2","license":"MIT","publisher":"TJ Holowaychuk","repository":"https://github.com/ladjs/superagent"},{"package_name":"thedesk-next@25.0.11","license":"This Software","publisher":"cutls"}]; export const packages = {"private":true,"main":"main-build/index.js","name":"thedesk-next","author":{"name":"cutls","email":"p@cutls.dev","url":"https://cutls.dev"},"version":"25.0.11","codename":"Aiko","packageManager":"pnpm@9.9.0","scripts":{"clean":"rimraf dist main renderer/out renderer/.next","dev":"npm run build-electron && electron .","build-renderer":"next build renderer","build-electron":"tsc -p electron-src","build":"npm run thirdparty && npm run build-renderer && npm run build-electron","pack:mac":"electron-builder --mac --universal","pack:linux":"electron-builder --linux --x64","pack:win":"electron-builder --windows --x64","dist":"npm run build && electron-builder","type-check":"tsc -p ./renderer/tsconfig.json && tsc -p ./electron-src/tsconfig.json","lint:fix":"npx @biomejs/biome check --write ./","thirdparty":"license-checker --production --json > thirdparty.json && node scripts/thirdparty.js"},"dependencies":{"@cutls/megalodon":"6.0.14","@emoji-mart/react":"^1.1.1","@rsuite/icons":"^1.0.3","cheerio":"1.0.0-rc.12","dayjs":"^1.11.11","electron-is-dev":"^1.2.0","electron-next":"^3.1.5","electron-window-state":"^5.0.3","emoji-mart":"^5.6.0","font-list":"^1.5.1","parse-link-header":"^2.0.0","react":"18.2.0","react-blurhash":"^0.3.0","react-dom":"18.2.0","react-draggable":"^4.4.6","react-icons":"^5.2.1","react-intl":"^6.6.8","react-resizable":"^3.0.5","react-viewer":"^3.2.2","react-virtuoso":"4.7.11","rsuite":"5.60.2","sanitize-html":"^2.13.0","sass":"^1.77.4","superagent":"^9.0.2"},"devDependencies":{"@biomejs/biome":"^1.8.0","@electron/notarize":"^2.3.2","@types/node":"^14.18.63","@types/react":"^16.14.52","@types/react-dom":"^16.9.24","@types/react-resizable":"^3.0.7","@types/sanitize-html":"^2.11.0","@types/superagent":"^8.1.7","electron":"^27.1.2","electron-builder":"^24.9.1","license-checker":"^25.0.1","next":"^14.2.3","rimraf":"^3.0.2","typescript":"^4.9.5"},"resolutions":{"react":"18.2.0","react-dom":"18.2.0"},"build":{"asar":true,"productName":"TheDesk","appId":"next.top.thedesk","afterSign":"build-tool/notarize.js","files":["main-build","renderer/out","native"],"win":{"target":"msi","icon":"assets/desk.ico","publisherName":"cutls"},"msi":{"oneClick":false},"linux":{"target":["zip","deb"]},"mac":{"mergeASARs":false,"icon":"assets/icon.icns","hardenedRuntime":true,"gatekeeperAssess":false,"entitlements":"build-tool/entitlements.mac.plist","entitlementsInherit":"build-tool/entitlements.mac.plist"},"dmg":{"sign":false}}};