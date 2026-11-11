try {
  var t = localStorage.getItem('changnok-theme')
  document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark'
  var font = localStorage.getItem('changnok-ui-font')
  document.documentElement.dataset.uiFont = ['neo', 'stardust', 'galmuri9', 'silver', 'ramche'].includes(font) ? font : 'neo'
  var savedFontSize = Number(localStorage.getItem('changnok-ui-font-size'))
  var fontSize = Number.isFinite(savedFontSize) && savedFontSize >= 80 && savedFontSize <= 130
    ? Math.round(savedFontSize / 5) * 5 : 100
  document.documentElement.dataset.uiFontSize = String(fontSize)
  document.documentElement.style.setProperty('--ui-font-scale', String(fontSize / 100))
} catch (e) {
  document.documentElement.dataset.theme = 'dark'
  document.documentElement.dataset.uiFont = 'neo'
  document.documentElement.dataset.uiFontSize = '100'
  document.documentElement.style.setProperty('--ui-font-scale', '1')
}
