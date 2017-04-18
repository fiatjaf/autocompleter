const $ = window.jQuery
const fuzzy = require('fuzzy')

const db = require('./db')

module.exports = function (textarea) {
  $(textarea).textcomplete([{
    match: /(\w+) +(\w*)$/,
    search: function (_, callback, match) {
      db.query('main/next-word', {key: match[1].toLowerCase()})
        .then(res => res.rows .map(r => r.value))
        .then(values => {
          console.log('fetched', values)

          if (match[2]) {
            values = fuzzy.filter(match[2].toLowerCase(), values)
              .sort((a, b) => a.score - b.score)
              .map(item => item.string)
          }

          callback(values)
        })
        .catch(e => console.error('failed to fetch rows:', e))
    },
    index: 2,
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
