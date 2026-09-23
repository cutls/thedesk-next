export const openInBrowser = (url: string) => {
    if (window.electronAPI) window.electronAPI.openBrowser(url)
    if (!window.electronAPI) window.open(url, '_blank')
}
export const openInApp = (url: string) => {
    if (window.electronAPI) window.electronAPI.openInAppBrowser(url)
}
export const writeText = (text: string) => {
    if (window.electronAPI) window.electronAPI.openBrowser(text)
    if (!window.electronAPI) navigator.clipboard.writeText(text)
}
