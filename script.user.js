// ==UserScript==
// @name         YouTube - Custom Enhancements
// @namespace    Violentmonkey Scripts
// @author       ushruff
// @version      0.1.0
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

const QUALITY_LOOKUP = {
  65: "hd1080",
  83: "hd720",
  68: "large",
  81: "auto",
  90: "decrease",
  88: "increase"
}

const SPEED_LOOKUP = {
  107: "increase",
  109: "decrease",
  106: "default"
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
  if (!(QUALITY_LOOKUP[key])) return

  // get player, available quality and current quality
  const p = document.getElementById(PLAYER_ID)
  const availableQuality = p.getAvailableQualityLevels()
  const currentQuality = p.getPlaybackQuality()
  
  // check against availabele quality
  if (!(availableQuality.indexOf(key))) return
  
  const currentQualityIndex = availableQuality.indexOf(currentQuality)

  // change quality
  if (QUALITY_LOOKUP[key] === "increase") {
    if (currentQualityIndex > 0) {
      p.setPlaybackQualityRange(availableQuality[currentQualityIndex - 1])
    }
  }
  else if (QUALITY_LOOKUP[key] === "decrease") {
    if (currentQualityIndex < availableQuality.length - 2) {
      p.setPlaybackQualityRange(availableQuality[currentQualityIndex + 1])
    }
  }
  else if (QUALITY_LOOKUP[key] === "auto") {
    setQualityAuto()
  }
  else {
    p.setPlaybackQualityRange(QUALITY_LOOKUP[key])
  }
}


// -------------------
// Set playback speed
// -------------------
function changePlaybackSpeed(e) {
  // get key pressed
  const key = getKey(e)

  // check against lookup table
  if (!(SPEED_LOOKUP[key])) return

  const p = document.getElementById(PLAYER_ID)
  const currentSpeed = p.getPlaybackRate()
  let newSpeed

  // change speed
  if (SPEED_LOOKUP[key] === "decrease" && currentSpeed > 0.25) {
    newSpeed = currentSpeed - 0.25
  }
  else if (SPEED_LOOKUP[key] === "increase" && currentSpeed < 2) {
    newSpeed = currentSpeed + 0.25
  }
  else if (SPEED_LOOKUP[key] === "default" && currentSpeed !== 1) {
    newSpeed = 1
  }

  if (newSpeed === undefined) return

  p.setPlaybackRate(newSpeed)
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

  if (parent !== null || parent !== undefined) {
    document.addEventListener("yt-navigate-finish", setupToast, {once: true})
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
  const toast = document.getElementById(id)
  const toastText = toast.querySelector(`.${id}-text`)
  
  toastText.textContent = text

  if (toast.getAttribute("data-init")) toast.removeAttribute("data-init")
  toast.dataset.hidden = "false"

  setTimeout(() => {
    toast.dataset.hidden = "true"
  }, 500);
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
    padding: 1em;
    background-color: rgba(0, 0, 0, .5);
    border-radius: 0.5rem;
    transform: translateX(-50%);
    user-select: none;
    z-index: 99;
  }
  #${TOAST_ID}[data-init=true] {
    opacity: 0;
  }
  #${TOAST_ID}[data-hidden=true] {
    animation: fadeout .25s linear 1 normal forwards;
  }
  .${TOAST_ID}-text {
    font-size: 16px;
    text-align: center;
    text-shadow: 0 0 2px rgba(0,0,0,.5);
  }

  @keyframes fadeout {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: translateX(-50%) scale(1.5);
    }
  }
  `
  document.head.append(styleSheet)
}

