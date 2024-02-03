// ==UserScript==
// @name         YouTube - Custom Enhancements
// @namespace    Violentmonkey Scripts
// @author       ushruff
// @version      0.6.0
// @description
// @match        https://*.youtube.com/*
// @icon
// @downloadURL  https://raw.githubusercontent.com/ush-ruff/YouTube-Custom-Enhancements/blob/main/script.user.js
// @grant        none
// ==/UserScript==

// https://cdn.jsdelivr.net/npm/@violentmonkey/dom@1
// https://cdn.jsdelivr.net/gh/CoeJoder/waitForKeyElements.js@v1.2/waitForKeyElements.js
// https://developers.google.com/youtube/iframe_api_reference?csw=1#Events=
// https://stackoverflow.com/questions/8802498/youtube-iframe-api-setplaybackquality-or-suggestedquality-not-working


// -----------------------
// CONFIGURABLE VARIABLES
// -----------------------
const SET_PLAYER_SIZE = false
const CLOSE_SIDEBAR = false

const QUALITY_KEYS = {
  // key: "hd2160",
  // key: "hd1440",
  65: "hd1080",
  83: "hd720",
  68: "large",
  // key: "medium",
  // key: "small",
  // key: "tiny",
  81: "auto",
  90: "decrease",
  88: "increase"
}

const SPEED_KEYS = {
  107: "increase",
  109: "decrease",
  106: "default"
}

const DEFAULT_TAB_HREF = "videos"

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

const RX_CHANNEL_HOME = /^(https?:\/\/www\.youtube\.com)((\/(@\\?.*))|\/(user|channel|c)\/[^\/]+(\/?$|\/featured))/
const DEFAULT_TAB_ENDPOINT_PARAMS = encodeURIComponent(btoa(String.fromCharCode(0x12, 0x06) + DEFAULT_TAB_HREF))


// --------------------
// Add Event Listeners
// --------------------
if (SET_PLAYER_SIZE) {
  document.addEventListener("yt-navigate-finish", () => {
    // waitForKeyElements(PLAYER_ID, setPlayerSize)
    setPlayerSize()
  })
}

if (CLOSE_SIDEBAR) {
  document.addEventListener("yt-navigate-finish", closeSidebar)
}

document.addEventListener("yt-navigate-finish", setupToast, {once: true})

document.addEventListener("keydown", (e) => {
  const player = document.querySelector(`ytd-watch-flexy:not([hidden]) #${PLAYER_ID}`)
  const iframePlayer = document.querySelector(`body > #player #${PLAYER_ID}`)
  if (player !== null || iframePlayer !== null) getKey(e)
})

document.addEventListener("mousedown", (e) => {
  const a = e.target.closest("a")
  if (!a) return
  changeChannelDefaultTab(a)
}, true)

window.addEventListener("load", changeChannelDefaultTabOnLoad, {once: true})


// ----------------
// Set Player Size
// ----------------
function setPlayerSize() {
  setInterval(function() {
    const player = document.getElementById("movie_player")
    if (!player) return
    const size = player.clientHeight
    if (!player.isFullscreen() && player.getPlayerSize().height !== size)
      // console.log(size, player.getPlayerSize().height)
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
function changePlaybackQuality(key) {
  // get player, available quality and current quality
  const player = document.getElementById(PLAYER_ID)
  const availableQuality = player.getAvailableQualityLevels()
  const currentQuality = player.getPlaybackQuality()
  let newQualityLabel

  const currentQualityIndex = availableQuality.indexOf(currentQuality)

  // change quality
  if (QUALITY_KEYS[key] === "increase") {
    if (currentQualityIndex == 0) {
      newQualityLabel = currentQuality
    }
    else if (currentQualityIndex > 0) {
      player.setPlaybackQualityRange(availableQuality[currentQualityIndex - 1])
      newQualityLabel = availableQuality[currentQualityIndex - 1]
    }
  }
  else if (QUALITY_KEYS[key] === "decrease") {
    if (currentQualityIndex == availableQuality.length - 2) {
      newQualityLabel = currentQuality
    }
    else if (currentQualityIndex < availableQuality.length - 2) {
      player.setPlaybackQualityRange(availableQuality[currentQualityIndex + 1])
      newQualityLabel = availableQuality[currentQualityIndex + 1]
    }
  }
  else if (QUALITY_KEYS[key] === "auto") {
    setQualityAuto()
  }
  else {
    player.setPlaybackQualityRange(QUALITY_KEYS[key])
    newQualityLabel = QUALITY_KEYS[key]
  }

  // const newQuality = QUALITY_KEYS[key] === "auto" ? "Auto" : QUALITY_LABELS[player.getPlaybackQuality()]
  const newQuality = QUALITY_KEYS[key] === "auto" ? "Auto" : QUALITY_LABELS[newQualityLabel]
  updateToastText(`${newQuality}`)
}


// -------------------
// Set playback speed
// -------------------
function changePlaybackSpeed(key) {
  // get player and current speed
  const player = document.getElementById(PLAYER_ID)
  const currentSpeed = player.getPlaybackRate()
  let newSpeed

  // change speed
  if (SPEED_KEYS[key] === "decrease" && currentSpeed > 0.25) {
    newSpeed = currentSpeed - 0.25
  }
  else if (SPEED_KEYS[key] === "increase" && currentSpeed < 2) {
    newSpeed = currentSpeed + 0.25
  }
  else if (SPEED_KEYS[key] === "default" && currentSpeed !== 1) {
    newSpeed = 1
  }

  if (newSpeed === undefined) return

  player.setPlaybackRate(newSpeed)
  updateToastText(`${newSpeed}x`)
}


// ---------------------------
// Change channel default tab
// ---------------------------
function changeChannelDefaultTab(a) {
  if (a && RX_CHANNEL_HOME.test(a.href) && !a.href.endsWith(DEFAULT_TAB_HREF)) {
    a.href = a.href + "/" + DEFAULT_TAB_HREF

    // without this the url in the browsers navigation bar will show the wrong url but the videos tab is still being loaded
    try { a.data.commandMetadata.webCommandMetadata.url = a.href } catch (e) {}

    // this makes sure that the videos tab is the one actually being loaded
    try { a.data.browseEndpoint.params = DEFAULT_TAB_ENDPOINT_PARAMS } catch (e) {}
  }
}

function changeChannelDefaultTabOnLoad() {
  if (RX_CHANNEL_HOME.test(location.href) && String(location.href).indexOf(DEFAULT_TAB_HREF) === -1) {
    // this will get invoked when a youtube channel link is reached from a non-youtube origin page
    // where we didn't rewrite the link
    location.href = RegExp.$2 + "/" + DEFAULT_TAB_HREF
    return
  }
}


// -----------------
// Helper Functions
// -----------------
function getKey(e) {
  const key = e.keyCode || window.keyCode

  if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA" || e.target.id == "contenteditable-root") {
    return
  }

  if (e.ctrlKey === true || e.shiftKey === true || e.altKey === true) {
    return
  }

  if (SPEED_KEYS[key]) {
    changePlaybackSpeed(key)
  }
  else if (QUALITY_KEYS[key]) {
    changePlaybackQuality(key)
  }
}

function setQualityAuto() {
  // click player settings
  const settingsBtn = document.querySelector(".ytp-chrome-bottom .ytp-right-controls .ytp-settings-button")
  settingsBtn.click()

  // click quality tab
  const qualityBtn = document.querySelector(".ytp-settings-menu .ytp-panel-menu .ytp-menuitem:last-child .ytp-menuitem-label")
  qualityBtn.click()

  // click on quality auto
  const availableQuality = document.querySelectorAll(".ytp-settings-menu .ytp-quality-menu .ytp-menuitem-label span:last-child")
  const autoQuality = availableQuality[availableQuality.length - 1]
  autoQuality.click()

  // give focus back to player
  const player = document.getElementById(PLAYER_ID)
  player.focus()
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
