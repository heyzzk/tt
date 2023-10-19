const { app, BrowserWindow, dialog, ipcMain, Tray, Menu} = require('electron');
const path = require("path");
const fs = require('fs');
const os_util = require('node-os-utils');
const os = require("os");
const child_process = require("child_process");

const si = require('systeminformation');//npm install systeminformation

const crcLib = require('crc');//npm install crc

//const { SerialPort } = require('serialport');

//const { listPorts, openPort, write, closePort } = require('./serialCommunication');


const platform = process.platform;

let mainWindow;
let isQuiting;
let tray;

let g_cpu = 0
let g_mem = 0
let g_dic = 0
let g_net = 0
let g_len = 3

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
            //console.log("zzk ipcMain get-net2 ", selectedInterface);
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
    //console.log("zzk ipcMain get-cpu");
    setInterval(getcpuusage, 500)
});
function getcpuusage() {
    var cpu = os_util.cpu;
    
    cpu.usage()
        .then(info => {
            mainWindow.webContents.send('cpu', info)
            //console.log("zzk send cpu usage", parseInt(info).toString());
            g_cpu = parseInt(info)
            // send uptime to front end
            mainWindow.webContents.send('uptime', os.uptime());
        })
}

// Get MEM Usage
ipcMain.on('get-mem', (event, arg) => {
    //console.log("zzk ipcMain get-mem");
    setInterval(getmemusage, 500)
});
function getmemusage() {
    var mem = os_util.mem;

    mem.used()
        .then(info => {
            mainWindow.webContents.send('mem', info.usedMemMb/info.totalMemMb)
            //console.log("zzk send mem usage", info.usedMemMb/info.totalMemMb);
            g_mem = parseInt(100*info.usedMemMb/info.totalMemMb)
        })
}

si.fsSize()
  .then(data => {
    data.forEach(driveInfo => {
      const used = driveInfo.used;
      const total = driveInfo.size;
      const percentageUsed = (used / total) * 100;
      const device = driveInfo.fs;

      g_dic = parseInt(percentageUsed);
/*
      console.log(`Drive Information for ${device}:`);
      console.log(`Used: ${used} bytes`);
      console.log(`Total: ${total} bytes`);
      console.log(`Percentage Used: ${percentageUsed}%`);
      console.log('-------------------');
*/
    });
  })
  .catch(error => {
    console.error('Error retrieving drive information:', error);
  });

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
                /*
                console.log('Received Bytes:', interfaceStats.rx_bytes);
                console.log('Sent Bytes:', interfaceStats.tx_bytes);
                console.log('Received Speed (bytes/sec):', interfaceStats.rx_sec);
                console.log('Sent Speed (bytes/sec):', interfaceStats.tx_sec);
                */
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
                //console.log("zzk ipcMain get-net2 ", selectedInterface.rx_sec);
            }
        } catch (error) {
            console.error('Error measuring network speed:', error);
        }
    }
}

function writeHexData(port, hexData) {
    if (port) {
      const bufferData = Buffer.from(hexData, 'hex');
      
      port.write(bufferData, (err) => {
        if (err) {
          console.error('Error writing to port:', err);
        }
      });
    } else {
      console.error('writeHexData: Port is not open.');
    }
}

function listPorts() {
    return SerialPort.list()
      .then(ports => {
        console.log('Available serial ports:');
        ports.forEach(port => {
          console.log(`Port: ${port.path}, Manufacturer: ${port.manufacturer || 'N/A'}`);
        });
      })
      .catch(error => {
        console.error('Error listing serial ports:', error);
      });
}

const { SerialPort, ReadlineParser } = require('serialport')
//const port = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 115200 })
const port = new SerialPort({ path: 'COM29', baudRate: 115200 })
const parser = new ReadlineParser()
port.pipe(parser)
//parser.on('data', console.log)
//port.write('ROBOT PLEASE RESPOND\n')

//listPorts()


const hexData = 'a503065a4d175a';
//writeHexData(port, hexData);


function myTask() {


    // Create a buffer for the data
    const dataBuffer = Buffer.alloc(11);

    // Construct the packet
    dataBuffer.writeUInt8(0xA5, 0); // Start of packet
    dataBuffer.writeUInt8(g_len, 1);
    dataBuffer.writeUInt8(g_cpu, 2); // CPU value
    dataBuffer.writeUInt8(g_mem, 3); // Memory value
    dataBuffer.writeUInt8(g_dic, 4); // Disk value

    // Calculate CRC over the data (excluding the CRC field itself)
    //console.log(dataBuffer.subarray(2, 5));
    const crcValue = crcLib.crc8(dataBuffer.subarray(2, 5));

    console.log("data to send:",g_cpu, g_mem, g_dic, crcValue)

    // Write the CRC value (2 bytes) to the buffer
    dataBuffer.writeUInt8(crcValue, 5);

    dataBuffer.writeUInt8(0x5A, 6); // End of packet

    writeHexData(port, dataBuffer);
}  
const intervalId = setInterval(myTask, 100);


// open notepad
ipcMain.on('open-notepad', (event, arg) => {
    child_process.spawn('C:\\windows\\notepad.exe')
});

// open folder
ipcMain.on('open-folder', (event, arg) => {
    child_process.exec('start "" "C:\\Program Files"')
});

console.log("zzk end");




//http://tcngbuildserver:8080/view/Firmware%20Builds/job/Official_Firmware_Production_Build/