// ==UserScript==
// @name         YouTube - Custom Enhancements
// @namespace    Violentmonkey Scripts
// @author       ushruff
// @version      0.8.1
// @description
// @match        https://*.youtube.com/*
// @icon
// @homepageURL  https://github.com/ush-ruff/YouTube-Custom-Enhancements/
// @downloadURL  https://github.com/ush-ruff/YouTube-Custom-Enhancements/raw/main/script.user.js
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

const KEYS = {
  // key: fnCall()
}

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
  88: "increase",
  "shift+90": "min quality",
  "shift+88": "max quality"
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

const RX_CHANNEL_HOME = /^(https?:\/\/www\.youtube\.com)((\/(@[^\/]+))|\/(user|channel|c)\/[^\/]+)(\/?$|\/featured)/

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

document.addEventListener("keydown", pressKey)

document.addEventListener("click", (e) => {
  const target = e.target.closest('a')
  if (!target) return
  changeChannelDefaultTab(e, target)
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
  if (checkPlayerExists() == null) return

  // Get player, available quality and current quality
  const player = document.getElementById(PLAYER_ID)
  const availableQualityLevels = player.getAvailableQualityLevels()
  const currentQuality = player.getPlaybackQuality()
  const currentIndex = availableQualityLevels.indexOf(currentQuality)

  const MIN_QUALITY_INDEX = availableQualityLevels.length - 2
  const MAX_QUALITY_INDEX = 0

  let newQuality = null

  switch (QUALITY_KEYS[key]) {
    case "min quality":
      newQuality = availableQualityLevels[MIN_QUALITY_INDEX]
      break

    case "max quality":
      newQuality = availableQualityLevels[MAX_QUALITY_INDEX]
      break

    case "increase":
      if (currentIndex > MAX_QUALITY_INDEX) {
        newQuality = availableQualityLevels[currentIndex - 1]
      }
      break

    case "decrease":
      if (currentIndex < MIN_QUALITY_INDEX) {
        newQuality = availableQualityLevels[currentIndex + 1]
      }
      break

    case "auto":
      setQualityAuto()
      updateToastText("Auto")
      return

    default:
      // Set specific quality if valid
      if (availableQualityLevels.includes(QUALITY_KEYS[key])) {
        newQuality = QUALITY_KEYS[key]
      } else {
        console.warn(`Invalid quality key: ${QUALITY_KEYS[key]}`)
      }
  }

  // Apply the new quality and/or provide feedback
  if (newQuality) {
    player.setPlaybackQualityRange(newQuality)
    const qualityLabel = QUALITY_LABELS[newQuality] || newQuality
    console.log(`Quality set to: ${qualityLabel}`)
    updateToastText(`${qualityLabel}`)
  }
  else if (QUALITY_KEYS[key] === "increase" || QUALITY_KEYS[key] === "decrease") {
    // Toast feedback for increase/decrease request when no change is applied
    console.log(`No quality change applied for ${QUALITY_KEYS[key]} `)
    updateToastText(`${QUALITY_LABELS[currentQuality] || currentQuality}`)
  }
  else {
    // No toast feedback for other cases when no change is applied
    console.log("No quality change applied")
  }
}


// -------------------
// Set playback speed
// -------------------
function changePlaybackSpeed(key) {
  if (checkPlayerExists() == null) return

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
  console.log(`Speed set to: ${newSpeed}x`)
  updateToastText(`${newSpeed}x`)
}


// ---------------------------
// Change channel default tab
// ---------------------------
function changeChannelDefaultTab(e, target) {
  if (!target || !target.href) return

  if (RX_CHANNEL_HOME.test(target.href) && !target.href.endsWith(DEFAULT_TAB_HREF) && !target.href.includes('/' + DEFAULT_TAB_HREF)) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()

    const newUrl = target.href.replace(/\/?$/, '').replace(/\/featured$/, '') + "/" + DEFAULT_TAB_HREF

    if (window.ytNavigate) {
      window.ytNavigate(newUrl)
    } else if (window.location.href === newUrl) {
      window.location.reload()
    } else {
      window.history.pushState(null, '', newUrl)
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    }

    return false
  }
}

function changeChannelDefaultTabOnLoad() {
  if (RX_CHANNEL_HOME.test(location.href) && !location.href.includes(DEFAULT_TAB_HREF)) {
    const match = location.href.match(RX_CHANNEL_HOME)
    if (match && match[2]) {
      location.href = match[1] + match[2].replace(/\/?$/, '').replace(/\/featured$/, '') + "/" + DEFAULT_TAB_HREF
    }
  }
}


// -----------------
// Helper Functions
// -----------------
function pressKey(e) {
  let key = e.keyCode

  if (e.ctrlKey) key = `ctrl+${key}`
  if (e.shiftKey) key = `shift+${key}`
  if (e.altKey) key = `alt+${key}`

  if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA" || e.target.id == "contenteditable-root") return

  console.log(key)

  if (key in KEYS) {
    return KEYS[key]()
  }
  else if (SPEED_KEYS[key]) {
    changePlaybackSpeed(key)
  }
  else if (QUALITY_KEYS[key]) {
    changePlaybackQuality(key)
  }
}

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
