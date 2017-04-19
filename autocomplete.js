const $ = window.jQuery
const fuzzy = require('fuzzy')

const db = require('./db')

// insert hidden suggestion container in the dom
document.body.innerHTML += '<ul style="display:none" class=autocompleter></ul>'
const container = $('.autocompleter')

// context() creates a new autocompleting context for a given textarea
module.exports = function context (textarea) {
  var autocompleting = false
  var suggestions = []
  var searches = []
  var selectedIndex = 0

  $(textarea)
    .on('keydown', e => {
      e.stopImmediatePropagation()
      if (autocompleting) {
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
          case 27: // esc
          case 8: // backspace
          case 46: // delete
          case 32: // space
          case 13: // enter
            stop()
            break
        }
      }
    })
    .on('keyup', e => {
      e.stopImmediatePropagation()
      if (!autocompleting) {
        switch (e.keyCode) {
          case 37:
          case 38:
          case 39:
          case 40:
            // moving around triggers the autocomplete
            trigger()
        }
      }
    })
    .on('input', trigger)
    .on('focus', trigger)
    .on('focusout', stop)
    .on('mouseup', () => {
      if (textarea.selectionStart !== textarea.selectionEnd) {
        // selecting text
        stop()
      }
    })

  function trigger () {
    // reposition the suggestion box
    let {left, top} = $(textarea).caret('offset')
    container.css({
      position: 'absolute',
      left: left + 5,
      top
    })

    // the row of text we're dealing with:
    let line = caretLine(textarea)
    let text = textarea.value.split('\n')[line]

    if (autocompleting) {
      let lastword = text.match(/\b\w+$/)
      if (lastword) {
        // filter list against new input values we gathered
        selectedIndex = 0
        let filteredSuggestions =
          fuzzy.filter(lastword[0], suggestions, {extract: s => s.text})
            .sort((a, b) => a.score - b.score)
            .map(i => i.original)

        suggestions = []
        container.html('')

        filteredSuggestions
          .forEach(({text, replacer, pattern}) => addSuggestion(text, replacer, pattern))

        hover(0)
      }
      return
    }

    autocompleting = true
    container.show()
    console.log('trigger')

    // full sentences
    /* from the first word or from the last three. */
    let sentencePattern = /.*((?:\w+ +|^)(?:\w+ +|^)\w+) $/
    let sentenceMatch = text.match(sentencePattern)
    if (sentenceMatch) {
      let p = db.search({
        fields: ['s'],
        query: sentenceMatch[1],
        include_docs: true
      })
      .then(res => {
        // reduce and sort
        var values = {}
        for (let i = 0; i < res.rows.length; i++) {
          for (let j = 0; j < res.rows[i].doc.s.length; j++) {
            let sentence = res.rows[i].doc.s[j]
            values[sentence] = (values[sentence] || 0) + 1
          }
        }
        return Object.keys(values).sort((a, b) => values[a] - values[b])
      })
      .then(values => {
        let replacer = sentence => sentence

        fuzzy.filter(sentenceMatch[1].toLowerCase(), values)
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
    let nextWordMatch = text.match(nextWordPattern)
    if (nextWordMatch) {
      let p = db.query('main/next-word', {key: nextWordMatch[1].toLowerCase()})
      .then(res => {
        // reduce and sort
        var values = {}
        for (let i = 0; i < res.rows.length; i++) {
          let word = res.rows[i].value
          values[word] = (values[word] || 0) + 1
        }
        return Object.keys(values).sort((a, b) => values[a] - values[b])
      })
      .then(values => {
        let replacer = word => function (m, prev, next) {
          return prev + ' ' + word + ' '
        }

        if (nextWordMatch[2]) {
          values = fuzzy.filter(nextWordMatch[2].toLowerCase(), values)
            .sort((a, b) => a.score - b.score)
            .filter(word => word !== nextWordMatch[2])
            .map(item => item.string)
        }

        values
          .slice(-3)
          .forEach(item => addSuggestion(item, replacer, nextWordPattern))
      })
      .catch(e => console.error('failed to fetch rows:', e))

      searches.push(p)
    }

    // some work to do when we are sure the searches are done
    Promise.all(searches)
    .then(() => {
      if (suggestions.length) {
        hover(0) // default selected to first
      } else {
        autocompleting = false
      }
    })
  }

  function addSuggestion (text, replacer, pattern) {
    let index = suggestions.length
    console.log('suggestion', index, text)

    $(`<li><a data-index="${index}">${text}</a></li>`)
      .appendTo(container)

    suggestions.push({text, replacer, pattern})
  }

  container.on('mouseover', 'li a', e => {
    if (autocompleting) {
      hover(parseInt(e.target.dataset.index))
    }
  })

  container.on('click', 'li a', e => {
    if (autocompleting) {
      hover(parseInt(e.target.dataset.index))
      select()
    }
  })

  function hover (index) {
    $('.autocompleter li')
      .removeClass('active')
      .eq(index)
        .addClass('active')
    selectedIndex = index
  }

  function select () {
    let selected = suggestions[selectedIndex]

    let line = caretLine(textarea)
    let lines = textarea.value.split('\n')

    lines[line] = lines[line].replace(
      selected.pattern, selected.replacer(selected.text)
    )

    textarea.value = lines.join('\n')

    stop()
    trigger() // start over from this new point
  }

  function stop () {
    console.log('stop')
    container.hide()
    container.html('')

    autocompleting = false
    suggestions = []
    searches = []
    selectedIndex = 0
  }
}

function caretLine (textarea) {
  let caretpos = textarea.selectionEnd
  var linebreak = -1
  var row = -1
  for (; caretpos > linebreak;) {
    row++
    let nextlinebreak = textarea.value.slice(linebreak + 1).indexOf('\n')
    if (nextlinebreak === -1) {
      return row
    }
    linebreak = linebreak + nextlinebreak
  }
  return row
}
