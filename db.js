/* global chrome */

var proxy = {
  get: wrap('get'),
  put: wrap('put'),
  post: wrap('post'),
  ensure: wrap('ensure'),
  remove: wrap('remove'),
  query: wrap('query'),
  allDocs: wrap('allDocs'),
  bulkDocs: wrap('bulkDocs')
}

function wrap (method) {
  return function () {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        method: method,
        args: JSON.stringify(Array.prototype.slice.call(arguments))
      }, function (response) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }
        if (response.error) {
          reject(response.error)
          return
        }
        resolve(response)
      })
    })
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = proxy
} else {
  window.db = proxy
}
