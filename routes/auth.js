// routes/auth.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// GET /login
router.get("/login", (req, res) => {
  const { error } = req.query; // error=invalid / server など
  res.render("login", { error });
});

// POST /login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 入力チェック（念のため）
    if (!email || !password) {
      return res.redirect("/login?error=invalid");
    }

    // メールアドレスでユーザー検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // ユーザーがいない
      return res.redirect("/login?error=invalid");
    }

    // パスワード照合（DB にはハッシュが保存されている前提）
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.redirect("/login?error=invalid");
    }

    // ログイン成功 → セッションに userId を保存
    req.session.userId = user.id;
    res.redirect("/items"); // 家計簿メインページ
  } catch (err) {
    console.error("Login error:", err);
    res.redirect("/login?error=server");
  }
});

// GET /register
router.get("/register", (req, res) => {
  const { error } = req.query; // error=exists / server など
  res.render("register", { error });
});

// POST /register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.redirect("/register?error=server");
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // すでに登録済み
      return res.redirect("/register?error=exists");
    }

    // パスワードをハッシュ化して保存
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        // 🔴 ここが超重要：Prisma の schema のフィールド名に合わせて「password」
        password: hashedPassword,
      },
    });

    // 登録成功 → ログインページへ
    res.redirect("/login");
  } catch (err) {
    console.error("Register error:", err);
    res.redirect("/register?error=server");
  }
});

// GET /logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
