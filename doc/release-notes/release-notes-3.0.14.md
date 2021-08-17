# Altitude 3.0.14

This is a patch release.

Please report bugs using the issue tracker at github: https://github.com/thelindaprojectinc/altitude/issues

## How to Upgrade
Shutdown Altitude if it is already running and then run the installer.

## About this Release

- Update daemon to v4.0.7.0

## Added features
- Added client sync interval options, default is 10 seconds. Modifying this will increase the time Altitude requests updates from the core daemon. The background daemon will continue to work and sync as normal. This may be useful on slow machines that cannot handle the default 10 second polling time.