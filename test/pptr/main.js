const puppeteer = require('puppeteer');

// Usage: node test/pptr/main.js <Cockpit login url> <Username> <Password>
// Example: node test/pptr/main.js 10.212.140.170:9090 ubuntu secretpassword

const args = process.argv.slice(2);

(async () => {
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto(`https://${args[0]}`, { waitUntil: 'networkidle0' });
  await page.type('#login-user-input', args[1]);
  await page.type('#login-password-input', args[2]);
  await page.click('#login-button');
  await page.waitForNavigation();
  await page.goto(`https://${args[0]}/suricata`, { waitUntil: 'networkidle0' });
  await page.waitForNavigation();

  const frame = await page.frames().find((f) => f.name() === 'cockpit1:localhost/suricata');

  await frame.waitForSelector('#start-button');

  await frame.click('#start-button'); // Make sure to activate it again if off.

  await frame.waitForSelector('span.service-active');

  await frame.click('#stop-button');
  await frame.waitForSelector('span.service-down');

  await frame.click('#start-button');
  await frame.waitForSelector('span.service-active');

  await frame.click('#restart-button');
  await frame.waitForSelector('span.service-down');
  await frame.waitForSelector('span.service-active');

  // await page.screenshot({path: 'example.png'});

  await browser.close();
})();
