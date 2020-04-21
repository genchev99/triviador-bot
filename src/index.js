'use strict';

require('dotenv').config({path: './.env'});

const tesseract = require('node-tesseract-ocr');
const config = {
  lang: "bul",
};

const puppeteer = require('puppeteer-extra');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

/* Add plugins */
puppeteer.use(
  require('puppeteer-extra-plugin-flash')({
    allowFlash: true,
    pluginPath: '/usr/lib/pepperflashplugin-nonfree/libpepflashplayer.so',
  })
);

puppeteer.use(AdblockerPlugin());

const tempImagePath = '/home/pr3dat0r/triviador-bot/temp.png';

const login = async page => {
  await page.goto('https://bulgaria.triviador.net/');

  await page.type('input#loginname', process.env.TRIVIADOR_USERNAME);
  await page.type('input#password', process.env.TRIVIADOR_PASSWORD);

  await Promise.all([
    page.click('input[type=submit]'),
    page.waitForNavigation(),
  ]);
};

const parseScreen = async page => {
  const game = await page.$('#CLIENTCELL');
  await game.screenshot({path: tempImagePath});

  const text = await tesseract.recognize(tempImagePath, config)
    .catch(error => {
      console.log(error.message)
    });

  console.log(text);
};

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await login(page);

  while (true) {
    await parseScreen(page);
    await page.waitFor(5000);
  }
})();
