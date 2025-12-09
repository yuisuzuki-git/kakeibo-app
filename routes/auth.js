// routes/auth.js
var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* ==========
   GET /login
   ========== */
router.get("/login", function (req, res, next) {
  const { error } = req.query;
  let errorMessage = "";

  if (error === "server") {
    errorMessage = "サーバーエラーが発生しました";
  } else if (error === "invalid") {
    errorMessage = "メールアドレスまたはパスワードが違います";
  }

  res.render("login", { error: errorMessage });
});

/* ==============
   GET /register
   ============== */
router.get("/register", function (req, res, next) {
  const { error } = req.query;
  let errorMessage = "";

  if (error === "exists") {
    errorMessage = "このメールアドレスは既に使われています。";
  } else if (error === "server") {
    errorMessage = "サーバーエラーが発生しました";
  }

  res.render("register", { error: errorMessage });
});

/* =================
   POST /register
   ================= */
router.post("/register", async function (req, res, next) {
  const { email, password } = req.body;

  try {
    // パスワードをハッシュ化
    const hashed = await bcrypt.hash(password, 10);

    // ユーザー作成（schema.prisma で passwordHash というカラム名にしている前提）
    await prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
      },
    });

    // 登録できたらログイン画面へ
    res.redirect("/login");
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    // 一意制約エラー（同じメールアドレスが既に存在）
    if (err.code === "P2002") {
      return res.redirect("/register?error=exists");
    }

    // それ以外はサーバーエラー扱い
    return res.redirect("/register?error=server");
  }
});

/* ==============
   POST /login
   ============== */
router.post("/login", async function (req, res, next) {
  const { email, password } = req.body;

  try {
    // メールアドレスでユーザー取得
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // ユーザーが見つからない
    if (!user) {
      return res.redirect("/login?error=invalid");
    }

    // パスワード確認（passwordHash カラムと比較）
    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.redirect("/login?error=invalid");
    }

    // ログイン成功 → セッションにユーザーIDを保存
    req.session.userId = user.id;

    // 家計簿のメイン画面へ
    res.redirect("/items");
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.redirect("/login?error=server");
  }
});

/* ==============
   POST /logout
   ============== */
router.post("/logout", function (req, res, next) {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
