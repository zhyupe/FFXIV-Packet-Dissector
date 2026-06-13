
const injector = require('../index');
const path = require('path');

const pid = injector.getPIDByName('ffxiv_dx11.exe');

const error = injector.injectPID(pid, path.join(__dirname, '../test/testdll.dll'));

if (!error) {
    console.log('Successfully injected!');
} else {
    console.log('Injection failed. Error Code:', error);

}