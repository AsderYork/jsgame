const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const util = require('util');
let megafonCredentials = {login:'9234802932', password:'2019Kotkin@#'};
let beelineCredentials = {login:'B388462695', password:'Z15012013'};
const request = require('request');


async function clearDirectory(directory) {

    const files = await util.promisify(fs.readdir)(directory);
    for (const file of files) {
        await util.promisify(fs.unlink)(path.join(directory, file));
    }
}

async function sendFile(filename, ext) {
    const formData = {
        my_file: fs.createReadStream(`./data/${filename}.${ext}`),
    };

    await util.promisify(request.post)({url:`http://192.168.0.71/guides/simcards/api/auto_import?filesource=${filename}`, formData: formData});

}


async function main() {
    const browser = await puppeteer.launch();

    await clearDirectory('./data');



    await Promise.all([
        require('./pageloaders/megafonICCIDS')(browser, megafonCredentials, 'megafon.png').then(data => fs.writeFileSync('./data/megafon.csv', data)).then(() => console.log('Megafon loaded!')),
        require('./pageloaders/beelineICCIDS')(browser, beelineCredentials, 'beeline.png').then(() => console.log('Beeline loaded!'))

    ]);

    await browser.close();

    await sendFile('beeline', 'xls').then(() => console.log('Beeline sent to Portal!'));
    await sendFile('megafon', 'csv').then(() => console.log('Megafon sent to Portal!'));

}

main();


