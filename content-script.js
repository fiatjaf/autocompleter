/* global chrome */

const $ = window.jQuery

const autocomplete = require('./autocomplete')
const grabsentences = require('./grab-sentences')

function main () {
  // this global check will prevent us from running process() multiple times.
  if ($('#autocompleter-done').length) return
  $('#js-repo-pjax-container').append($('<span id="autocompleter-done">'))

  $('body').on('blur', 'textarea', e => grabsentences(e.target))
  $('body').on('submit', 'form', e =>
    $(e.target).find('textarea').each((_, textarea) =>
      grabsentences(textarea)
    )
  )
  $('body').on('input,focus', 'textarea', e => autocomplete(e.target))
  $('body').on('keyup', 'textarea', e => {
    switch (e.keyCode) {
      case 37:
      case 38:
      case 39:
      case 40:
        autocomplete(e.target)
    }
  })
}

main()
chrome.runtime.onMessage.addListener(function () {
  main()
  setTimeout(main, 4000)
})
