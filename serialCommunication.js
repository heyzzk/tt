const path = require("path");
//const {SerialPort} = require('serialport')
const { SerialPort, ReadlineParser } = require('serialport')

const Readline = require('@serialport/parser-readline');

let port;

function listPorts() {
  return SerialPort.list();
}

function openPort(portName, baudRate) {
  //port = new SerialPort(portName, { baudRate });
  port = new SerialPort({
    path:portName,
    baudRate:baudRate,
    //parser: new Readline('\n')
  });

  //const parser = port.pipe(new Readline({ delimiter: '\r\n' }));
  const parser = port.pipe(new ReadlineParser())

  port.on('open', () => {
    console.log('Port open');
  });

  parser.on('data', (line) => {
    console.log('Received:', line);
  });
}

function write(data) {
  if (port && port.isOpen) {
    port.write(data, (err) => {
      if (err) {
        console.error('Error writing to port:', err);
      }
    });
  } else {
    console.error('Port is not open.');
  }
}

function closePort() {
  if (port && port.isOpen) {
    port.close((err) => {
      if (err) {
        console.error('Error closing port:', err);
      }
    });
  }
}

module.exports = {
  listPorts,
  openPort,
  write,
  closePort,
};
