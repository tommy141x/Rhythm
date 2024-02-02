const {app, Menu, BrowserWindow, ipcMain, ipcRenderer, safeStorage} = require('electron');
//TODO ADD TRAY SUPPORT
const fs = require('fs');
const path = require('path');
const RichPresence = require("rich-presence-builder")
let mainWindow = null;

function createWindow() {
    //Menu.setApplicationMenu(null);
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        icon: __dirname + '/icon.png',
        menu: null,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'", "data:"],
                }
            }
        },
    });

    mainWindow.openDevTools();
    mainWindow.loadFile('index.html');
    mainWindow.openDevTools();
}

let rp;
let waitClear = 0;
ipcMain.on('updatePresence', async (event, res) => {
    if (res !== 'clear') {
        let activity = JSON.parse(res);
        try {
            //upload activity.thumbnailURL to discord
            //get the key
            //set the key as the large image
            if (!(rp && rp.details)) {
                rp = new RichPresence({clientID: "1196631767327715429"});
                rp.addButton("Listen on Youtube", activity.songUrl);
            }
            //rp.setState(activity.state);
            rp.setState(activity.details + " - " + activity.state);
            rp.setLargeImage(activity.thumbnailURL, activity.state);
            //rp.setSmallImage("play", "");
            rp.setEndTimestamp(activity.end);
            rp.setStartTimestamp(activity.start);
            //rp.setTimeLeft(60) // 00:01:00 left
            rp.setTimestamp(Date.now());
            waitClear = 0;
            await rp.go();
            //console.log("Set RP", rp);
        } catch (e) {
            console.error(e);
            rp = new RichPresence({clientID: "1196631767327715429"});
        }
    } else if (rp !== undefined) {
        try {
            if (waitClear === 3) {
                await rp.clear();
                //console.log("Cleared RP");
            }
            waitClear++;
        } catch (e) {
            console.error(e);
            rp = new RichPresence(undefined);
        }
    }
});

// Listen for console-warn event
ipcMain.on('console-warn', (event, ...args) => {
    console.warn(args);
});

// Listen for console-error event
ipcMain.on('console-error', (event, ...args) => {
    console.error(args);
});


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (rp !== undefined) {
            rp.clear();
        }
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
