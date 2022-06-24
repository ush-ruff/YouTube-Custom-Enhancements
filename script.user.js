// ==UserScript==
// @name         YouTube - Custom Enhancements
// @namespace    Violentmonkey Scripts
// @author       ushruff
// @version      0.3.0
// @description
// @match        https://*.youtube.com/*
// @icon
// @require      https://cdn.jsdelivr.net/npm/@violentmonkey/dom@1
// @require      https://cdn.jsdelivr.net/gh/CoeJoder/waitForKeyElements.js@v1.2/waitForKeyElements.js
// @grant        none
// ==/UserScript==

// https://developers.google.com/youtube/iframe_api_reference?csw=1#Events=
// https://stackoverflow.com/questions/8802498/youtube-iframe-api-setplaybackquality-or-suggestedquality-not-working

"use strict"

// const SET_PLAYER_SIZE = true

// if (SET_PLAYER_SIZE) { 
//   document.addEventListener("yt-navigate-finish", () => {
//     waitForKeyElements("#movie-player", setPlayerSize)
//   }) 
// }

// // Set Player Size
// function setPlayerSize(p) {
//   const s = p.clientHeight
//   const ep = p.wrappedJSObject || p

//   if (ep.setInternalSize && ep.isFullscreen && ep.getPlayerSize && !ep.isFullscreen() && ep.getPlayerSize().height != s) {
//     ep.setInternalSize()
//   }
//   console.log("success")
// }

// -----------------------
// CONFIGURABLE VARIABLES
// -----------------------
const PLAYER_ID = "movie_player"
const TOAST_ID = "yt-custom-toast"

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
document.addEventListener("yt-navigate-finish", setupToast, {once: true})
document.addEventListener("keydown", changePlaybackQuality)
document.addEventListener("keydown", changePlaybackSpeed)


// ---------------------
// Set playback quality
// ---------------------
function changePlaybackQuality(e) {
  // get key pressed
  const key = getKey(e)

  // check against lookup table
  if (!(QUALITY_KEYS[key])) return

  // get player, available quality and current quality
  const player = document.getElementById(PLAYER_ID)
  const availableQuality = player.getAvailableQualityLevels()
  const currentQuality = player.getPlaybackQuality()
  
  // check against availabele quality
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
  updateToastText(TOAST_ID, `${newQuality}`)
}


// -------------------
// Set playback speed
// -------------------
function changePlaybackSpeed(e) {
  // get key pressed
  const key = getKey(e)

  // check against lookup table
  if (!(SPEED_KEYS[key])) return

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
  updateToastText(TOAST_ID, `${newSpeed}x`)
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
  
  return key
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

  settingsBtn.blur()
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

  createToast(TOAST_ID, parent)
  addStyle()
}

function createToast(id, parent) {
  const toast = document.createElement("div")
  const toastText = document.createElement("div")

  toast.id = id
  toast.dataset.init = "true"

  toastText.classList.add(`${id}-text`)
  toast.append(toastText)

  parent.append(toast)
}

function updateToastText(id, text) {
  let toast = document.getElementById(id)
  
  if (toast === null) {
    toast = createToast(TOAST_ID, document.getElementById(PLAYER_ID))
  }

  const toastText = toast.querySelector(`.${id}-text`)
  
  toastText.textContent = text

  if (toast.getAttribute("data-init")) toast.removeAttribute("data-init")
  toast.dataset.hidden = "false"

  setTimeout(() => {
    toast.dataset.hidden = "true"
  }, 300);
}

function addStyle() {
  const styleSheet = document.createElement("style")
  styleSheet.textContent = `
  #${TOAST_ID} {
    position: absolute;
    display: grid;
    place-items: center;
    min-width: 4em;
    min-height: 2em;
    top: 15%;
    left: 50%;
    font-family: inherit;
    padding: 10px;
    background-color: rgba(0, 0, 0, .75);
    border-radius: 0.25rem;
    transform: translateX(-50%);
    user-select: none;
    z-index: 99;
  }
  #${TOAST_ID}[data-init=true] {
    opacity: 0;
  }
  #${TOAST_ID}[data-hidden=true] {
    animation: fadeout .5s linear 1 normal forwards;
  }
  .${TOAST_ID}-text {
    font-size: 19px;
    text-align: center;
    text-shadow: 0 0 2px rgba(0,0,0,.5);
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

