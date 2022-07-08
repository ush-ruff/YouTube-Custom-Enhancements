// ==UserScript==
// @name         YouTube - Custom Enhancements
// @namespace    Violentmonkey Scripts
// @author       ushruff
// @version      0.4.0
// @description
// @match        https://*.youtube.com/*
// @icon
// @require      https://cdn.jsdelivr.net/gh/CoeJoder/waitForKeyElements.js@v1.2/waitForKeyElements.js
// @grant        none
// ==/UserScript==

// https://cdn.jsdelivr.net/npm/@violentmonkey/dom@1
// https://developers.google.com/youtube/iframe_api_reference?csw=1#Events=
// https://stackoverflow.com/questions/8802498/youtube-iframe-api-setplaybackquality-or-suggestedquality-not-working

// -----------------------
// CONFIGURABLE VARIABLES
// -----------------------
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


// --------------------
// Add Event Listeners
// --------------------
if (CLOSE_SIDEBAR) {
  document.addEventListener("yt-navigate-finish", closeSidebar)
}

document.addEventListener("yt-navigate-finish", setupToast, {once: true})
document.addEventListener("keydown", (e) => {
  const player = document.querySelector(`ytd-watch-flexy:not([hidden]) #${PLAYER_ID}`)
  const iframePlayer = document.querySelector(`body > #player #${PLAYER_ID}`)
  if (player !== null || iframePlayer !== null) getKey(e)
})


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
  
  // check key against available quality
  if (!(availableQuality.indexOf(key))) return
  
  const currentQualityIndex = availableQuality.indexOf(currentQuality)

  // change quality
  if (QUALITY_KEYS[key] === "increase") {
    if (currentQualityIndex > 0) {
      player.setPlaybackQualityRange(availableQuality[currentQualityIndex - 1])
    }
  }
  else if (QUALITY_KEYS[key] === "decrease") {
    if (currentQualityIndex < availableQuality.length - 2) {
      player.setPlaybackQualityRange(availableQuality[currentQualityIndex + 1])
    }
  }
  else if (QUALITY_KEYS[key] === "auto") {
    setQualityAuto()
  }
  else {
    player.setPlaybackQualityRange(QUALITY_KEYS[key])
  }

  const newQuality = QUALITY_KEYS[key] === "auto" ? "Auto" : QUALITY_LABELS[player.getPlaybackQuality()]
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

  createToast(parent)
  addStyle()
}

function createToast(parent) {
  const toast = document.createElement("div")

  toast.id = TOAST_ID
  toast.dataset.init = "true"

  parent.append(toast)
}

function updateToastText(text) {
  let toast = document.getElementById(TOAST_ID)
  
  if (toast === null) {
    toast = setupToast(document.getElementById(PLAYER_ID))
  }
  if (toast.getAttribute("data-init")) toast.removeAttribute("data-init")

  let toastText = toast.querySelector(`.${TOAST_ID}-text`)
  
  if (toastText !== null) toast.removeChild(toastText)
  
  toastText = document.createElement("div")
  toastText.classList.add(`${TOAST_ID}-text`)
  toast.append(toastText)
  toastText.textContent = text
  
  setTimeout(() => {toastText.dataset.fade = "true"}, 300)

  toastText.addEventListener("animationend", () => {
    toastText.dataset.fade = "false"
    toast.removeChild(toastText)
  }, {once: true})
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
  }
  [data-init=true] {
    opacity: 0;
  }
  [data-fade=true] {
    animation: fadeout .5s linear 1 normal forwards;
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
