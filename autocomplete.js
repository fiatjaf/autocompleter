const $ = window.jQuery
const fuzzy = require('fuzzy')

const db = require('./db')

module.exports = function oninput (textarea) {
  var match
  let container = $('.autocompleter').html('')

  var searches = []

  // full sentences
  /* from the first word or from the last three. */
  let sentencePattern = /.*((?:\w+ +|^)(?:\w+ +|^)\w+) $/
  match = textarea.value.match(sentencePattern)
  if (match) {
    let p = db.search({
      fields: ['s'],
      query: match[1],
      include_docs: true
    })
    .then(res =>
      res.rows
        .map(r => r.doc.s)
        .reduce((a, b) => a.concat(b), [])
    )
    .then(values => {
      let replacer = sentence => sentence

      fuzzy.filter(match[1].toLowerCase(), values)
        .sort((a, b) => a.score - b.score)
        .slice(-2)
        .forEach(item => addSuggestion(
          item.string,
          replacer,
          sentencePattern
        ))
    })
    .catch(e => console.error('failed to fetch rows:', e))

    searches.push(p)
  }

  // next word
  let nextWordPattern = /(\w[^\b ]+) +(\w?[^\b ]*)$/
  match = textarea.value.match(nextWordPattern)
  if (match) {
    let p = db.query('main/next-word', {key: match[1].toLowerCase()})
    .then(res => res.rows.map(r => r.value))
    .then(values => {
      let replacer = word => function (m, prev, next) {
        return prev + ' ' + word + ' '
      }

      if (match[2]) {
        values = fuzzy.filter(match[2].toLowerCase(), values)
          .sort((a, b) => a.score - b.score)
          .filter(word => word !== match[2])
          .slice(-3)
          .map(item => item.string)
      }

      values.forEach(item => addSuggestion(
        item,
        replacer,
        nextWordPattern
      ))
    })
    .catch(e => console.error('failed to fetch rows:', e))

    searches.push(p)
  }

  var suggestions = []

  function addSuggestion (text, replacer, pattern) {
    let index = suggestions.length

    $(`<li><a data-index="${index}">${text}</a></li>`)
      .appendTo(container)

    suggestions.push({text, replacer, pattern})
  }

  // show suggestions
  let {left, top} = $(textarea).caret('offset')
  container.css({
    position: 'absolute',
    left: left + 5,
    top
  })
  container.show()

  // react to selection
  var selectedIndex = 0

  let handlekeydown = e => {
    switch (e.keyCode) {
      case 9: // tab
        select()
        e.preventDefault()
        break
      case 38: // up
        hover((suggestions.length - (selectedIndex - 1)) % suggestions.length)
        e.preventDefault()
        break
      case 40: // down
        hover((selectedIndex + 1) % suggestions.length)
        e.preventDefault()
        break
      case 37: // left
      case 39: // right
        stop()
        break
    }
  }
  $(textarea).on('keydown', handlekeydown)

  container.on('mouseover', 'li a', e => {
    hover(parseInt(e.target.dataset.index))
  })

  function hover (index) {
    $('.autocompleter li')
      .removeClass('active')
      .eq(index)
        .addClass('active')
    selectedIndex = index
  }

  container.on('click', 'li a', e => {
    hover(parseInt(e.target.dataset.index))
    select()
  })

  function select () {
    let selected = suggestions[selectedIndex]
    textarea.value = textarea.value.replace(
      selected.pattern, selected.replacer(selected.text)
    )

    stop()

    // start over from this new point
    module.exports(textarea)
  }

  function stop () {
    container.hide()
    $(textarea).off('keydown', handlekeydown)
  }

  // some work to do when we are sure the searches are done
  Promise.all(searches)
    .then(() => {
      if (suggestions.length) {
        hover(0) // default selected to first
      } else {
        stop()
      }
    })
}

// insert hidden suggestion container in the dom
document.body.innerHTML += '<ul style="display:none" class=autocompleter></ul>'
