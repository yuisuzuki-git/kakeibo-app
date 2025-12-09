// routes/index.js
var express = require('express');
var router = express.Router();

// ルートに来たらログインページに飛ばす
router.get('/', function (req, res) {
  res.redirect('/login');
});

module.exports = router;
