'use strict';
const examHandler = require('./exam-handler');
const util = require('./handler-util');

function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'http') {
    util.handleNotFound(req, res);
    return;
  }
  switch (url.pathname) {
    case '/':
      util.handleExamList(req, res);
      break;
    case '/exam':
      examHandler.handle(req, res, url);
      break;
    case '/result':
      examHandler.handle(req, res, url);
      break;
    case '/changeTheme':
      util.handleChangeTheme(req, res);
      break;
    case '/favicon.ico':
      util.handleFavicon(req, res);
      break;
    case '/style.css':
      util.handleStyleCssFile(req, res);
      break;
    default:
      util.handleNotFound(req, res);
      break;
  }
}

module.exports = {
  route
};
