# 💡 Boundary X - Bluetooth Lamp Controller

A frontend-only micro:bit NeoPixel controller. All LEDs share one RGB color. No AI service, backend, or build step is required.

![Version](https://img.shields.io/badge/version-1.0.0-success)
![Platform](https://img.shields.io/badge/platform-Web-blue)
![Technology](https://img.shields.io/badge/stack-JavaScript%20%7C%20Web%20Bluetooth-00E676)

**[Open the Web App](https://boundary-x.github.io/bluetooth_lamp_controller/)**

No Node.js installation is needed to use the published web app.

## Features
- Touch color wheel, RGB entry, presets, and brightness.
- Editable color sequences with transition and hold durations, reorder, duplicate, repeat, and JSON import/export (up to 30 steps).
- Breathing, candle, lava, ocean, rainbow, and firefly effects.
- Preview without a device. Serialized Bluetooth UART writes with stale-frame replacement, targeting at most 10 updates per second.
- Responsive layout and integrated support.

## Use
Serve this folder over localhost for desktop testing, or HTTPS for deployment. Open `index.html` through that server. Connect a micro:bit running a compatible Bluetooth UART + NeoPixel receiver. LED count, pin and extension are configured on the micro:bit. On iPhone use Bluefy. Compatibility of the selected firmware/extension is a user-provided prerequisite.

## Protocol
`R255G000B128\n`: three zero-padded decimal channels, each 0–255; 13 ASCII bytes including LF. Turning off sends `R000G000B000\n`. Stop/pause keep the current color. A write completion is not a physical LED acknowledgement.

## Playback
Only one mode plays at a time. Switching modes, editing steps or disconnecting stops playback. Hidden pages pause playback; returning requires explicit resume. The device can retain the last color after disconnection. Effects and sequence timing are generated in the browser, so background playback is not supported.

## Data
Sequence JSON uses `format: boundaryx-color-flow`, `version: 1`, `loop`, and `steps` containing `color`, `fade`, and `hold`. Fade/hold values are seconds from 0 to 60; combined duration must be at least 0.1 seconds. Import validates the entire file before replacing the current sequence. Brightness is a live output setting and is not included in sequence files.

## Validation
Run `node core.test.mjs`. Real Bluetooth and NeoPixel output require hardware testing; simulation is not hardware validation.
