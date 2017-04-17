/* global chrome */

const $ = window.jQuery

const autocomplete = require('./autocomplete')
const grabsentences = require('./grab-sentences')

function main () {
  // this global check will prevent us from running process() multiple times.
  if ($('#autocompleter-done').length) return
  $('#js-repo-pjax-container').append($('<span id="autocompleter-done">'))

  $('textarea').each((i, elem) => {
    grabsentences(elem, i)
    autocomplete(elem)
  })
}

main()
chrome.runtime.onMessage.addListener(function () {
  main()
  setTimeout(main, 4000)
})
