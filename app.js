// app.js
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');   // /login, /register
var itemsRouter = require('./routes/items'); // /items

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// セッション設定
app.use(
  session({
    secret: 'kakeibo-secret', // 適当な文字列でOK
    resave: false,
    saveUninitialized: false,
  })
);

// Prisma を req から使えるようにする & ログイン情報をテンプレに渡す
app.use(function (req, res, next) {
  req.prisma = prisma;
  res.locals.currentUserId = req.session.userId || null;
  next();
});

// ログイン必須ミドルウェア
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// ルーティング
app.use('/', indexRouter);
app.use('/', authRouter);                     // /login, /register
app.use('/items', requireLogin, itemsRouter); // /items 以下はログイン必須
app.use('/users', usersRouter);

// 404 をキャッチしてエラーハンドラへ
app.use(function (req, res, next) {
  next(createError(404));
});

// エラーハンドラ
app.use(function (err, req, res, next) {
  // メッセージとエラーを設定（開発時のみ詳細表示）
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // エラーページをレンダリング
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
