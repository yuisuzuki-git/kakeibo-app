const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* -------------------------------------------------------
   ログイン確認ミドルウェア
--------------------------------------------------------- */
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

/* -------------------------------------------------------
   Dashboard（一覧ページ）
   GET /items
--------------------------------------------------------- */
router.get('/', requireLogin, async (req, res, next) => {
  try {
    const userId = req.session.userId;

    const type = req.query.type || 'all';
    const from = req.query.from || '';
    const to = req.query.to || '';

    const where = { userid: userId };

    if (type !== 'all') {
      where.type = type;
    }

    if (from) {
      where.createdAt = Object.assign(where.createdAt || {}, { gte: new Date(from) });
    }
    if (to) {
      where.createdAt = Object.assign(where.createdAt || {}, { lte: new Date(to) });
    }

    // 一覧取得
    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // 合計計算
    const incomeTotal = items
      .filter(i => i.type === 'income')
      .reduce((sum, i) => sum + i.amount, 0);

    const expenseTotal = items
      .filter(i => i.type === 'expense')
      .reduce((sum, i) => sum + i.amount, 0);

    const balance = incomeTotal - expenseTotal;

    res.render('items', {
      items,
      type,
      from,
      to,
      incomeTotal,
      expenseTotal,
      balance
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------
   新規追加 POST /items
--------------------------------------------------------- */
router.post('/', requireLogin, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { amount, type, event, memo } = req.body;

    await prisma.item.create({
      data: {
        userid: userId,
        amount: Number(amount),
        type,
        event,
        memo
      }
    });

    res.redirect('/items');
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------
   詳細ページ GET /items/detail
--------------------------------------------------------- */
router.get('/detail', requireLogin, async (req, res, next) => {
  try {
    const id = Number(req.query.id);

    const item = await prisma.item.findUnique({
      where: { id }
    });

    if (!item) return res.status(404).send("Not found");

    res.render('itemDetail', { item });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------
   編集ページ GET /items/edit/:id
--------------------------------------------------------- */
router.get('/edit/:id', requireLogin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const item = await prisma.item.findUnique({
      where: { id }
    });

    if (!item) return res.status(404).send("Not found");

    res.render('editItem', { item });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------
   編集処理 POST /items/edit/:id
--------------------------------------------------------- */
router.post('/edit/:id', requireLogin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { amount, type, event, memo } = req.body;

    await prisma.item.update({
      where: { id },
      data: {
        amount: Number(amount),
        type,
        event,
        memo
      }
    });

    res.redirect('/items');
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------
   削除 POST /items/delete/:id
--------------------------------------------------------- */
router.post('/delete/:id', requireLogin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    await prisma.item.delete({
      where: { id }
    });

    res.redirect('/items');
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------
   Statsページ：グラフ
   GET /items/stats
--------------------------------------------------------- */
router.get('/stats', requireLogin, async (req, res, next) => {
  try {
    const userId = req.session.userId;

    const items = await prisma.item.findMany({
      where: { userid: userId },
      orderBy: { createdAt: 'asc' }
    });

    const map = {};
    for (const item of items) {
      const d = item.createdAt.toISOString().slice(0, 10);
      if (!map[d]) map[d] = { income: 0, expense: 0 };

      if (item.type === 'income') {
        map[d].income += item.amount;
      } else {
        map[d].expense += item.amount;
      }
    }

    const labels = Object.keys(map).sort();
    const incomeData = labels.map(d => map[d].income);
    const expenseData = labels.map(d => map[d].expense);

    res.render('stats', {
      labels: JSON.stringify(labels),
      incomeData: JSON.stringify(incomeData),
      expenseData: JSON.stringify(expenseData)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
