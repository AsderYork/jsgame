const fs = require('fs');
const path = require('path');
const util = require('util');

module.exports = async function(browser, credentials, screenshot = null) {

    const page = await browser.newPage();
    await page.goto('https://my.beeline.ru/login.xhtml?', {waitUntil:'networkidle0'});


    await page.type('input[id$="loginForm:login"]', credentials.login);
    await page.type('input[id$="loginForm:passwordPwd"]', credentials.password);



    await Promise.all([
        page.click('[id="loginFormB2C:loginForm:j_idt218"]'),
        page.waitForNavigation({waitUntil:'networkidle0'}), // The promise resolves after navigation has finished
    ]);

    await page.waitForSelector('[href="/b/mb/info/abonents/catalog.xhtml"]');

    await page.goto('https://my.beeline.ru/b/mb/info/abonents/catalog.xhtml', {waitUntil:'networkidle0'});

    const [button] = await page.$x("//a[contains(., 'Выгрузить в Excel')]");
    if (button) {

        await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: process.cwd() + '\\data',
        });

        const path = require('path');

        let results = await Promise.all([
            page.waitForResponse('https://my.beeline.ru/b/mb/info/abonents/catalog.xhtml'),
            button.click(),
            page.waitForTimeout(6000),
        ]);


        var response = results.find(x => x !== undefined);
        const filename = response._headers['content-disposition'].split(';').map(x => x.split('='))[1][1].replace(/\:/g, '_');
        const directory = './data';
        await util.promisify(fs.rename)( path.join(directory, filename), path.join(directory, 'beeline.xls'));

        if(screenshot) {
            await page.screenshot({path: screenshot});
        }

    }

    return '';



};

