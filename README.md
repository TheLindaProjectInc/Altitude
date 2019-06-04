# Altitude
The Altitude wallet is the wallet of choice for Metrix.

## Help and troubleshooting

In order to get help regarding Altitude:

1.  Go to our [Discord channel](https://discord.gg/SHNjQBv) to connect with the community for instant help.
1.  Search for [similar issues](https://github.com/TheLindaProjectInc/Altitude/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Canonical%22) and potential help.
1.  Or create a [new issue](https://github.com/TheLindaProjectInc/Altitude/issues) and provide as much information as you can to recreate your problem.

## How to contribute

Contributions via Pull Requests are welcome. You can see where to help looking for issues with the [Enhancement](https://github.com/TheLindaProjectInc/Altitude/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Enhancement%22) or [Bug](https://github.com/TheLindaProjectInc/Altitude/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Bug%22) labels. We can help guide you towards the solution.

You can also help by [responding to issues](https://github.com/TheLindaProjectInc/Altitude/issues?q=is%3Aissue+is%3Aopen+label%3A%22Status%3A+Triage%22).


## Development
Altitude is built using the Angular7 and Electron frameworks for maximum cross-platform compatibility.

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
|`npm run electron:linux32`| Builds the application and creates an app consumable on linux 32 bit system |
|`npm run electron:windows`| On a Windows OS, builds the application and creates an app consumable in windows 64 bit systems |
|`npm run electron:windows32`| On a Windows OS, builds the application and creates an app consumable in windows 32 bit systems |
|`npm run electron:mac`|  On a MAC OS, builds the application and generates a `.dmg` file of the application that can be run on Mac |
