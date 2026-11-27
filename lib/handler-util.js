'use strict';
const fs = require('node:fs')
const pug = require('pug');
const Cookies = require('cookies');
const { currentThemeKey } = require('../config');

function handleChangeTheme(req, res) {
  const cookies = new Cookies(req, res);
  const currentTheme = (cookies.get(currentThemeKey) !== 'light' ? 'light' : 'dark');
  cookies.set(currentThemeKey, currentTheme, {
    maxAge: 30 * 86400 * 1000
  });

  res.writeHead(303, {
    'Location': '/'
  });
  res.end();
}

function handleFavicon(req, res) {
  res.writeHead(200, {
    'Content-Type': 'image/vnd.microsoft.icon',
    'Cache-Control': 'public, max-age=604800'
  });
  const favicon = fs.readFileSync('./favicon.ico');
  res.end(favicon);
}

function handleStyleCssFile(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/css; charset=utf-8',
  });
  const file = fs.readFileSync('./public/style.css');
  res.end(file);
}

function handleExamList(req, res) {
  const cookies = new Cookies(req, res);
  const currentTheme = cookies.get(currentThemeKey) || 'light';

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'self'; script-src https://* http://localhost:8000/; style-src https://* http://localhost:8000/; font-src https://*;"
  });

  res.end(pug.renderFile('./views/index.pug', {
    currentTheme
  }));
}

function handleNotFound(req, res) {
  const cookies = new Cookies(req, res);
  const currentTheme = cookies.get(currentThemeKey) || 'light';

  res.writeHead(404, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'self'; style-src https://* http://localhost:8000/; font-src https://*;"
  });

  res.end(pug.renderFile('./views/404.pug', {
    currentTheme
  }));
}

function handleBadRequest(req, res) {
  res.writeHead(400, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end('未対応のリクエストです');
}

module.exports = {
  handleChangeTheme,
  handleFavicon,
  handleStyleCssFile,
  handleExamList,
  handleNotFound,
  handleBadRequest,
};