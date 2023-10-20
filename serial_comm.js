const { SerialPort, ReadlineParser } = require('serialport');

function listPorts() {
    return SerialPort.list()
      .then(ports => {
        //console.log('Available serial ports:');
        ports.forEach(port => {
          //console.log(`Port: ${port.path}, Manufacturer: ${port.manufacturer || 'N/A'}`);
        });
      })
      .catch(error => {
        console.error('Error listing serial ports:', error);
      });
}

module.exports = {
    listPorts,
};