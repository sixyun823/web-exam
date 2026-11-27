
'use strict';
const util = require('./handler-util');
const pug = require('pug');
const fs = require('node:fs');

const Cookies = require('cookies');
const { currentThemeKey } = require('../config');

const crypto = require('node:crypto');
const oneTimeTokenMap = new Map();
const resultMap = new Map();

const examFiles = {
  'webApp3_1-5': './data/webApp3_1-5.json',
  'webApp3_6-10': './data/webApp3_6-10.json',
  'webApp3_11-15': './data/webApp3_11-15.json'
};

function getExam(examId) {
  const file = examFiles[examId];

  if (!file) {
    return null;
  }

  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function handle(req, res, url) {
  const cookies = new Cookies(req, res);
  const currentTheme = cookies.get(currentThemeKey) || 'light';
  const options = { maxAge: 30 * 86400 * 1000 };
  cookies.set(currentThemeKey, currentTheme, options);

  const resultId = url.searchParams.get('resultId');

  switch (req.method) {
    case 'GET':
      if (url.pathname === '/result') {
        const result = resultMap.get(resultId);

        if (!result) {
          util.handleNotFound(req, res);
          return;
        }

        const results = result.results.map(question => ({
          ...question,
          userAnswerText:
            question.userAnswer === null || question.userAnswer === ''
              ? '未回答'
              : question.choices[Number(question.userAnswer)],
          correctAnswerText: question.choices[question.correctAnswer]
        }));

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self'; script-src https://* http://localhost:8000/; style-src https://* http://localhost:8000/; font-src https://*;"
        });

        res.end(pug.renderFile('./views/exam.pug', {
          currentTheme,
          isResult: true,
          examId: result.examId,
          examTitle: result.examTitle,
          description: result.description,
          score: result.score,
          passingScore: result.passingScore,
          correctCount: result.correctCount,
          isPassed: result.score >= result.passingScore,
          results
        }));

      } else {
        const examId = url.searchParams.get('id') || 'webApp3_1-5';
        const exams = getExam(examId);

        if (!exams) {
          util.handleNotFound(req, res);
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self'; script-src https://* http://localhost:8000/; style-src https://* http://localhost:8000/; font-src https://*;"
        });

        const oneTimeToken = crypto.randomBytes(16).toString('hex');
        oneTimeTokenMap.set(oneTimeToken, {
          examId: exams.id
        });

        const questions = exams.questions.map(question => ({
          id: question.id,
          question: question.question,
          choices: question.choices
        }));

        res.end(pug.renderFile('./views/exam.pug', {
          currentTheme,
          isResult: false,
          oneTimeToken,
          examId: exams.id,
          examTitle: exams.title,
          description: exams.description,
          questions
        }));

        console.info(
          `閲覧されました, ` +
          `remoteAddress: ${req.socket.remoteAddress}, ` +
          `userAgent: ${req.headers['user-agent']}, `
        );
      }
      break;

    case 'POST':
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      }).on('end', () => {
        const params = new URLSearchParams(body);

        const oneTimeToken = params.get('oneTimeToken');
        const session = oneTimeTokenMap.get(oneTimeToken);

        if (!session) {
          util.handleBadRequest(req, res);
          return;
        }

        oneTimeTokenMap.delete(oneTimeToken);

        const exams = getExam(session.examId);

        if (!exams) {
          util.handleBadRequest(req, res);
          return;
        }

        console.info(`回答が送信されました: ${session.examId}`);

        const answers = exams.questions.map(question => ({
          questionId: question.id,
          answer: params.get(`answer_${question.id}`)
        }));

        const results = exams.questions.map((question, index) => {
          const userAnswer = answers[index].answer;
          const isCorrect = userAnswer !== null &&
            userAnswer !== '' &&
            Number(userAnswer) === question.answer;

          return {
            questionId: question.id,
            question: question.question,
            choices: question.choices,
            correctAnswer: question.answer,
            userAnswer,
            isCorrect
          };
        });

        const correctCount = results.filter(result => result.isCorrect).length;
        const score = correctCount * 10;

        const resultId = crypto.randomBytes(16).toString('hex');

        resultMap.set(resultId, {
          examId: exams.id,
          examTitle: exams.title,
          description: exams.description,
          passingScore: exams.passingScore,
          correctCount,
          score,
          results
        });

        res.writeHead(303, {
          'Location': `/result?resultId=${resultId}`
        });
        res.end();
      });
      break;

    default:
      util.handleBadRequest(req, res);
      break;
  }
}

module.exports = { handle };
