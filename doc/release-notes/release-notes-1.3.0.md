# Altitude 1.3.0

This is a minor release.

Please report bugs using the issue tracker at github: https://github.com/thelindaprojectinc/altitude/issues

## How to Upgrade
Shutdown Altitude if it is already running and then run the installer.

## About this Release

### What's New
- Add a copy to clipboard button to the transaction page to copy all transactions on the page in CSV format to your clipboard.
- Added grouped addresses to the manage account page.
- Added account transactions to the manage account page.
- Fixed sending limits when trying to create transactions above 90m. This won't be available until the next Core release. Until then Altitude will alert you that there is a problem.
- Added sorting to the coin control inputs table.
- Added all transactions when sending self payment if there is change. These will appear on the transaction page as multiple Payments To Self showing the amount sent to each address.
- Accounts on the dashboard are now sorted alphabetically.
- Show unnamed empty accounts will now remember your selection when you change screens.

### Bug Fixes
- Fixed an issue causing unconfirmed transactions to appear in the wrong spot on the transactions page.
- Fixed stake lock not restoring after sending a transaction when unlocked for staking.
- Fixed UI issue showing checkbox above table header in coin control.
- Fixed an issue where dashboard hid some unnamed accounts.
- Fixed an issue where full screen selection wasn't always persisting.