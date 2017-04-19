const md5 = require('pouchdb-md5').stringMd5

const db = require('./db')

module.exports = function grabsentences (textarea) {
  if (textarea.value.length < 10) return

  let today = new Date()
  let date = today.toISOString().split('T')[0]

  db.ensure({
    _id: md5(
      location.host + location.pathname + '?' + location.search +
      '#' + textarea.id + '.' + textarea.className.split('.').join('.')
    ).slice(0, 5),
    h: location.href,
    d: date,
    s: textarea.value.split(/\.|!|\?|;|:/) // sentences
         .map(x => x.trim())
         .filter(x => x)
  })
    .then(doc => console.log('input saved:', doc))
    .catch(e => console.error('failed to save input:', location.host, textarea.value, e))
}
