const db = require('../models');
const tbl_DesaWisata = db.tbl_DesaWisata;
const tbl_Wisata = db.tbl_Wisata;
const tbl_Admin = db.tbl_Admin;
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const multer = require('multer');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = "./uploads/img/desawisata";
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

//customer
const get_all_desawisata = async (req, res) => {
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
        { status_verifikasi: "verified" },
        keyword ? {
          [Op.or]: [
            { nama_desaWisata: { [Op.like]: `%${keyword}%` } },
            { desk_desaWisata: { [Op.like]: `%${keyword}%` } },
          ]
        } : {}
      ]
    }


    const data = await tbl_DesaWisata.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      include: [
        {
          model: tbl_Wisata,
          as: "desawisata_wisata_as",
          attributes: [
            "id_wisata",
          ],
        },
      ],
    });

    const totalPages = limit ? Math.ceil(data.count / (limit || 1)) : 1;
    if (data.count === 0) {
      return res.status(401).json({
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
    data.rows.sort((a, b) => {
      return b.desawisata_wisata_as.length - a.desawisata_wisata_as.length;
    });

    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: data.rows.map((items) => ({
        id_desaWisata: items.id_desaWisata,
        nama_desaWisata: items.nama_desaWisata,
        desk_desaWisata: items.desk_desaWisata,
        sampul_desaWisata: items.sampul_desaWisata,
        kontak_person_desawisata: items.kontak_person_desawisata,
        data_wisata: {
          jumlah_wisata: items.desawisata_wisata_as.length
        }
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

const get_detail_desawisata = async (req, res) => {
  try {
    const { id_desaWisata } = req.params;

    if (!id_desaWisata) {
      return res.status(400).send({ error: "id_desawisata is required" });
    }

    const data = await tbl_DesaWisata.findOne({
      where: {
        id_desaWisata,
      },
    });

    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: [{
        id_desaWisata: data.id_desaWisata,
        nama_desaWisata: data.nama_desaWisata,
        desk_desaWisata: data.desk_desaWisata,
        sampul_desaWisata: data.sampul_desaWisata,
        kontak_person_desawisata: data.kontak_person_desawisata,
      }],
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
const get_all_desawisata_byAdmin = async (req, res) => {
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

    if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola") {
      return res.status(401).json({ message: "Hak akses ditolak" });
    }

    const {
      keyword = '',
      byAdmin = '',
      order = 'DESC',
    } = req.query;

    const whereClause = {
      [Op.and]: [
        byAdmin ? {
          id_admin: byAdmin
        } : {},
        keyword ? {
          [Op.or]: [
            { nama_desaWisata: { [Op.like]: `%${keyword}%` } },
            { desk_desaWisata: { [Op.like]: `%${keyword}%` } },
          ]
        } : {}
      ]
    }

    const orderClause = [
      ['id_desaWisata', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
    ];

    const data = await tbl_DesaWisata.findAndCountAll({
      where: whereClause,
      order: orderClause,
      include: [
        {
          model: tbl_Wisata,
          as: "desawisata_wisata_as",
          attributes: [
            "id_wisata",
          ],
        },
      ],
    });

    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null,
      });
    }

    const results = await Promise.all(data.rows.map(async (desawisata) => {
      let detail_author = [];
      let detail_admin = [];
      let detail_admin_verified = [];

      detail_author = await tbl_Admin.findOne({
        where: { id_admin: desawisata.id_admin_author },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin = await tbl_Admin.findOne({
        where: { id_admin: desawisata.id_admin },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin_verified = await tbl_Admin.findOne({
        where: { id_admin: desawisata.id_admin_verifed },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      return {
        id_desaWisata: desawisata.id_desaWisata,
        detail_admin,
        detail_admin_verified,
        nama_desaWisata: desawisata.nama_desaWisata,
        desk_desaWisata: desawisata.desk_desaWisata,
        kontak_person_desawisata: desawisata.kontak_person_desawisata,
        sampul_desaWisata: desawisata.sampul_desaWisata,
        status_verifikasi: desawisata.status_verifikasi,
        detail_author,
        updatedAt: desawisata.updatedAt
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

const get_detail_desawisata_byAdmin = async (req, res) => {
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

    if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola") {
      return res.status(401).json({ message: "Hak akses ditolak" });
    }


    const { id_desaWisata } = req.params;

    if (!id_desaWisata) {
      return res.status(400).send({ error: "id_desawisata is required" });
    }

    const data = await tbl_DesaWisata.findAndCountAll({
      where: {
        id_desaWisata,
      },
    });

    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null,
      });
    }

    const results = await Promise.all(data.rows.map(async (desawisata) => {
      let detail_author = [];
      let detail_admin = [];
      let detail_admin_verified = [];

      detail_author = await tbl_Admin.findOne({
        where: { id_admin: desawisata.id_admin_author },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin = await tbl_Admin.findOne({
        where: { id_admin: desawisata.id_admin },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      detail_admin_verified = await tbl_Admin.findOne({
        where: { id_admin: desawisata.id_admin_verifed },
        attributes: [
          "id_admin",
          "nama_admin",
          "role",
          "namaLengkap_admin",
          "sampul_admin"
        ]
      });

      return {
        id_desaWisata: desawisata.id_desaWisata,
        detail_admin,
        detail_admin_verified,
        nama_desaWisata: desawisata.nama_desaWisata,
        desk_desaWisata: desawisata.desk_desaWisata,
        kontak_person_desawisata: desawisata.kontak_person_desawisata,
        sampul_desaWisata: desawisata.sampul_desaWisata,
        status_verifikasi: desawisata.status_verifikasi,
        total_pengunjung: desawisata.total_pengunjung,
        detail_author,
        createdAt: desawisata.createdAt,
        updatedAt: desawisata.updatedAt
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

const add_data_desawisata_byAdmin = async (req, res) => {
  upload.single("image")(req, res, async (err) => {
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

      const { id_admin, nama_desaWisata, desk_desaWisata, no_hp } = req.body;

      let add_data = [];

      if (user_admin.role === "admin" || user_admin.role === "dinas") {

        if (!id_admin || !nama_desaWisata || !desk_desaWisata || !no_hp) {
          return res.status(422).json({ status: 'error', message: "Lengkapi data inputan desa wisata" });
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

        if (user_admin.role === "dinas") {

          const uploadedFile = req.file.filename ? `${req.protocol}://${req.get("host")}/uploads/img/desawisata/${req.file.filename}` : null;

          add_data = await tbl_DesaWisata.create({
            id_admin: id_admin,
            id_admin_author: id_admin_login,
            nama_desaWisata: nama_desaWisata,
            desk_desaWisata: desk_desaWisata,
            sampul_desaWisata: uploadedFile,
            kontak_person_desawisata: no_hp,
            total_pengunjung: 0,
            status_verifikasi: 'unverified',
            createdAt: currentDateTime,
            updatedAt: currentDateTime
          });

        } else {

          const uploadedFile = req.file.filename ? `${req.protocol}://${req.get("host")}/uploads/img/desawisata/${req.file.filename}` : null;

          add_data = await tbl_DesaWisata.create({
            id_admin: id_admin,
            id_admin_author: id_admin_login,
            nama_desaWisata: nama_desaWisata,
            desk_desaWisata: desk_desaWisata,
            sampul_desaWisata: uploadedFile,
            kontak_person_desawisata: no_hp,
            total_pengunjung: 0,
            status_verifikasi: 'unverified',
            createdAt: currentDateTime,
            updatedAt: currentDateTime
          });

        }
      } else {

        if (!nama_desaWisata || !desk_desaWisata || !no_hp) {
          return res.status(422).json({ status: 'error', message: "Lengkapi data inputan" });
        }

        const uploadedFile = `${req.protocol}://${req.get("host")}/uploads/img/desawisata/${req.file.filename}`;

        add_data = await tbl_DesaWisata.create({
          id_admin: id_admin_login,
          id_admin_author: id_admin_login,
          nama_desaWisata: nama_desaWisata,
          desk_desaWisata: desk_desaWisata,
          sampul_desaWisata: uploadedFile,
          kontak_person_desawisata: no_hp,
          total_pengunjung: 0,
          status_verifikasi: 'unverified',
          createdAt: currentDateTime,
          updatedAt: currentDateTime
        });

      }

      if (!add_data) {
        return res.status(422).json({
          status: 'error',
          success: false,
          message: "Desa Wisata gagal ditambahkan",
        });
      }

      return res.status(200).json({
        status: "success",
        success: true,
        message: "Desa Wisata berhasil ditambahkan",
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

const update_data_desawisata_byAdmin = async (req, res) => {
  upload.single("image")(req, res, async (err) => {
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


      const { id_desaWisata } = req.params;

      if (!id_desaWisata) {
        return res.status(400).send({ error: "id_desaWisata is required" });
      }

      const desawisata_update = await tbl_DesaWisata.findOne({
        where: {
          id_desaWisata
        },
      });

      if (!desawisata_update) {
        return res.status(422).json({
          status: 'error',
          success: false,
          message: 'Desa Wisata tidak terdaftar'
        });
      }

      // const { id_admin, nama_desaWisata, desk_desaWisata, no_hp } = req.body;
      const {nama_desaWisata, desk_desaWisata, no_hp } = req.body;

      let update_data = [];

      if (user_admin.role === "admin" || user_admin.role === "dinas") {

        // if (!id_admin || !nama_desaWisata || !desk_desaWisata || !no_hp) {
        //   return res.status(422).json({ status: 'error', message: "Lengkapi data inputan update desa wisata", req_body: req.body });
        // }

        if ( !nama_desaWisata || !desk_desaWisata || !no_hp) {
          return res.status(422).json({ status: 'error', message: "Lengkapi data inputan update desa wisata", req_body: req.body });
        }

        // const cek_admin = await tbl_Admin.findAndCountAll({
        //   where: {
        //     id_admin: id_admin
        //   },
        // });

        // if (cek_admin.count === 0) {
        //   return res.status(422).json({
        //     status: 'error',
        //     success: false,
        //     message: "Admin tidak terdaftar",
        //   });
        // }

        let uploadedFile = desawisata_update.sampul_desaWisata;

        if (req.file) {
          const name_file = uploadedFile.split('/uploads/')[1];
          const oldFilePath = `./uploads/${name_file}`;

          fs.unlink(oldFilePath, (err) => {
            if (err) {
              console.error('Error deleting old file:', err);
            }
          });

          uploadedFile = `${req.protocol}://${req.get("host")}/uploads/img/desawisata/${req.file.filename}`;
        }


        update_data = await desawisata_update.update({
          // id_admin: id_admin,
          id_admin_author: id_admin_login,
          nama_desaWisata: nama_desaWisata,
          desk_desaWisata: desk_desaWisata,
          sampul_desaWisata: uploadedFile,
          kontak_person_desawisata: no_hp,
          updatedAt: currentDateTime
        });

      } else {

        if (!nama_desaWisata || !desk_desaWisata || !no_hp) {
          return res.status(422).json({ status: 'error', message: "Lengkapi data inputan" });
        }

        let uploadedFile = desawisata_update.sampul_desaWisata;

        if (req.file) {
          const name_file = uploadedFile.split('/uploads/')[1];
          const oldFilePath = `./uploads/${name_file}`;

          fs.unlink(oldFilePath, (err) => {
            if (err) {
              console.error('Error deleting old file:', err);
            }
          });

          uploadedFile = `${req.protocol}://${req.get("host")}/uploads/img/desawisata/${req.file.filename}`;
        }

        update_data = await tbl_DesaWisata.update({
          // id_admin: id_admin_login,
          id_admin_author: id_admin_login,
          nama_desaWisata: nama_desaWisata,
          desk_desaWisata: desk_desaWisata,
          sampul_desaWisata: uploadedFile,
          kontak_person_desawisata: no_hp,
          updatedAt: currentDateTime
        });

      }

      if (!update_data) {
        return res.status(422).json({
          status: 'error',
          success: false,
          message: "Desa Wisata gagal diubah",
        });
      }

      return res.status(200).json({
        status: "success",
        success: true,
        message: "Desa Wisata berhasil diubah",
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

const put_verifikasi_desawisata = async (req, res) => {
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

    const { id_desaWisata } = req.params;

    if (!id_desaWisata) {
      return res.status(400).send({ error: "id_admin is required" });
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

    const desawisata_update = await tbl_DesaWisata.findOne({
      where: {
        id_desaWisata
      },
    });

    if (!desawisata_update) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: 'Desa Wisata tidak terdaftar'
      });
    }

    const update_data = await desawisata_update.update({
      id_admin_verifed: id_admin,
      status_verifikasi: status_verifikasi,
      id_admin_author: id_admin_login,
      updatedAt: currentDateTime
    });

    if (!update_data) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: "Gagal memverifikasi data!",
      });
    }

    return res.status(200).json({
      status: 'success',
      message: "Data Desa Wisata berhasil diverifikasi",
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

const delete_data_desawisata_byAdmin = async (req, res) => {
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
      return res.status(401).json({ message: "Hak akses ditolak" });
    }

    const { id_desaWisata } = req.params;

    if (!id_desaWisata) {
      return res.status(400).send({ error: "id_desaWisata is required" });
    }

    const desawisata_data_delete = await tbl_DesaWisata.findOne({
      where: {
        id_desaWisata: id_desaWisata
      },
    });

    if (!desawisata_data_delete) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: 'Desa Wisata tidak terdaftar'
      });
    }

    let url_sampul = desawisata_data_delete.sampul_desaWisata;
    const uploadedFile = url_sampul.split('/uploads/')[1];
    const oldFilePath = `./uploads/${uploadedFile}`;

    fs.unlink(oldFilePath, (err) => {
      if (err) {
        console.error('Error deleting old file:', err);
      } else {
        console.log('File deleted successfully.');
      }
    });

    const delete_desawisata = await desawisata_data_delete.destroy();

    if (!delete_desawisata) {
      return res.status(422).json({
        status: 'error',
        success: false,
        message: "Desa wisata gagal dihapus",
      });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      message: "Desa wisata berhasil dihapus",
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



module.exports = {
  get_all_desawisata,
  get_detail_desawisata,

  //admin
  get_all_desawisata_byAdmin,
  get_detail_desawisata_byAdmin,
  add_data_desawisata_byAdmin,
  put_verifikasi_desawisata,
  delete_data_desawisata_byAdmin,
  update_data_desawisata_byAdmin
};