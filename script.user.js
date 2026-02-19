// ==UserScript==
// @name         YouTube - Custom Enhancements
// @namespace    Violentmonkey Scripts
// @author       ushruff
// @version      1.0.0
// @description
// @match        https://*.youtube.com/*
// @icon
// @homepageURL  https://github.com/ush-ruff/YouTube-Custom-Enhancements/
// @downloadURL  https://github.com/ush-ruff/YouTube-Custom-Enhancements/raw/main/script.user.js
// @grant        none
// @license      GNU GPLv3
// @run-at       document-start
// @require      https://raw.githubusercontent.com/ush-ruff/Common/refs/heads/main/Userscript-Helper-Lib/helpersLib.js
// ==/UserScript==

// https://developers.google.com/youtube/iframe_api_reference?csw=1#Events=
// https://stackoverflow.com/questions/8802498/youtube-iframe-api-setplaybackquality-or-suggestedquality-not-working

/*
 * Portions of this script are derived from work by
 * Bawdy Ink Slinger (2025), licensed under the MIT License.
 * See THIRD_PARTY_NOTICES.txt for full license text.
 */


// -----------------------
// CONFIGURABLE VARIABLES
// -----------------------
const SET_PLAYER_SIZE = false
const CLOSE_SIDEBAR = false

const DEFAULT_TAB_HREF = "videos"
const SPEED_CHANGE_FACTOR = 0.25
const DEBUG = false

const KEYS = {
  "A": {
    action: () => changePlaybackQuality("hd1080"),
    label: "Set quality to 1080p",
  },
  "S": {
    action: () => changePlaybackQuality("hd720"),
    label: "Set quality to 720p",
  },
  "D": {
    action: () => changePlaybackQuality("large"),
    label: "Set quality to 480p",
  },
  "Q": {
    action: () => changePlaybackQuality("auto"),
    label: "Set quality to Auto",
  },
  "Z": {
    action: () => changePlaybackQuality("decrease"),
    label: "Decrease playback quality",
  },
  "X": {
    action: () => changePlaybackQuality("increase"),
    label: "Increase playback quality",
  },
  "Shift + Z": {
    action: () => changePlaybackQuality("min quality"),
    label: "Set quality to minimum",
  },
  "Shift + X": {
    action: () => changePlaybackQuality("max quality"),
    label: "Set quality to maximum",
  },
  "-": {
    action: () => changePlaybackSpeed("decrease"),
    label: "Decrease playback speed",
  },
  "+": {
    action: () => changePlaybackSpeed("increase"),
    label: "Increase playback speed",
  },
  "*": {
    action: () => changePlaybackSpeed("default"),
    label: "Set speed to normal",
  }
}

// --------------------
// REFERENCE VARIABLES
// --------------------
const PLAYER_ID = "movie_player"
const TOAST_ID = "yt-custom-toast"

const QUALITY_LABELS = {
  "hd2160": "2160p",
  "hd1440": "1440p",
  "hd1080": "1080p",
  "hd720": "720p",
  "large": "480p",
  "medium": "360p",
  "small": "240p",
  "tiny": "144p"
}

const RX_CHANNEL_HOME = /^(https?:\/\/www\.youtube\.com)((\/(user|channel|c)\/[^/]+)|(\/@(?!.*\/)[^/]+))(\/?$|\/featured[^/])/

const { installKeyHandler } = window.ushruffUSKit


// --------------------
// Add Event Listeners
// --------------------
if (SET_PLAYER_SIZE) { document.addEventListener("yt-navigate-finish", setPlayerSize) }

if (CLOSE_SIDEBAR) { document.addEventListener("yt-navigate-finish", closeSidebar) }

document.addEventListener("yt-navigate-finish", setupToast, {once: true})

document.addEventListener("mousedown", (e) => { changeChannelDefaultTab(e) }, true)

window.addEventListener("load", () => { installKeyHandler(KEYS) })

;(async () => {
  // this will get invoked when a youtube channel link is reached from a non-youtube origin page,
  changeChannelDefaultTabOnLoad()
})()


// ----------------
// Set Player Size
// ----------------
function setPlayerSize() {
  setInterval(function() {
    const player = document.getElementById("movie_player")
    if (!player) return
    const size = player.clientHeight
    if (!player.isFullscreen() && player.getPlayerSize().height !== size)
      debug(size, player.getPlayerSize().height)
      player.setInternalSize()
  }, 1000)
}


// --------------
// Close Sidebar
// --------------
function closeSidebar() {
  const sidebar = document.getElementById("guide")
  if (sidebar.opened) {
    sidebar.removeAttribute("opened")
  }
}


// ---------------------
// Set playback quality
// ---------------------
function changePlaybackQuality(requestedQuality) {
  if (checkPlayerExists() === null) return

  // Get player, available quality and current quality
  const player = document.getElementById(PLAYER_ID)
  const availableQualityList = player.getAvailableQualityLevels()
  const currentQuality = player.getPlaybackQuality()
  const currentQualityIndex = availableQualityList.indexOf(currentQuality)

  const minQualityIndex = availableQualityList.length - 2   // -2 here is used to exclude "Auto"
  const maxQualityIndex = 0

  let newQuality = null

  switch (requestedQuality) {
    case "min quality":
      newQuality = availableQualityList[minQualityIndex]
      break

    case "max quality":
      newQuality = availableQualityList[maxQualityIndex]
      break

    case "increase":
      if (currentQualityIndex > maxQualityIndex) {
        newQuality = availableQualityList[currentQualityIndex - 1]
      }
      break

    case "decrease":
      if (currentQualityIndex < minQualityIndex) {
        newQuality = availableQualityList[currentQualityIndex + 1]
      }
      break

    case "auto":
      setQualityAuto()
      updateToastText("Auto")
      return

    default:
      // Set specific quality if valid
      if (availableQualityList.includes(requestedQuality)) {
        newQuality = requestedQuality
      }
      else {
        debug(`Invalid quality key: ${requestedQuality}`)
      }
  }

  // Apply the new quality and provide feedback
  if (newQuality) {
    player.setPlaybackQualityRange(newQuality)
    const qualityLabel = QUALITY_LABELS[newQuality] || newQuality
    updateToastText(`${qualityLabel}`)
    debug(`Quality set to: ${qualityLabel}`)
  }
  else if (requestedQuality === "increase" || requestedQuality === "decrease" || currentQualityIndex === minQualityIndex || currentQualityIndex === maxQualityIndex) {
    // Toast feedback for increase/decrease request when no change is applied
    updateToastText(`${QUALITY_LABELS[currentQuality] || currentQuality}`)
    debug(`No quality change applied for ${requestedQuality} `)
  }
  else {
    // No toast feedback for other cases when no change is applied
    debug("No quality change applied")
  }
}


// -------------------
// Set playback speed
// -------------------
function changePlaybackSpeed(requestedSpeed) {
  if (checkPlayerExists() == null) return

  // get player and current speed
  const player = document.getElementById(PLAYER_ID)
  const currentSpeed = player.getPlaybackRate()
  let newSpeed

  // change speed
  if (requestedSpeed === "decrease" && currentSpeed > 0.25) {
    newSpeed = currentSpeed - SPEED_CHANGE_FACTOR
  }
  else if (requestedSpeed === "increase" && currentSpeed < 2) {
    newSpeed = currentSpeed + SPEED_CHANGE_FACTOR
  }
  else if (requestedSpeed === "default" && currentSpeed !== 1) {
    newSpeed = 1
  }

  if (newSpeed === undefined) {
    updateToastText(`${currentSpeed}x`)
    return
  }

  newSpeed = roundDown(newSpeed, 2)
  player.setPlaybackRate(newSpeed)
  updateToastText(`${newSpeed}x`)
  debug(`Speed set to: ${newSpeed}x`)
}


// ---------------------------
// Change channel default tab
// ---------------------------
function changeChannelDefaultTab(event) {
  const anchorTag = event.target.closest('a')
  const anchorGoesToChannel = anchorTag && RX_CHANNEL_HOME.test(anchorTag.href)

  if (!anchorGoesToChannel) return

  // a channel link was clicked so it has to be rewritten before the actual navigation happens
  // e.g. when opening a channel link in a new tab
  const channelName = RegExp.$2
  anchorTag.href = channelName + "/" + DEFAULT_TAB_HREF

  anchorTag.data = {
    commandMetadata: {
      webCommandMetadata: {
        url: channelName + "/" + DEFAULT_TAB_HREF
      }
    },
    browseEndpoint: {
      browseId: buildBrowseId(anchorTag),
      params: `EgZ2aWRlb3MYAyAAcALyBg0KCzoEIgIIBKIBAggB`
    }
  }
}

function changeChannelDefaultTabOnLoad() {
  const startedOnChannel = RX_CHANNEL_HOME.test(location.href)
  if (!startedOnChannel) return
  location.href = RegExp.$2 + "/" + DEFAULT_TAB_HREF
}


// -----------------
// Helper Functions
// -----------------
function checkPlayerExists() {
  const player = document.querySelector(`ytd-watch-flexy:not([hidden]) #${PLAYER_ID}`)
  const iframePlayer = document.querySelector(`body > #player #${PLAYER_ID}`)
  return (player || iframePlayer)
}

function setQualityAuto() {
  const settingsBtn = document.querySelector(".ytp-chrome-bottom .ytp-right-controls .ytp-settings-button")
  settingsBtn.click()

  const qualityBtn = document.querySelector(".ytp-settings-menu .ytp-panel-menu .ytp-menuitem:last-child .ytp-menuitem-label")
  qualityBtn.click()

  const availableQuality = document.querySelectorAll(".ytp-settings-menu .ytp-quality-menu .ytp-menuitem-label span:last-child")
  const autoQuality = availableQuality[availableQuality.length - 1]
  autoQuality.click()

  // give focus back to player
  const player = document.getElementById(PLAYER_ID)
  player.focus()
}

function buildBrowseId(anchorTag) {
  const data = anchorTag._data ?? anchorTag.data
  const browseId = data?.browseEndpoint?.browseId
  return browseId
}

function debug(...args) {
  if (!DEBUG) return
  console.log(...args)
}

function roundDown(num, precision) {
  precision = Math.pow(10, precision)
  return Math.floor(num * precision) / precision
}

// ----------------
// Toast functions
// ----------------
function setupToast() {
  const parent = document.getElementById(PLAYER_ID)

  if (parent === null) {
    document.addEventListener("yt-navigate-finish", setupToast, {once: true})
    return
  }

  const toast = document.createElement("div")
  toast.id = TOAST_ID
  parent.append(toast)
  addStyle()
}

function updateToastText(text) {
  let toast = document.getElementById(TOAST_ID)

  if (toast === null) {
    setupToast()
    toast = document.getElementById(TOAST_ID)
  }

  let toastText = toast.querySelector(`.${TOAST_ID}-text`)
  if (toastText !== null) toastText.remove()

  toastText = document.createElement("div")
  toastText.classList.add(`${TOAST_ID}-text`)
  toast.append(toastText)
  toastText.textContent = text

  toastText.addEventListener("animationend", () => { toastText.remove() })
}

function addStyle() {
  const styleSheet = document.createElement("style")

  styleSheet.textContent = `
    #${TOAST_ID} {
      position: absolute;
      display: grid;
      place-items: center;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      user-select: none;
      z-index: 20;
    }
    
    .${TOAST_ID}-text {
      font-size: 175%;
      text-align: center;
      text-shadow: 0 0 2px rgba(0,0,0,.5);
      line-height: 1.3;
      padding: 10px 20px;
      background-color: rgba(0, 0, 0, .5);
      border-radius: 0.25rem;
      pointer-events: none;
      animation: fadeout .5s .3s linear 1 normal forwards;
    }
    
    @keyframes fadeout {
      0% {
        opacity: 1;
      }
      25% {
        opacity:1
      }
      to {
        opacity:0
      }
    }
  `
  document.head.append(styleSheet)
}
