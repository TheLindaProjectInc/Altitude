# Altitude 1.1.0

This is a minor release.

Please report bugs using the issue tracker at github: https://github.com/thelindaproject/altitude/issues

## How to Upgrade
Shutdown Altitude if it is already running and then run the installer.

## About this Release

### What's New
- Added Altitude version to Information tab and About Altitude page
- Removed 'Masternode not configured' message in Masternodes tab when running a remote masternode
- Added option to specify Altitude install location on windows
- Inputs on the send page are now remembered when navigating away from the page
- Added tree view to coin control
- Altitude will show a 'no update available' message when there is no new update
- Added proxy and Tor options in the options menu under File
- Added minimize to tray instead of task bar, minimize on close and hide tray icon options
- Added right click menu for copy and paste on text inputs
- Added autofill label/address in send page when entering either a known address or label
- Added extra copy items to transactions
- Added support for Linda startup commands through the Altitude application. You can now enter startup commands on the Altitude executable like you would the Linda executable 
### Bug Fixes
- Fixed an issue causing  the daemon to freeze on close causing a force kill
- Fixed an issue where wallet repair sometimes didn't execute
- Fixed keyboard shortcuts for copy and paste on OSX
- Fixed display issue causing block explorer menu item to be covered when resizing the window
- Fixed an issue causing some transactions to display their timestamp instead of the blocktime


