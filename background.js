/* global emit, chrome */

// run on pjax
chrome.webNavigation.onHistoryStateUpdated.addListener(function (props) {
  var tabId = props.tabId
  chrome.tabs.sendMessage(tabId, true)
})

// setup main pouchdb
const PouchDB = require('pouchdb-core')
  .plugin(require('pouchdb-mapreduce'))
  .plugin(require('pouchdb-adapter-idb'))
  .plugin(require('pouchdb-ensure'))
  .plugin(require('pouchdb-quick-search'))

const db = new PouchDB('autocompleter')
window.db = db

db.viewCleanup()
  .then(() => console.log('views cleaned up.'))
  .catch(e => console.error('failed to cleanup views', e))
db.compact()
  .then(() => console.log('compacted.'))
  .catch(e => console.error('failed to compact.', e))

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
            var word = tokens[i].toLowerCase()
            var next = tokens[i + 1].toLowerCase()

            if (word.length > 20 || next.length > 20 ||
                next.length < 2) continue

            // one word and the next
            emit(word, next)

            // two words and the next
            if (i > 0) {
              let prev = tokens[i - 1].toLowerCase()
              if (prev.length > 20) continue

              emit([prev, word], next)
            }
          }
        })
      }.toString()
    },
    'by-date': {
      map: function (doc) {
        emit(doc.d)
      }.toString()
    }
  }
})

// ensure the database doesn't get too big
if (Math.random() < 0.1) {
  chrome.storage.sync.get('limit', ({limit}) => {
    if (chrome.runtime.lastError) {
      console.log('autocompleter error:', chrome.runtime.lastError.message)
      return
    }

    db.query('main/by-date', {descending: true})
    .then(res => {
      console.log(`autocompleter: contents of ${res.rows.length} stored.`)
      if (res.rows.length > limit) {
        console.log(`autocompleter: removing ${res.rows.length - limit} oldest.`)
        res.rows.slice(limit)
          .forEach(row => {
            db.remove(row.id, row.rev)
          })
      }
    })
  })
}

// act as a proxy for database calls from content-scripts and options page
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (!request.method) {
    // not a database request
    return
  }

  let method = request.method
  let args = JSON.parse(request.args)

  db[method].apply(db, args)
  .then(
    res => sendResponse(res),
    err => sendResponse({error: err})
  )

  return true
})
