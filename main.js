const { app, BrowserWindow, dialog, ipcMain, Tray, Menu} = require('electron');
const path = require("path");
const fs = require('fs');
const os_util = require('node-os-utils');
const os = require("os");
const child_process = require("child_process");

const si = require('systeminformation');//npm install systeminformation

const { SerialPort } = require('serialport');

const { listPorts, openPort, write, closePort } = require('./serialCommunication');


const platform = process.platform;

let mainWindow;
let isQuiting;
let tray;

/*
SerialPort.list().then(
    ports => ports.forEach(console.log),
    err => console.error(err)
);
*/

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 420,
        // maxWidth:1000,
        icon:"icon.png",
        webPreferences: {   //zzk for error require('electron').ipcRenderer; require is not defined
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    mainWindow.loadFile('index.html');
    //mainWindow.maximize();

    // create system tray
    var appIcon = new Tray("icon.png");
    var contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App', click: function () {
                mainWindow.show()
            }
        },

        {
            label: 'Open Program Files', click: function () {
                child_process.exec('start "" "C:\\Program Files"')
            }
        },

        {
            label: 'Open Temp Folder', click: function () {
                child_process.exec('start ' + os.tmpdir());
            }
        },

        {
            label: 'Open NotePad', click: function () {
                child_process.spawn('C:\\windows\\notepad.exe')
            }
        },

        {
            label: 'Quit', click: function () {
                app.isQuiting = true;
                app.quit()
            }
        }
    ]);
    appIcon.setContextMenu(contextMenu);

    mainWindow.on('close', function (event) {
        if(!app.isQuiting){
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });

    mainWindow.on('minimize', function (event) {
        event.preventDefault();
        mainWindow.hide()
    });

    mainWindow.on('show', function () {
        appIcon.setHighlightMode('always')
    });

    // Create a function to measure network speed
    const measureNetworkSpeed = async () => {
        try {
            const networkStats = await si.networkStats();
            // Select the network interface you want to monitor, e.g., 'eth0' or 'wlan0'
            const selectedInterface = networkStats.find(interface => interface.iface === 'eth0');

            // Display the network speed information in your HTML
            mainWindow.webContents.send('network-speed', selectedInterface);
            console.log("zzk ipcMain get-net2 ", selectedInterface);
        } catch (error) {
            console.error('Error measuring network speed:', error);
        }
    };
    setInterval(measureNetworkSpeed, 5000);
}

console.log("zzk start");
//app.disableHardwareAcceleration();//zzk for ubuntu22 ERROR:gl_surface_presentation_helper.cc(260)] GetVSyncParametersIfAvailable() failed for 1 times!
app.on('ready', createWindow);


// Open Select file dialog
ipcMain.on('select-file', (event, arg) => {
    console.log("zzk ipcMain select-file");
    const path = (dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] }));
    fs.readdir(path[0], (err, files) =>{
        files.forEach(file =>{
            console.log(path[0]+ '\\' + file);
        })
    })
});

// Get CPU Usage
ipcMain.on('get-cpu', (event, arg) => {
    console.log("zzk ipcMain get-cpu");
    setInterval(getcpuusage, 500)
});
function getcpuusage() {
    var cpu = os_util.cpu;
    
    cpu.usage()
        .then(info => {
            mainWindow.webContents.send('cpu', info)
            console.log("zzk send cpu usage", info.toString());
            // send uptime to front end
            mainWindow.webContents.send('uptime', os.uptime());
        })
}

// Get MEM Usage
ipcMain.on('get-mem', (event, arg) => {
    console.log("zzk ipcMain get-mem");
    setInterval(getmemusage, 500)
});
function getmemusage() {
    var mem = os_util.mem;

    mem.used()
        .then(info => {
            mainWindow.webContents.send('mem', info.usedMemMb/info.totalMemMb)
            console.log("zzk send mem usage", info.usedMemMb/info.totalMemMb);
        })
}

// Get Network Usage
ipcMain.on('get-net', async (event, arg) => {
    try {
        setInterval(async () => {
            await getnetusage();
        }, 500);
    } catch (error) {
        console.error('Error in ipcMain get-net:', error);
    }
});

async function getnetusage() {
    //console.log("platform=", platform);
    if (platform === 'darwin') {
        // macOS specific code
    } else if (platform === 'win32') {
        // Windows specific code
        try {
            //const networkInterfaces = await si.networkInterfaces();
            //console.log('Network Interfaces:', networkInterfaces);

            const networkStats = await si.networkStats();
        
            // Check if networkStats is an array and has at least one element
            if (Array.isArray(networkStats) && networkStats.length > 0) {
              const interfaceStats = networkStats[0];
        
              // Check if rx_sec and tx_sec properties exist
              if ('rx_sec' in interfaceStats && 'tx_sec' in interfaceStats) {
                console.log('Received Bytes:', interfaceStats.rx_bytes);
                console.log('Sent Bytes:', interfaceStats.tx_bytes);
                console.log('Received Speed (bytes/sec):', interfaceStats.rx_sec);
                console.log('Sent Speed (bytes/sec):', interfaceStats.tx_sec);
              } else {
                console.error('Network speed properties not found.');
              }
            } else {
              console.error('No network interface found. ', Array.isArray(networkStats), networkStats.length);
            }
          } catch (error) {
            console.error('Error:', error);
          }
    } else {
        // Linux specific code or default behavior
        try {        
            const networkStats = await si.networkStats();
            const selectedInterface = networkStats.find(interface => interface.iface === 'eno1');
            if (selectedInterface) {
                mainWindow.webContents.send('net', selectedInterface.rx_sec);
                console.log("zzk ipcMain get-net2 ", selectedInterface.rx_sec);
            }
        } catch (error) {
            console.error('Error measuring network speed:', error);
        }
    }
}


/*
listPorts().then((ports) => {
    //console.log('Available ports:', ports);
    const comPort = 'COM28'; // Replace with the COM port you want to open
    const selectedPort = ports.find((port) => port.path === comPort);
  
    if (selectedPort) {
      openPort(selectedPort.path, 115200); // Open the specified COM port
      write('Hello, Arduino!\n'); // Send data
      closeSerialPort();
    } else {
      console.error(`COM port ${comPort} not found.`);
    }
});
*/

function writeHexData(port, hexData) {
    if (port && port.isOpen) {
      // Convert the hexadecimal string to a buffer
      const bufferData = Buffer.from(hexData, 'hex');
      
      console.log('zzk 11111111111111111111111');
      port.write(bufferData, (err) => {
        if (err) {
          console.error('Error writing to port:', err);
        } else {
          console.log('Data sent successfully:', hexData);
        }
      });
    } else {
      console.error('Port is not open.');
    }
    console.log('zzk 2222222222222222222222');
  }
  
  listPorts().then((ports) => {
    
    const comPort = 'COM28'; // Replace with the COM port you want to open
    const selectedPort = ports.find((port) => port.path === comPort);

    console.log('zzk 00000000000000000000000000000=', selectedPort);
    if (selectedPort) {
      openPort(selectedPort.path, 115200); // Open the specified COM port
      
      // Send the specified hexadecimal data
      const hexData = 'a503065a4d175a';
      writeHexData(selectedPort, hexData);
      
      closePort(); // Close the port after sending the data
    } else {
      console.error(`COM port ${comPort} not found.`);
    }
    
    console.log('zzk 44444444444444444444444444');
  });
  






// open notepad
ipcMain.on('open-notepad', (event, arg) => {
    child_process.spawn('C:\\windows\\notepad.exe')
});

// open folder
ipcMain.on('open-folder', (event, arg) => {
    child_process.exec('start "" "C:\\Program Files"')
});
