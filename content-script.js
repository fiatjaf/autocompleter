/* global chrome */

const $ = window.jQuery

const autocomplete = require('./autocomplete')
const grabsentences = require('./grab-sentences')

function main () {
  // this global check will prevent us from running main() multiple times.
  if ($('#autocompleter-done').length) return
  $('body').append($('<span id="autocompleter-done">'))

  $('body').on('blur', 'textarea', e => grabsentences(e.target))
  $('body').on('submit', 'form', e =>
    $(e.target).find('textarea').each((_, textarea) =>
      grabsentences(textarea)
    )
  )

  // init autocomplete context in current textareas
  $('textarea').each((_, textarea) => {
    autocomplete(textarea)
  })

  // and in all new textareas that may appear
  let observer = new window.MutationObserver(mutations => {
    mutations.forEach(mutation => {
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        let node = mutation.addedNodes[i]
        if (node.tagName === 'TEXTAREA') {
          autocomplete(node)
        }
      }
    })
  })

  observer.observe(document.body, {childList: true})
}

main()
chrome.runtime.onMessage.addListener(function () {
  main()
  setTimeout(main, 4000)
})
