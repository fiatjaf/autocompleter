/* global emit */

const PouchDB = require('pouchdb-core')
  .plugin(require('pouchdb-mapreduce'))
  .plugin(require('pouchdb-adapter-idb'))
  .plugin(require('pouchdb-ensure'))
  .plugin(require('pouchdb-quick-search'))

const db = new PouchDB('autocompleter')
module.exports = db

db.viewCleanup()
db.compact()

db.ensure({
  _id: '_design/main',
  views: {
    'next-word': {
      map: function (doc) {
        // copied from https://github.com/timjrobinson/split-string-words
        function tokenize (string) {
          if (!string) return []
          return string.match(/"(?:\\"|[^"])+"|[^\s]+/g)
            .map(function (word) {
              return word
                .replace(/^\"|\"$/g, '') // remove quotes
                .replace(/\W*|\W*$/, '') // remove everything that is not a letter or number
            })
        }

        doc.s.forEach(s => {
          var tokens = tokenize(s)
          for (var i = 0; i < (tokens.length - 1); i++) {
            var word = tokens[i]
            var next = tokens[i + 1]
            emit(word, next)
          }
        })
      }.toString()
    }
  }
})
