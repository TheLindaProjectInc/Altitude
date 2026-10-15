[![GitHub license](https://img.shields.io/github/license/TheLindaProjectInc/Altitude)](https://github.com/TheLindaProjectInc/Altitude/blob/master/LICENSE.md) ![GitHub last commit (branch)](https://img.shields.io/github/last-commit/TheLindaProjectInc/Altitude/develop) [![Node.js Build Test](https://github.com/TheLindaProjectInc/Altitude/actions/workflows/node.js.yml/badge.svg)](https://github.com/TheLindaProjectInc/Altitude/actions/workflows/node.js.yml)

# Altitude
The Altitude wallet is the wallet of choice for Metrix.

## OS Compatibility

Altitude is a desktop app, built with Electron. Installers for each supported platform are published on the [Releases page](https://github.com/TheLindaProjectInc/Altitude/releases).

| OS | Supported versions | Architecture | Installer |
|---|---|---|---|
| Windows | Windows 10 and later | x64, x86 (32-bit) | `.exe` |
| macOS | macOS 12 (Monterey) and later | Apple Silicon (arm64), Intel (x64) | `.dmg` |
| Linux | Most modern distributions (e.g. Ubuntu 18.04+, Debian 10+, Fedora 32+) | x64 | `.AppImage` |

> [!IMPORTANT]
> **Mac users:** as of 4.0.0, Altitude requires **macOS 12 (Monterey) or later**. Previous releases supported macOS 11 (Big Sur) and later - if you're still on Big Sur, 4.0.0 will not run and you'll need to either update macOS or stay on your current Altitude version. This follows the minimum macOS version required by the version of Electron Altitude is now built with. Both Intel and Apple Silicon Macs continue to be supported.

### Recommended Specs

Altitude downloads and runs a full Metrix node alongside its own interface, so it benefits from a bit more than a typical lightweight desktop app:

- **CPU:** A 64-bit, dual-core (or better) processor
- **RAM:** 4 GB minimum, 8 GB or more recommended
- **Storage:** At least 20 GB free, on an SSD if possible - the Metrix blockchain is several GB and grows over time, and syncing from a traditional hard drive is noticeably slower
- **Network:** An internet connection, to sync with the network and keep the wallet up to date

## Help and troubleshooting

In order to get help regarding Altitude:

1.  Go to our [Discord channel](https://discord.gg/SHNjQBv) to connect with the community for instant help.
1.  Search for [similar issues](https://github.com/TheLindaProjectInc/Altitude/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Canonical%22) and potential help.
1.  Or create a [new issue](https://github.com/TheLindaProjectInc/Altitude/issues) and provide as much information as you can to recreate your problem.

## How to contribute

Contributions via Pull Requests are welcome. You can see where to help looking for issues with the [Enhancement](https://github.com/TheLindaProjectInc/Altitude/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Enhancement%22) or [Bug](https://github.com/TheLindaProjectInc/Altitude/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Bug%22) labels. We can help guide you towards the solution.

You can also help by [responding to issues](https://github.com/TheLindaProjectInc/Altitude/issues?q=is%3Aissue+is%3Aopen+label%3A%22Status%3A+Triage%22).


## Development
Altitude is built using the Angular and Electron frameworks for maximum cross-platform compatibility.

### Getting Started

Clone this repository locally :

``` bash
git clone https://github.com/thelindaprojectinc/Altitude.git
```

Install dependencies with npm. Using yarn on linux and macos may fail:

``` bash
npm install
```

### Running

``` bash
npm start
```

By default Altitude will download the latest metrixd binary and run it internally. You can connect your own metrixd binary by running it before starting the wallet.

### Development Commands

|Command|Description|
|--|--|
|`npm run ng:serve:web`| Execute the app in the browser |
|`npm run build`| Build the app. The built files are in the /dist folder. |
|`npm run build:prod`| Build the app with Angular aot. The built files are in the /dist folder. |
|`npm run electron:local`| Builds the application and start electron
|`npm run electron:linux`| Builds the application and creates an app consumable on linux system |
|`npm run electron:linux-snap`| Builds the application and creates an snap consumable on linux system |
|`npm run electron:linux32`| Builds the application and creates an app consumable on linux 32 bit system |
|`npm run electron:windows`| On a Windows OS, builds the application and creates an app consumable in windows 64 bit systems |
|`npm run electron:windows32`| On a Windows OS, builds the application and creates an app consumable in windows 32 bit systems |
|`npm run electron:mac`|  On a MAC OS, builds the application and generates a `.dmg` file of the application that can be run on Mac |
|`npm run electron:mac-x64`|  On a Intel based MAC OS, builds the application and generates a `.dmg` file of the application that can be run on Mac |
