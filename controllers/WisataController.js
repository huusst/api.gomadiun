const db = require('../models');
const tbl_Wisata = db.tbl_Wisata;
const tbl_Admin = db.tbl_Admin;
const tbl_DesaWisata = db.tbl_DesaWisata;
const tbl_fasilitas_wisata = db.tbl_fasilitas_wisata;
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const multer = require('multer');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = "./uploads/img/wisata";
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/png"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Hanya support format .jpg, .jpeg, .png"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 300 * 1024 * 1024 }, // Limit file size to 300MB
});


const get_recomendasi_wisata = async (req, res) => {
  try {
    const {
      dana,
      jumlah,
    } = req.body;

    if (!dana) {
      return res.status(400).send({ error: "Dana is required" });
    }

    const data = await tbl_Wisata.findAndCountAll({ where: { status_verifikasi: 'verified' } });

    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null,
      });
    }

    const Bobot_Acuan = [0.26, 0.23, 0.13, 0.18, 0.2];

    function normalisasiData(matrix) {
      let dataPencocokan = [];
      let dataNormalisasi = [];
  
      for (let row of matrix) {
        let rowDataPencocokan = [
          row[0],
          row[1] === "1" ? 5 : row[1] === "2" ? 3 : 1,
          row[2] === "1" ? 5 : row[2] === "2" ? 3 : 1,
          row[3] === 5 ? 5 : row[3] === 4 ? 4 : row[3] === 3 ? 4 : row[3] === 2 ? 3 : row[3] === 1 ? 2 : 1,
          row[4],
        ];
        dataPencocokan.push(rowDataPencocokan);
      }

      let maxC1 = Math.max(...dataPencocokan.map(row => row[0]));
      let maxC2 = Math.max(...dataPencocokan.map(row => row[1]));
      let maxC3 = Math.max(...dataPencocokan.map(row => row[2]));
      let maxC4 = Math.max(...dataPencocokan.map(row => row[3]));
      let minC5 = Math.min(...dataPencocokan.map(row => row[4]));

      for (let row of dataPencocokan) {
        let rowDataNormalisasi = [
          // row[0] === 0 ? row[0] / 1 : row[0] / maxC1,
          maxC1 === 0 ? row[0] / 1 : row[0] / maxC1,
          row[1] / maxC2,
          row[2] / maxC3,
          row[3] / maxC4,
          minC5 / row[4],
        ];
        dataNormalisasi.push(rowDataNormalisasi);
      }

      return dataNormalisasi;
    }

    function perangkingan(matrix, weight) {
      let dataNormal = normalisasiData(matrix);
      let preferenceValues = dataNormal.map(row => {
        return row.reduce((acc, val, idx) => acc + (val * weight[idx]), 0);
      });
      return preferenceValues;
    }


    let filteredData = data.rows.filter(item => {
      let totalHarga = item.harga_tiket * jumlah;
      return totalHarga <= dana;
    });

    if (filteredData.length === 0) {
      return res.status(404).send({ error: "Tidak ada destinasi sesuai budget Anda" });
    }

    let matrix = filteredData.map(destinasi => [destinasi.total_pengunjung_destinasi, destinasi.status_jalan, destinasi.jenis_kendaraan, destinasi.jumlah_fasilitas, destinasi.harga_tiket]);
    let nilai_perangkingan = perangkingan(matrix, Bobot_Acuan);

    let destinations = filteredData.map((dest, index) => ({
      ...dest.dataValues,
      recommended: index === nilai_perangkingan.indexOf(Math.max(...nilai_perangkingan)),
      nilai_perangkingan: nilai_perangkingan[index]
    }));

    // Urutkan berdasarkan nilai_perangkingan tertinggi ke terendah
    destinations.sort((a, b) => b.nilai_perangkingan - a.nilai_perangkingan);

    const result = {
      success: true,
      message: "Sukses mendapatkan rekomendasi",
      data: destinations,
    };

    res.status(200).json(result);

  } catch (error) {
    console.log(error, 'Data Error');
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      data: null
    });
  }

}

const get_all_wisata = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      keyword = '',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.and]: [
        { status_verifikasi: 'verified' },
        keyword ? {
          [Op.or]: [
            { nama_desaWisata: { [Op.like]: `%${keyword}%` } },
            { desk_desaWisata: { [Op.like]: `%${keyword}%` } },
          ]
        } : {}
      ]
    };

    const orderClause = [
      ['total_pengunjung_destinasi', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
    ];


    const data = await tbl_Wisata.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      order: orderClause
    });

    const totalPages = limit ? Math.ceil(data.count / (limit || 1)) : 1;
    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null,
        pages: {
          total: 0,
          per_page: limit || 0,
          next_page: null,
          to: 0,
          last_page: 0,
          current_page: page || 1,
          from: 0,
        },
      });
    }

    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: data.rows.map((items) => ({
        id: items.id_wisata,
        nama: items.nama_destinasi,
        kategori: "Wisata",
        harga: items.harga_tiket,
        pengunjung: items.total_pengunjung_destinasi,
        imageUrl: items.sampul_destinasi,
      })),
      pages: {
        total: data.count,
        per_page: parseInt(limit, 10) || data.count,
        next_page: limit && page ? (page < totalPages ? page + 1 : null) : null,
        to: limit ? offset + data.rows.length : data.count,
        last_page: totalPages,
        current_page: parseInt(page, 10) || 1,
        from: offset,
      },

    };

    const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const excludePagesUrl = "http://localhost:3001/api/desawisata/get_all";

    if (currentUrl === excludePagesUrl) {
      delete result.pages;
    }

    res.status(200).json(result);

  } catch (error) {
    console.log(error, 'Data Error');
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      data: null
    });
  }
};

const get_detail_wisata = async (req, res) => {
  try {
    const { id_wisata } = req.params;

    if (!id_wisata) {
      return res.status(400).send({ error: "id_wisata is required" });
    }

    const data = await tbl_Wisata.findOne({
      where: {
        id_wisata,
      },
    });

    if (!data) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null
      });
    }

    const data_fasilitas = await tbl_fasilitas_wisata.findAll({
      where: {
        id_wisata,
      },
      attributes: ['value_fasilitas_wisata', 'nama_fasilitas_wisata']
    });

    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: [{
        id: data.id_wisata,
        nama: data.nama_destinasi,
        deskripsi: data.desk_destinasi,
        harga: data.harga_tiket,
        no_telp: data.kontak_person_destinasi,
        alamat: data.alamat_destinasi,
        link_iframe: data.maps_destinasi,
        status_jalan: data.status_jalan,
        jenis_kendaraan: data.jenis_kendaraan,
        imageUrl: data.sampul_destinasi,
        data_fasilitas
      }],

    };

    res.status(200).json(result);

  } catch (error) {
    console.log(error, 'Data Error');
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      data: null
    });
  }
};

const get_all_wisata_byDesawisata = async (req, res) => {
  try {
    const { id_desaWisata } = req.params;

    if (!id_desaWisata) {
      return res.status(400).send({ error: "id_desawisata is required" });
    }

    const {
      limit = 10,
      page = 1,
      keyword = '',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.and]: [
        { id_desaWisata },
        { status_verifikasi: 'verified' },
        keyword ? {
          [Op.or]: [
            { nama_desaWisata: { [Op.like]: `%${keyword}%` } },
            { desk_desaWisata: { [Op.like]: `%${keyword}%` } },
          ]
        } : {}
      ]
    };

    const orderClause = [
      ['total_pengunjung_destinasi', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
    ];


    const data = await tbl_Wisata.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      order: orderClause
    });

    const totalPages = limit ? Math.ceil(data.count / (limit || 1)) : 1;
    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null,
        pages: {
          total: 0,
          per_page: limit || 0,
          next_page: null,
          to: 0,
          last_page: 0,
          current_page: page || 1,
          from: 0,
        },
      });
    }

    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: data.rows.map((items) => ({
        id: items.id_wisata,
        nama: items.nama_destinasi,
        kategori: "Wisata",
        harga: items.harga_tiket,
        imageUrl: items.sampul_destinasi,
      })),
      pages: {
        total: data.count,
        per_page: parseInt(limit, 10) || data.count,
        next_page: limit && page ? (page < totalPages ? page + 1 : null) : null,
        to: limit ? offset + data.rows.length : data.count,
        last_page: totalPages,
        current_page: parseInt(page, 10) || 1,
        from: offset,
      },

    };

    const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const excludePagesUrl = "http://localhost:3001/api/desawisata/get_all";

    if (currentUrl === excludePagesUrl) {
      delete result.pages;
    }

    res.status(200).json(result);

  } catch (error) {
    console.log(error, 'Data Error');
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      data: null
    });
  }
};


//admin
const get_all_wisata_byAdmin = async (req, res) => {
  try {

    let id_admin;

    const token = req.cookies.tokenadmin;

    if (!token) {
      return res.status(401).json({ message: "Akun Belum Login!", token });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    id_admin = decoded.id;


    const user_admin = await tbl_Admin.findOne({
      attributes: ['role'],
      where: {
        id_admin
      }
    });

    if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola" && user_admin.role !== "user pengelola") {
      return res.status(401).json({ message: "Hak akses ditolak" });
    }

    const {
      keyword = '',
      byAdmin = '',
      byAdminPengelola = '',
      order = 'DESC',
    } = req.query;

    const whereClause = {
      [Op.and]: [
        byAdmin ? {
          id_admin: byAdmin
        } : {},
        byAdminPengelola ? {
          id_admin_pengelola: byAdminPengelola
        } : {},
        keyword ? {
          [Op.or]: [
            { nama_destinasi: { [Op.like]: `%${keyword}%` } },
            { nib_destinasi: { [Op.like]: `%${keyword}%` } },
            { alamat_destinasi: { [Op.like]: `%${keyword}%` } },
            { kbli_destinasi: { [Op.like]: `%${keyword}%` } },
            { npwp_destinasi: { [Op.like]: `%${keyword}%` } },
            { harga_tiket: { [Op.like]: `%${keyword}%` } },
          ]
        } : {}
      ]
    }

    const orderClause = [
      ['id_wisata', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
    ];

    const data = await tbl_Wisata.findAndCountAll({
      where: whereClause,
      order: orderClause,
    });

    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null,
      });
    }

    const results = await Promise.all(data.rows.map(async (wisata) => {
      let detail_author = [];
      let detail_admin = [];
      let detail_admin_verified = [];
      let detail_admin_pengelola = [];
      let detail_desa_wisata = [];
      let detail_fasilitas_wisata = [];

      detail_author = await tbl_Admin.findOne({
        where: { id_admin: wisata.id_admin_author },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin = await tbl_Admin.findOne({
        where: { id_admin: wisata.id_admin },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin_verified = await tbl_Admin.findOne({
        where: { id_admin: wisata.id_admin_verifed },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin_pengelola = await tbl_Admin.findOne({
        where: { id_admin: wisata.id_admin_pengelola },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_desa_wisata = await tbl_DesaWisata.findOne({
        where: { id_desaWisata: wisata.id_desaWisata },
        attributes: [
          "id_desaWisata",
          "nama_desaWisata"
        ]
      });

      detail_fasilitas_wisata = await tbl_fasilitas_wisata.findAll({
        where: {
          id_wisata: wisata.id_wisata,
        },
        attributes: ['value_fasilitas_wisata']
      });


      return {
        id_wisata: wisata.id_wisata,
        detail_admin,
        detail_admin_verified,
        detail_author,
        detail_desa_wisata,
        detail_admin_pengelola,
        nama_destinasi: wisata.nama_destinasi,
        nib_destinasi: wisata.nib_destinasi,
        kbli_destinasi: wisata.kbli_destinasi,
        npwp_destinasi: wisata.npwp_destinasi,
        alamat_destinasi: wisata.alamat_destinasi,
        npwp_pemilik_destinasi: wisata.npwp_pemilik_destinasi,
        desk_destinasi: wisata.desk_destinasi,
        sampul_destinasi: wisata.sampul_destinasi,
        ruang_destinasi: wisata.ruang_destinasi,
        status_jalan: wisata.status_jalan,
        jenis_kendaraan: wisata.jenis_kendaraan,
        harga_tiket: wisata.harga_tiket,
        detail_fasilitas_wisata,
        kontak_person_destinasi: wisata.kontak_person_destinasi,
        total_pengunjung_destinasi: wisata.total_pengunjung_destinasi,
        status_wisata: wisata.status_wisata,
        status_verifikasi: wisata.status_verifikasi,
        updatedAt: wisata.updatedAt
      };
    }));

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data Destinasi Wisata",
      data: results
    });

  } catch (error) {
    console.log(error, 'Data Error');
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

const get_detail_wisata_byAdmin = async (req, res) => {
  try {


    let id_admin;

    const token = req.cookies.tokenadmin;

    if (!token) {
      return res.status(401).json({ message: "Akun Belum Login!", token });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    id_admin = decoded.id;


    const user_admin = await tbl_Admin.findOne({
      attributes: ['role'],
      where: {
        id_admin
      }
    });

    if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola" && user_admin.role !== "user pengelola") {
      return res.status(401).json({ message: "Hak akses ditolak" });
    }

    const { id_wisata } = req.params;

    if (!id_wisata) {
      return res.status(422).send({ error: "id_wisata is required" });
    }

    const data = await tbl_Wisata.findAndCountAll({
      where: {
        id_wisata,
      },
    });

    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null,
      });
    }

    const results = await Promise.all(data.rows.map(async (wisata) => {
      let detail_author = [];
      let detail_admin = [];
      let detail_admin_verified = [];
      let detail_admin_pengelola = [];
      let detail_desa_wisata = [];
      let detail_fasilitas_wisata = [];

      detail_author = await tbl_Admin.findOne({
        where: { id_admin: wisata.id_admin_author },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin = await tbl_Admin.findOne({
        where: { id_admin: wisata.id_admin },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin_verified = await tbl_Admin.findOne({
        where: { id_admin: wisata.id_admin_verifed },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin_pengelola = await tbl_Admin.findOne({
        where: { id_admin: wisata.id_admin_pengelola },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_desa_wisata = await tbl_DesaWisata.findOne({
        where: { id_desaWisata: wisata.id_desaWisata },
        attributes: [
          "id_desaWisata",
          "nama_desaWisata"
        ]
      });

      detail_fasilitas_wisata = await tbl_fasilitas_wisata.findAll({
        where: {
          id_wisata,
        },
        attributes: ['value_fasilitas_wisata', 'nama_fasilitas_wisata']
      });



      return {
        id_wisata: wisata.id_wisata,
        detail_admin,
        detail_admin_verified,
        detail_author,
        detail_admin_pengelola,
        detail_desa_wisata,
        nama_destinasi: wisata.nama_destinasi,
        nib_destinasi: wisata.nib_destinasi,
        kbli_destinasi: wisata.kbli_destinasi,
        npwp_destinasi: wisata.npwp_destinasi,
        alamat_destinasi: wisata.alamat_destinasi,
        npwp_pemilik_destinasi: wisata.npwp_pemilik_destinasi,
        desk_destinasi: wisata.desk_destinasi,
        maps_destinasi: wisata.maps_destinasi,
        sampul_destinasi: wisata.sampul_destinasi,
        ruang_destinasi: wisata.ruang_destinasi,
        status_jalan: wisata.status_jalan,
        jenis_kendaraan: wisata.jenis_kendaraan,
        harga_tiket: wisata.harga_tiket,
        kontak_person_destinasi: wisata.kontak_person_destinasi,
        total_pengunjung_destinasi: wisata.total_pengunjung_destinasi,
        status_wisata: wisata.status_wisata,
        status_verifikasi: wisata.status_verifikasi,
        detail_fasilitas_wisata,
        createdAt: wisata.createdAt,
        updatedAt: wisata.updatedAt
      };
    }));

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data Desa Wisata",
      data: results
    });

  } catch (error) {
    console.log(error, 'Data Error');
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      data: null
    });
  }
};

const add_data_wisata_byAdmin = async (req, res) => {
  upload.fields([{ name: 'foto_depan', maxCount: 1 }, { name: 'foto_ruang', maxCount: 1 }])(req, res, async (err) => {
    if (err) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: err.message
      });
    }

    try {

      let id_admin_login;

      const token = req.cookies.tokenadmin;

      if (!token) {
        return res.status(401).json({ message: "Akun Belum Login!", token });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      id_admin_login = decoded.id;


      const user_admin = await tbl_Admin.findOne({
        attributes: ['role'],
        where: {
          id_admin: id_admin_login
        }
      });

      if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola") {
        return res.status(401).json({ message: "Hak akses ditolak" });
      }

      const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

      const {
        id_admin,
        id_desaWisata,
        id_admin_pengelola,
        nama_destinasi,
        nib_destinasi,
        kbli_destinasi,
        alamat_destinasi,
        status_wisata,
        npwp_pemilik_destinasi,
        npwp_destinasi,
        status_jalan,
        jenis_kendaraan,
        desk_destinasi,
        harga_tiket,
        kontak_person_destinasi,
      } = req.body;

      let add_data = [];

      if (user_admin.role === "admin" || user_admin.role === "dinas") {

        if (
          !id_admin ||
          !id_desaWisata ||
          !id_admin_pengelola ||
          !nama_destinasi ||
          !alamat_destinasi ||
          !status_wisata ||
          !desk_destinasi ||
          !status_jalan ||
          !jenis_kendaraan ||
          !harga_tiket ||
          !kontak_person_destinasi
        ) {
          return res.status(422).json({ status: 'error', message: "Lengkapi data inputan destinasi wisata" });
        }

        const cek_admin = await tbl_Admin.findAndCountAll({
          where: {
            id_admin: id_admin
          },
        });

        if (cek_admin.count === 0) {
          return res.status(422).json({
            status: 'error',
            success: false,
            message: "Admin tidak terdaftar",
          });
        }

        const cek_desawisata = await tbl_DesaWisata.findAndCountAll({
          where: {
            id_desaWisata: id_desaWisata
          },
        });

        if (cek_desawisata.count === 0) {
          return res.status(422).json({
            status: 'error',
            success: false,
            message: "Desa wisata tidak terdaftar",
          });
        }

        const cek_admin_pengelola = await tbl_Admin.findAndCountAll({
          where: {
            id_admin: id_admin_pengelola
          },
        });

        if (cek_admin_pengelola.count === 0) {
          return res.status(422).json({
            status: 'error',
            success: false,
            message: "User pengelola tidak terdaftar",
          });
        }

        const uploadedFile1 = req.files['foto_depan'] ? `${req.protocol}://${req.get("host")}/uploads/img/wisata/${req.files['foto_depan'][0].filename}` : null;
        const uploadedFile2 = req.files['foto_ruang'] ? `${req.protocol}://${req.get("host")}/uploads/img/wisata/${req.files['foto_ruang'][0].filename}` : null;


        add_data = await tbl_Wisata.create({
          id_desaWisata: id_desaWisata,
          id_admin: id_admin,
          id_admin_pengelola: id_admin_pengelola,
          nama_destinasi: nama_destinasi,
          nib_destinasi: nib_destinasi,
          kbli_destinasi: kbli_destinasi,
          alamat_destinasi: alamat_destinasi,
          npwp_destinasi: npwp_destinasi,
          npwp_pemilik_destinasi: npwp_pemilik_destinasi,
          desk_destinasi: desk_destinasi,
          sampul_destinasi: uploadedFile1,
          ruang_destinasi: uploadedFile2,
          harga_tiket: harga_tiket,
          status_jalan: status_jalan,
          jenis_kendaraan: jenis_kendaraan,
          kontak_person_destinasi: kontak_person_destinasi,
          status_wisata: status_wisata,
          total_pengunjung_destinasi: 0,
          jumlah_fasilitas: 0,
          id_admin_author: id_admin_login,
          status_verifikasi: 'unverified',
          createdAt: currentDateTime,
          updatedAt: currentDateTime
        });

      } else {

        if (
          !id_desaWisata ||
          !id_admin_pengelola ||
          !nama_destinasi ||
          !alamat_destinasi ||
          !status_wisata ||
          !desk_destinasi ||
          !status_jalan ||
          !jenis_kendaraan ||
          !harga_tiket ||
          !kontak_person_destinasi
        ) {
          return res.status(422).json({ status: 'error', message: "Lengkapi data inputan destinasi wisata" });
        }

        const cek_desawisata = await tbl_DesaWisata.findAndCountAll({
          where: {
            id_desaWisata: id_desaWisata
          },
        });

        if (cek_desawisata.count === 0) {
          return res.status(422).json({
            status: 'error',
            success: false,
            message: "Desa wisata tidak terdaftar",
          });
        }

        const cek_admin_pengelola = await tbl_Admin.findAndCountAll({
          where: {
            id_admin: id_admin_pengelola
          },
        });

        if (cek_admin_pengelola.count === 0) {
          return res.status(422).json({
            status: 'error',
            success: false,
            message: "User pengelola tidak terdaftar",
          });
        }

        const uploadedFile1 = req.files['foto_depan'] ? `${req.protocol}://${req.get("host")}/uploads/img/wisata/${req.files['foto_depan'][0].filename}` : null;
        const uploadedFile2 = req.files['foto_ruang'] ? `${req.protocol}://${req.get("host")}/uploads/img/wisata/${req.files['foto_ruang'][0].filename}` : null;


        add_data = await tbl_Wisata.create({
          id_desaWisata: id_desaWisata,
          id_admin: id_admin_login,
          id_admin_pengelola: id_admin_pengelola,
          nama_destinasi: nama_destinasi,
          nib_destinasi: nib_destinasi,
          kbli_destinasi: kbli_destinasi,
          alamat_destinasi: alamat_destinasi,
          npwp_destinasi: npwp_destinasi,
          npwp_pemilik_destinasi: npwp_pemilik_destinasi,
          desk_destinasi: desk_destinasi,
          sampul_destinasi: uploadedFile1,
          ruang_destinasi: uploadedFile2,
          harga_tiket: harga_tiket,
          status_jalan: status_jalan,
          jenis_kendaraan: jenis_kendaraan,
          kontak_person_destinasi: kontak_person_destinasi,
          status_wisata: status_wisata,
          total_pengunjung_destinasi: 0,
          jumlah_fasilitas: 0,
          id_admin_author: id_admin_login,
          status_verifikasi: 'unverified',
          createdAt: currentDateTime,
          updatedAt: currentDateTime
        });

      }

      if (!add_data) {
        return res.status(422).json({
          status: 'error',
          success: false,
          message: "Destinasi Wisata gagal ditambahkan",
        });
      }

      return res.status(200).json({
        status: "success",
        success: true,
        message: "Destinasi Wisata berhasil ditambahkan",
        data: add_data
      });

    } catch (error) {
      console.log(error, 'Data Error');
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        data: null
      });
    }
  });
};

const update_data_wisata_byAdmin = async (req, res) => {
  upload.fields([{ name: 'foto_depan', maxCount: 1 }, { name: 'foto_ruang', maxCount: 1 }])(req, res, async (err) => {
    if (err) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: err.message
      });
    }

    try {

      let id_admin_login;

      const token = req.cookies.tokenadmin;

      if (!token) {
        return res.status(401).json({ message: "Akun Belum Login!", token });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      id_admin_login = decoded.id;


      const user_admin = await tbl_Admin.findOne({
        attributes: ['role'],
        where: {
          id_admin: id_admin_login
        }
      });

      if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola" && user_admin.role !== "user pengelola") {
        return res.status(401).json({ message: "Hak akses ditolak" });
      }

      const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");


      const { id_wisata } = req.params;

      if (!id_wisata) {
        return res.status(400).send({ error: "id_wisata is required" });
      }

      const wisata_update = await tbl_Wisata.findOne({
        where: {
          id_wisata
        },
      });

      if (!wisata_update) {
        return res.status(422).json({
          status: 'error',
          success: false,
          message: 'Destinasi Wisata tidak terdaftar'
        });
      }

      const {
        id_desaWisata,
        id_admin_pengelola,
        nama_destinasi,
        nib_destinasi,
        kbli_destinasi,
        alamat_destinasi,
        status_wisata,
        npwp_pemilik_destinasi,
        npwp_destinasi,
        desk_destinasi,
        harga_tiket,
        status_jalan,
        jenis_kendaraan,
        kontak_person_destinasi
      } = req.body;

      let update_data = [];

      if (user_admin.role === "admin" || user_admin.role === "dinas" || user_admin.role === "admin pengelola") {

        if (
          !id_desaWisata ||
          !id_admin_pengelola ||
          !nama_destinasi ||
          !alamat_destinasi ||
          !status_wisata ||
          !desk_destinasi ||
          !status_jalan ||
          !jenis_kendaraan ||
          !harga_tiket ||
          !kontak_person_destinasi
        ) {
          return res.status(422).json({ status: 'error', message: "Lengkapi data inputan update destinasi wisata", req_body: req.body });
        }

        const cek_admin_pengelola = await tbl_Admin.findAndCountAll({
          where: {
            id_admin: id_admin_pengelola
          },
        });

        if (cek_admin_pengelola.count === 0) {
          return res.status(422).json({
            status: 'error',
            success: false,
            message: "User pengelola tidak terdaftar",
          });
        }

        let uploadedFile1 = wisata_update.sampul_destinasi
        let uploadedFile2 = wisata_update.ruang_destinasi

        if (req.files) {
          if (req.files['foto_depan']) {
            const name_file = uploadedFile1.split('/uploads/')[1];
            const oldFilePath = `./uploads/${name_file}`;

            fs.unlink(oldFilePath, (err) => {
              if (err) {
                console.error('Error deleting old file:', err);
              }
            });

            uploadedFile1 = `${req.protocol}://${req.get("host")}/uploads/img/wisata/${req.files['foto_depan'][0].filename}`;
          }
          if (req.files['foto_ruang']) {
            const name_file = uploadedFile2.split('/uploads/')[1];
            const oldFilePath = `./uploads/${name_file}`;

            fs.unlink(oldFilePath, (err) => {
              if (err) {
                console.error('Error deleting old file:', err);
              }
            });

            uploadedFile2 = `${req.protocol}://${req.get("host")}/uploads/img/wisata/${req.files['foto_ruang'][0].filename}`;
          }
        }

        update_data = await wisata_update.update({
          id_desaWisata: id_desaWisata,
          id_admin_pengelola: id_admin_pengelola,
          nama_destinasi: nama_destinasi,
          nib_destinasi: nib_destinasi,
          kbli_destinasi: kbli_destinasi,
          alamat_destinasi: alamat_destinasi,
          npwp_destinasi: npwp_destinasi,
          npwp_pemilik_destinasi: npwp_pemilik_destinasi,
          desk_destinasi: desk_destinasi,
          sampul_destinasi: uploadedFile1,
          ruang_destinasi: uploadedFile2,
          harga_tiket: harga_tiket,
          status_jalan: status_jalan,
          jenis_kendaraan: jenis_kendaraan,
          kontak_person_destinasi: kontak_person_destinasi,
          status_wisata: status_wisata,
          id_admin_author: id_admin_login,
          updatedAt: currentDateTime
        });

      } else {

        if (
          !nama_destinasi ||
          !alamat_destinasi ||
          !status_wisata ||
          !desk_destinasi ||
          !status_jalan ||
          !jenis_kendaraan ||
          !harga_tiket ||
          !kontak_person_destinasi
        ) {
          return res.status(422).json({ status: 'error', message: "Lengkapi data inputan update destinasi wisata", req_body: req.body });
        }

        let uploadedFile1 = wisata_update.sampul_destinasi
        let uploadedFile2 = wisata_update.ruang_destinasi

        if (req.file) {
          if (req.files['foto_depan']) {
            const name_file = uploadedFile1.split('/uploads/')[1];
            const oldFilePath = `./uploads/${name_file}`;

            fs.unlink(oldFilePath, (err) => {
              if (err) {
                console.error('Error deleting old file:', err);
              }
            });

            uploadedFile1 = `${req.protocol}://${req.get("host")}/uploads/img/wisata/${req.files['foto_depan'][0].filename}`;
          }
          if (req.files['foto_ruang']) {
            const name_file = uploadedFile2.split('/uploads/')[1];
            const oldFilePath = `./uploads/${name_file}`;

            fs.unlink(oldFilePath, (err) => {
              if (err) {
                console.error('Error deleting old file:', err);
              }
            });

            uploadedFile2 = `${req.protocol}://${req.get("host")}/uploads/img/wisata/${req.files['foto_ruang'][0].filename}`;
          }
        }

        update_data = await wisata_update.update({
          id_admin_pengelola: id_admin_login,
          nama_destinasi: nama_destinasi,
          nib_destinasi: nib_destinasi,
          kbli_destinasi: kbli_destinasi,
          alamat_destinasi: alamat_destinasi,
          npwp_destinasi: npwp_destinasi,
          npwp_pemilik_destinasi: npwp_pemilik_destinasi,
          desk_destinasi: desk_destinasi,
          sampul_destinasi: uploadedFile1,
          ruang_destinasi: uploadedFile2,
          harga_tiket: harga_tiket,
          status_jalan: status_jalan,
          jenis_kendaraan: jenis_kendaraan,
          kontak_person_destinasi: kontak_person_destinasi,
          status_wisata: status_wisata,
          id_admin_author: id_admin_login,
          updatedAt: currentDateTime
        });

      }

      if (!update_data) {
        return res.status(422).json({
          status: 'error',
          success: false,
          message: "Destinasi Wisata gagal diubah",
        });
      }

      return res.status(200).json({
        status: "success",
        success: true,
        message: "Destinasi Wisata berhasil diubah",
        data: update_data
      });

    } catch (error) {
      console.log(error, 'Data Error');
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        data: null
      });
    }
  });
};

const put_verifikasi_wisata = async (req, res) => {
  try {

    let id_admin_login;

    const token = req.cookies.tokenadmin;

    if (!token) {
      return res.status(401).json({ msg: "Akun Belum Login!", token });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    id_admin_login = decoded.id;

    const user_admin = await tbl_Admin.findOne({
      attributes: ['role'],
      where: {
        id_admin: id_admin_login
      }
    });

    if (user_admin.role !== "admin" && user_admin.role !== "dinas") {
      return res.status(401).json({ message: "Hak akses ditolak" });
    }

    const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");


    const { id_wisata } = req.params;

    if (!id_wisata) {
      return res.status(400).send({ error: "id_wisata is required" });
    }

    const { id_admin, status_verifikasi } = req.body;

    if (!id_admin || !status_verifikasi) {
      return res.status(422).json({ status: 'error', message: "Lengkapi data inputan verifikasi desa" });
    }

    const admin_verifikator = await tbl_Admin.findOne({
      where: {
        [Op.and]: [
          { id_admin: id_admin },
          { role: "dinas" }
        ]
      }
    });

    if (!admin_verifikator) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: 'Admin verifikator tidak valid'
      });
    }

    const wisata_update = await tbl_Wisata.findOne({
      where: {
        id_wisata
      },
    });

    if (!wisata_update) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: 'Destinasi Wisata tidak terdaftar'
      });
    }


    const update_data = await wisata_update.update({
      id_admin_verifed: id_admin,
      status_verifikasi: status_verifikasi,
      id_admin_author: id_admin_login,
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
      message: "Data Destinas Wisata berhasil diverifikasi",
      data: update_data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: "internal server error",
      data: null,
    });
  }
};

const put_update_maps_wisata = async (req, res) => {
  try {

    let id_admin_login;

    const token = req.cookies.tokenadmin;

    if (!token) {
      return res.status(401).json({ msg: "Akun Belum Login!", token });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    id_admin_login = decoded.id;

    const user_admin = await tbl_Admin.findOne({
      attributes: ['role'],
      where: {
        id_admin: id_admin_login
      }
    });

    if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola" && user_admin.role !== "user pengelola") {
      return res.status(401).json({ message: "Hak akses ditolak" });
    }

    const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");


    const { id_wisata } = req.params;

    if (!id_wisata) {
      return res.status(400).send({ error: "id_wisata is required" });
    }

    const { url } = req.body;

    if (!url) {
      return res.status(422).json({ status: 'error', message: "Lengkapi data inputan" });
    }

    const wisata_update = await tbl_Wisata.findOne({
      where: {
        id_wisata
      },
    });

    if (!wisata_update) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: 'Destinasi Wisata tidak terdaftar'
      });
    }

    const update_data = await wisata_update.update({
      maps_destinasi: url,
      id_admin_author: id_admin_login,
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
      message: "Maps berhasil ditambahkan",
      data: update_data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: "internal server error",
      data: null,
    });
  }
};

const delete_data_wisata_byAdmin = async (req, res) => {
  try {

    let id_admin_login;

    const token = req.cookies.tokenadmin;

    if (!token) {
      return res.status(401).json({ msg: "Akun Belum Login!", token });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    id_admin_login = decoded.id;

    const user_admin = await tbl_Admin.findOne({
      attributes: ['role'],
      where: {
        id_admin: id_admin_login
      }
    });

    if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola") {
      return res.status(422).json({ message: "Anda tidak dapat menghapus data" });
    }


    const { id_wisata } = req.params;

    if (!id_wisata) {
      return res.status(400).send({ error: "id_wisata is required" });
    }

    const wisata_data_delete = await tbl_Wisata.findOne({
      where: {
        id_wisata
      },
    });

    if (!wisata_data_delete) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: 'Destinasi Wisata tidak terdaftar'
      });
    }

    let url_sampul = wisata_data_delete.sampul_destinasi;
    let url_ruang = wisata_data_delete.ruang_destinasi;
    const uploadedFile = url_sampul.split('/uploads/')[1];
    const oldFilePath = `./uploads/${uploadedFile}`;
    const uploadedFile2 = url_ruang.split('/uploads/')[1];
    const oldFilePath2 = `./uploads/${uploadedFile2}`;

    fs.unlink(oldFilePath, (err) => {
      if (err) {
        console.error('Error deleting old file:', err);
      } else {
        fs.unlink(oldFilePath2, (err) => {
          if (err) {
            console.error('Error deleting old file:', err);
          } else {
            console.log('File deleted successfully.');
          }
        });
      }
    });

    const delete_desawisata = await wisata_data_delete.destroy();

    if (!delete_desawisata) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: "Destinasi wisata gagal dihapus",
      });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      message: "Destinasi wisata berhasil dihapus",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "internal server error",
    });
  }

};

const add_fasilitas_wisata_byAdmin = async (req, res) => {
  try {

    let id_admin_login;

    const token = req.cookies.tokenadmin;

    if (!token) {
      return res.status(401).json({ message: "Akun Belum Login!", token });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    id_admin_login = decoded.id;


    const user_admin = await tbl_Admin.findOne({
      attributes: ['role'],
      where: {
        id_admin: id_admin_login
      }
    });

    if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola" && user_admin.role !== "user pengelola") {
      return res.status(401).json({ message: "Hak akses ditolak" });
    }

    const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

    const {
      id_wisata,
      valueFasilitas = [],
    } = req.body;

    if (
      !id_wisata ||
      valueFasilitas.length === 0
    ) {
      return res.status(422).json({ status: 'error', message: "Lengkapi data inputan fasilitas wisata" });
    }

    const fasilitas_update = await tbl_fasilitas_wisata.findAndCountAll({
      where: {
        id_wisata: id_wisata
      },
    });

    if (fasilitas_update.count !== 0) {
      for (const fasilitas of fasilitas_update.rows) {
        await fasilitas.destroy();
      }
    }
    
    let add_data = []

    for (let row of valueFasilitas) {
      add_data = await tbl_fasilitas_wisata.create({
        id_wisata: id_wisata,
        value_fasilitas_wisata: row,
        nama_fasilitas_wisata: row === 1 ? "Musholla" : row === 2 ? "Toilet" : row === 3 ? "Penginapan" : row === 4 ? "Area Kuliner" : "Tempat Sampah",
        createdAt: currentDateTime,
        updatedAt: currentDateTime
      });
    }

    if (!add_data) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: "Fasilitas Wisata gagal ditambahkan",
      });
    }

    const wisata_update = await tbl_Wisata.findOne({
      where: {
        id_wisata
      },
    });

    const update_data = await wisata_update.update({
      jumlah_fasilitas: valueFasilitas.length,
      id_admin_author: id_admin_login,
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
      status: "success",
      success: true,
      message: "Fasilitas Wisata berhasil ditambahkan",
      data: update_data
    });

  } catch (error) {
    console.log(error, 'Data Error');
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      data: null
    });
  };
};



module.exports = {
  get_all_wisata,
  get_recomendasi_wisata,
  get_detail_wisata,
  get_all_wisata_byDesawisata,

  //admin
  get_all_wisata_byAdmin,
  get_detail_wisata_byAdmin,
  add_data_wisata_byAdmin,
  put_verifikasi_wisata,
  delete_data_wisata_byAdmin,
  update_data_wisata_byAdmin,
  put_update_maps_wisata,
  add_fasilitas_wisata_byAdmin
};