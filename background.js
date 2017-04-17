/* global chrome */

chrome.webNavigation.onHistoryStateUpdated.addListener(function (props) {
  var tabId = props.tabId
  chrome.tabs.sendMessage(tabId, true)
})

// show a page telling the user to input their token
// chrome.storage.sync.get('token', ({token}) => {
//   if (chrome.runtime.lastError) return
//
//   if (!token) {
//     chrome.storage.sync.get('seenOptions', ({seenOptions}) => {
//       if (chrome.runtime.lastError) return
//       if (!seenOptions) {
//         chrome.tabs.create({
//           url: '/options.html'
//         })
//       }
//     })
//   }
// })
