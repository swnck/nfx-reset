# NFX Reset

**NFX Reset** is a lightweight Manifest V3 browser extension for Netflix. It adds a reset button to the Netflix interface so you can reset a title’s playback status with a single click.

## Features

- Adds a **Reset** button directly inside the Netflix interface
- Resets a title’s status through a Netflix API call
- Runs without a build step or external dependencies
- Works locally in the browser and sends no data to our own servers

## Installation

The extension is loaded as an **unpacked extension**.

### Chrome / Chromium-based browsers

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the project folder `nfx-reset`

## Usage

1. Sign in to Netflix
2. Open a page where Netflix shows the relevant title button
3. Click the injected **Reset** button from NFX Reset
4. The extension resets the status and then reloads the page

## How it works

- `content.js` looks for matching buttons in the Netflix UI and injects a cloned button with reset behavior
- When clicked, it reads the current profile ID from the browser’s local storage
- `background.js` then sends an authenticated request to the Netflix GraphQL API
- After a successful action, the page is refreshed

## Permissions

According to `manifest.json`, the extension uses the following permissions:

- `cookies` – so the background process can make the Netflix request using the signed-in session
- `https://www.netflix.com/*` – so the content script can modify the Netflix interface
- `https://web.prod.cloud.netflix.com/*` – so the background process can communicate with the Netflix API

## Privacy

NFX Reset processes the required information entirely locally in your browser. It does not use its own servers, analytics, or trackers.

You can read more in the [privacy policy](./PRIVACY.md).

## Project Structure

```text
nfx-reset/
├── background.js
├── content.js
├── manifest.json
├── PRIVACY.md
└── icons/
    └── icon128.png
```

## Note

Netflix may change its interface or API at any time. If that happens, the extension may need to be updated.


