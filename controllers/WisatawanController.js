const db = require("../models");
const tbl_wisatawan = db.tbl_Wisatawan;
const moment = require('moment-timezone');
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require('jsonwebtoken');


const checkExistEmailWisatawan = async (req, res) => {

  try {
    const { email } = req.body;

    const ExistEmail = await tbl_wisatawan.findOne({ where: { email: email } });

    if (ExistEmail) {
      return res.status(200).json({
        status: 200,
        success: true,
        message: "Email sudah terdaftar!",
      });

    } else {
      return res.status(422).json({
        status: 422,
        success: false,
        message: "Email belum terdaftar!",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "internal server error",
      data: null,
      error: "Internal Server Error",
    });
  }
};

const post_wisatawan = async (req, res) => {
  try {

    const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

    const { name, nama_lengkap, no_hp, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const data = await tbl_wisatawan.create({
      name: name,
      nama_lengkap: nama_lengkap,
      no_hp: no_hp,
      email: email,
      password: hashedPassword,
      profile: "default.jpg",
      createdAt: currentDateTime,
      updatedAt: currentDateTime
    });

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Registrasi Berhasil",
      data: {
        data: data,
      },
      error: null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "internal server error",
      data: null,
      error: "Internal Server Error",
    });
  }
};

const get_all = async (req, res) => {
  try {
    const Wisatawans = await tbl_wisatawan.findAll();
    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data Wisatawan",
      data: {
        Wisatawans,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "internal server error",
      data: null,
      error: "Internal Server Error",
    });
  }
};

const get_detail = async (req, res) => {
  try {
    let id_wisatawan;

    const token = req.cookies.refreshtoken;

    if (!token) {
      return res.status(401).json({ msg: "Akun Belum Login!", token });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    id_wisatawan = decoded.id;

    const data = await tbl_wisatawan.findOne({
      where: {
        id_wisatawan,
      },
    });

    if (!data) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null
      });
    }

    const result = {
      id_wisatawan: data.id_wisatawan,
      name: data.name,
      nama_lengkap: data.nama_lengkap,
      no_hp: data.no_hp,
      email: data.email,
      profile: data.profile,
    };

    return res.status(200).json({
      success: true,
      message: "Sukses mendapatkan data",
      data: result
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "internal server error",
      data: null,
      error: "Internal Server Error",
    });
  }
};

const put_wisatawan = async (req, res) => {
  try {
    const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

    let id_wisatawan;

    const token = req.cookies.refreshtoken;

    if (!token) {
      return res.status(401).json({ msg: "Akun Belum Login!", token });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    id_wisatawan = decoded.id;

    const data = await tbl_wisatawan.findOne({
      where: {
        id_wisatawan,
      },
    });

    if (!data) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null
      });
    }


    const { name, nama_lengkap, no_hp } = req.body;

    const update_data = await data.update({
      name: name,
      nama_lengkap: nama_lengkap,
      no_hp: no_hp,
      updatedAt: currentDateTime
    });

    if (!update_data) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: "Gagal mengubah data!",
      });
    }

    return res.status(200).json({
      status: 'success',
      message: "Data Berhasil diperbarui",
      data: update_data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "internal server error",
      data: null,
      error: "Internal Server Error",
    });
  }
};

module.exports = {
  get_all,
  get_detail,
  put_wisatawan,
  post_wisatawan,
  checkExistEmailWisatawan
};