const $ = window.jQuery

const db = require('./db')

module.exports = function (textarea) {
  $(textarea).textcomplete([{ // tech companies
    match: /\b(\w{1,})$/,
    search: function (term, callback, match) {
      console.log('match', match)
      console.log('term', term)

      db.query('main/next-word')
        .then(res => res.rows)
        .then(rows => {
          console.log('fetched rows:', rows)
          callback(rows.map(r => r.value))
        })
        .catch(e => console.error('failed to fetch rows:', e))
    },
    index: 1,
    replace: function (word) {
      return word + ' '
    }
  }], {
    onKeydown: function (e, commands) {
      if (e.ctrlKey && e.keyCode === 74) {
        // Ctrl-J
        return commands.KEY_ENTER
      }
    }
  })
}
