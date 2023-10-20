const os_util = require('node-os-utils');

const TAG = "sys_utils";

function get_cpu_percent() {
    var cpu = os_util.cpu;

    return cpu.usage()
        .then(info => {
            const cpu_usage = parseInt(info)
            //console.log(TAG, Function.name, cpu_usage);
            return cpu_usage
        });
}

function get_mem_percent() {
    var mem = os_util.mem;

    return mem.used()
    .then(info => {
        const mem_usage = parseInt(100*info.usedMemMb/info.totalMemMb)
        //console.log(TAG, Function.name, cpu_usage);
        return mem_usage
    });
}

module.exports = {
    get_cpu_percent,
    get_mem_percent,
};