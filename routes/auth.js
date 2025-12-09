// routes/auth.js
var express = require('express');
var router = express.Router();

// 新規登録ページ
router.get('/register', function (req, res, next) {
  res.render('register', { error: null });
});

// 新規登録処理
router.post('/register', async function (req, res, next) {
  const prisma = req.prisma;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('register', { error: 'メールとパスワードは必須です。' });
  }

  try {
    const user = await prisma.user.create({
      data: { email, password },
    });
    // ログイン状態にする
    req.session.userId = user.id;
    res.redirect('/items');
  } catch (err) {
    console.log(err);
    res.render('register', { error: 'このメールアドレスは既に使われています。' });
  }
});

// ログインページ
router.get('/login', function (req, res, next) {
  res.render('login', { error: null });
});

// ログイン処理
router.post('/login', async function (req, res, next) {
  const prisma = req.prisma;
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.password !== password) {
    return res.render('login', { error: 'メールかパスワードが違います。' });
  }

  req.session.userId = user.id;
  res.redirect('/items');
});

// ログアウト
router.get('/logout', function (req, res, next) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
