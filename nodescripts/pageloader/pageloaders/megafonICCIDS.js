

module.exports = async function(browser, credentials, screenshot = null) {
    const page = await browser.newPage();
    await page.goto('https://b2blk.megafon.ru/login', {waitUntil:'networkidle0'});
    await page.type('[data-input-login]', credentials.login);
    await page.type('[data-input-pwd]', credentials.password);

    await Promise.all([
        page.click('[data-button="buttonSubmitAuthform"]'),
        page.waitForNavigation({waitUntil:'networkidle0'}), // The promise resolves after navigation has finished
    ]);

    await page.waitForSelector('[href="/subscribers/mobile"]');

    if(screenshot) {
        await page.screenshot({path: screenshot});
    }

    const res = await page.evaluate(async () =>
    {
        var bf = await (await fetch('https://b2blk.megafon.ru/ws/v1.0/subscriber/mobile/export/CSV')).arrayBuffer();
        return new Uint8Array(bf);

    });
    var iconv = require('iconv-lite');
    let str = iconv.decode(Object.values(res), 'win1251');

    return str;

};

