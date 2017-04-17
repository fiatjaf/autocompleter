const $ = window.jQuery

const db = require('./db')

module.exports = function (textarea, index) {
  let id = location.host + location.pathname + '#' + (textarea.id || '~' + index)

  $(textarea).on('blur', () => saveInput(id, textarea.value))
  $(textarea).closest('form').on('submit', () => saveInput(id, textarea.value))
}

function saveInput (id, text) {
  if (text.length < 10) return

  let today = new Date()
  let date = today.toISOString().split('T')[0]

  db.ensure({
    _id: id,
    d: date,
    t: text
  })
    .then(doc => console.log('input saved:', doc))
    .catch(e => console.error('failed to save input:', id, date, text))
}
