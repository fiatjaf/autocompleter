const $ = window.jQuery
const fuzzy = require('fuzzy')

const db = require('./db')

module.exports = function (textarea) {
  $(textarea).textcomplete([{
    // full sentences
    match: /.*((?:\w+ +|^)(?:\w+ +|^)\w+) $/, /* from the first word or from the last three. */
    search: function (_, callback, match) {
      console.log('searching full sentences: ', match[1])
      db.search({
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
        console.log('sentences:', values)

        values = fuzzy.filter(match[1].toLowerCase(), values)
          .sort((a, b) => a.score - b.score)
          .map(item => item.string)

        callback(values)
      })
      .catch(e => console.error('failed to fetch rows:', e))
    },
    replace: sentence => sentence
  }, {
    // next word
    match: /(\w[^\b ]+) +(\w?[^\b ]*)$/,
    search: function (_, callback, match) {
      db.query('main/next-word', {key: match[1].toLowerCase()})
      .then(res => res.rows.map(r => r.value))
      .then(values => {
        console.log('next', values)

        if (match[2]) {
          values = fuzzy.filter(match[2].toLowerCase(), values)
            .sort((a, b) => a.score - b.score)
            .map(item => item.string)
            .filter(word => word !== match[2])
        }

        callback(values)
      })
    },
    replace: word => function (m, prev, next) {
      return prev + ' ' + word + ' '
    }
  }], {
    onKeydown: function (e, commands) {
      if (e.ctrlKey && e.keyCode === 74 /* Ctrl-J */) {
        return commands.KEY_ENTER
      }
    }
  })

  $(textarea).on('textComplete:select', () => {
    $(textarea).textcomplete('trigger')
  })
}
