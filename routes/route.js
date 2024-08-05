const router = require("express").Router();
const r_Auth = require("./api/r_Auth");
const r_wisatawan = require("./api/r_Wisatawan");
const r_Desawisata = require("./api/r_Desawisata");
const r_Wisata = require("./api/r_Wisata");
const r_Kuliner = require("./api/r_Kuliner");
const r_Kategori_Kuliner = require("./api/r_Kategori_Menu_Kuliner ");
const r_Menu_Kuliner = require("./api/r_Menu_Kuliner");
const r_Penginapan = require("./api/r_Penginapan");
const r_Pesanan = require("./api/r_Transaksi");
const r_Admin = require("./api/r_Admin");
const r_Pengelola = require("./api/r_Pengelola");
const r_pengunjung = require("./api/r_DataPengunjung");

router.use("/api", r_pengunjung, r_Pengelola, r_Admin, r_wisatawan, r_Auth, r_Desawisata, r_Wisata, r_Kuliner, r_Penginapan, r_Kategori_Kuliner, r_Menu_Kuliner, r_Pesanan);

module.exports = router;