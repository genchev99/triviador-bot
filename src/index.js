'use strict';

require('dotenv').config({path: './.env'});

const puppeteer = require('puppeteer-extra');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

/* Add plugins */
puppeteer.use(
  require('puppeteer-extra-plugin-flash')()
);

puppeteer.use(AdblockerPlugin());

const login = async page => {
  await page.goto('https://bulgaria.triviador.net/');

  await page.type('input#loginname', process.env.TRIVIADOR_USERNAME);
  await page.type('input#password', process.env.TRIVIADOR_PASSWORD);

  await Promise.all([
    page.click('input[type=submit]'),
    page.waitForNavigation(),
  ]);

};

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await login(page);
})();
