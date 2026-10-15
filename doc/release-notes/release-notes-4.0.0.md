# Altitude 4.0.0

This is a major release.

Please report bugs using the issue tracker at github: https://github.com/thelindaprojectinc/altitude/issues

## How to Upgrade
Shutdown Altitude if it is already running and then run the installer.

# About this Release

## Web3 Browser
A new built-in browser lets you connect to and interact with Metrix dApps and websites directly from Altitude - with a wallet connection prompt, quick links, and site safety indicators.

## Token Management
View, send, and manage your MRC20 and MRC721 (NFT) tokens directly from the wallet, with tokens held in your addresses discovered automatically. If you don't hold any tokens, checking can also be switched off entirely from the Tokens screen to avoid unnecessary background activity.

## Create Contract
A new screen lets you deploy smart contracts to the network directly from Altitude, showing the full deployment result once confirmed.

## Added features
- Added automatic in-app updates, so new Altitude versions can be downloaded and installed without manually finding and running an installer.
- Added automatic wallet backups, with a configurable schedule, retention, and backup location.
- Reworked the initial sync/bootstrap screen with clearer progress feedback.
- Added the ability to customise the block explorer and token discovery service used by the wallet.
- Added an advanced option to connect to a different wallet daemon than the one Altitude manages itself.
- Cleaned up and reorganised the Options screen.
- Minor icon and sidebar improvements.
- Updated underlying app frameworks (Electron, Angular) to their latest versions.
- Restored a dedicated installer build for Intel-based Macs.
- Updated translations.

## Bug Fixes
- Fixed a fee calculation issue when sending or using coin control to select inputs.
- Fixed errors appearing when loading governance proposals.
- Fixed the DGP migration notice incorrectly appearing on Regtest networks.
- Fixed a currency conversion issue in the price/currency selector.
