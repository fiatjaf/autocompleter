/* global chrome, db */

function message (text) {
  document.getElementById('message').innerHTML = text
  setTimeout(() => document.getElementById('message').innerHTML = '', 10000)
}

function error (err) {
  message(err.message)
  console.error(err instanceof Error ? err : err.message)
}

/* limit */
chrome.storage.sync.get('limit', ({limit}) => {
  if (chrome.runtime.lastError) {
    error(chrome.runtime.lastError)
    return
  }

  limit = limit || 150

  if (document.getElementById('limit').value === '') {
    document.getElementById('limit').value = limit
  }
})

document.getElementById('limit').addEventListener('input', function (e) { message('') })
document.getElementById('limit').addEventListener('blur', function (e) {
  let limit = parseInt(e.target.value)

  if (!isNaN(limit) && limit > 0) {
    chrome.storage.sync.set({limit}, () => {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError)
        return
      }
      message('limit saved.')
    })
  }
})

/* currently stored */
var all
loadAll()

function loadAll () {
  db.allDocs({include_docs: true})
  .then(res => {
    let rows = res.rows.filter(r => r.id[0] !== '_')

    document.getElementById('nstored').innerHTML = rows.length
    document.getElementById('areis').innerHTML = rows.length === 1 ? 'is' : 'are'
    all = []

    document.getElementById('all').querySelector('tbody').innerHTML = ''

    rows.forEach(r => {
      all.push(r.doc)

      document.getElementById('all').querySelector('tbody').innerHTML += `
        <tr>
          <td>${r.doc.d}</td>
          <td><a href="${r.doc.h}" target=_blank>${r.doc.h}</a></td>
          <td>
            <ul>
              ${r.doc.s.map(sentence => `<li>${sentence}</li>`)}
            </ul>
          </td>
          <td><button>delete</button></td>
        </tr>
      `
    })
  })
  .catch(error)
}

document.getElementById('erase').addEventListener('click', e => {
  e.preventDefault()
  if (all.length > 5 ? window.confirm('are you sure?') : true) {
    db.bulkDocs(all.map(doc => {
      doc._deleted = true
      return doc
    }))
      .then(() => message('all deleted.'))
      .then(loadAll)
      .catch(error)
  }
})

var showing = false
document.getElementById('show').addEventListener('click', e => {
  e.preventDefault()
  showing = !showing
  document.getElementById('all').style.display = showing ? 'initial' : 'none'
})
