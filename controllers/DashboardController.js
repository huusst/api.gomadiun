const db = require('../models');
const tbl_DesaWisata = db.tbl_DesaWisata;
const tbl_Wisata = db.tbl_Wisata;
const tbl_announcement = db.tbl_announcement;
const tbl_Admin = db.tbl_Admin;
const jwt = require('jsonwebtoken');
const { Op, fn, col } = require('sequelize');
const multer = require('multer');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = "./uploads/img/banerInfo"; // All image files will be stored in the "uploads/img" directory
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


const get_all_event = async (req, res) => {
    try {
        const {
            order = 'DESC'
        } = req.query;

        const orderClause = [
            ['id_announcements', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
        ];


        const data = await tbl_announcement.findAndCountAll({
            order: orderClause
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Data Tidak Ditemukan",
                data: null,
            });
        }


        const results = await Promise.all(data.rows.map(async (items) => {

            return {
                id: items.id_announcements,
                url_poster: items.url_poster,
                name_poster: items.name_poster,
            };
        }));


        const result = {
            success: true,
            message: "Sukses mendapatkan data",
            data: results,
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

const get_all_event_ByAdmin = async (req, res) => {
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

        const {
            order = 'DESC'
        } = req.query;

        const orderClause = [
            ['id_announcements', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
        ];


        const data = await tbl_announcement.findAndCountAll({
            order: orderClause
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Data Tidak Ditemukan",
                data: null,
            });
        }


        const results = await Promise.all(data.rows.map(async (items) => {

            return {
                id: items.id_announcements,
                judul_event: items.judul_event,
                url_poster: items.url_poster,
                name_poster: items.name_poster,
                desk_event: items.desk_event,
            };
        }));


        const result = {
            success: true,
            message: "Sukses mendapatkan data",
            data: results,
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

const get_detail_event = async (req, res) => {
    try {
        const { id_announcements } = req.params;

        if (!id_announcements) {
            return res.status(400).send({ error: "id_announcements is required" });
        }

        const data = await tbl_announcement.findAndCountAll({
            where: {
                id_announcements: id_announcements
            }
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Data Tidak Ditemukan",
                data: null,
            });
        }

        const results = await Promise.all(data.rows.map(async (items) => {

            return {
                id: items.id_announcements,
                judul_event: items.judul_event,
                url_poster: items.url_poster,
                name_poster: items.name_poster,
                desk_event: items.desk_event,
            };
        }));


        const result = {
            success: true,
            message: "Sukses mendapatkan data",
            data: results,
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

const post_event_ByAdmin = async (req, res) => {
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

            const { judul, deskripsi } = req.body;

            const uploadedFile_url = req.file.filename ? `${req.protocol}://${req.get("host")}/uploads/img/banerInfo/${req.file.filename}` : null;
            const uploadedFile = req.file ? req.file.filename : null;

            const data = await tbl_announcement.create({
                judul_event: judul,
                url_poster: uploadedFile_url,
                name_poster: uploadedFile,
                desk_event: deskripsi,
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            });

            return res.status(200).json({
                status: 'success',
                success: true,
                message: "Event berhasil ditambahkan",
                data: data
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
    });
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
  
      if (user_admin.role !== "admin" && user_admin.role !== "dinas") {
        return res.status(401).json({ message: "Hak akses ditolak" });
      }
  
      const { id_announcements } = req.params;

      if (!id_announcements) {
          return res.status(400).send({ error: "id_announcements is required" });
      }
  
      const desawisata_data_delete = await tbl_announcement.findOne({
        where: {
            id_announcements: id_announcements
        }
      });
  
      if (!desawisata_data_delete) {
        return res.status(422).json({
          status: 'error',
          success: false,
          message: 'Desa Wisata tidak terdaftar'
        });
      }
  
      let url_sampul = desawisata_data_delete.url_poster;
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
          message: "Data event gagal dihapus",
        });
      }
  
      return res.status(200).json({
        status: 'success',
        success: true,
        message: "Data event berhasil dihapus",
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

const get_all_dashboard = async (req, res) => {
    try {

        const token = req.cookies.tokenadmin;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const whereClause = {
            [Op.and]: [
                { status_verifikasi: "verified" },
            ]
        }


        const desawisata = await tbl_DesaWisata.findAndCountAll({
            where: whereClause,
        });

        if (desawisata.count === 0) {
            return res.status(401).json({
                success: false,
                message: "Data Tidak Ditemukan",
                data: null,
            });
        }

        const desawisata_terbanyak = await tbl_DesaWisata.findOne({
            where: whereClause,
            order: [[fn('MAX', col('total_pengunjung')), 'DESC']],
        });

        const wisata = await tbl_Wisata.findAndCountAll({
            where: whereClause,
        });

        if (wisata.count === 0) {
            return res.status(401).json({
                success: false,
                message: "Data Tidak Ditemukan",
                data: null,
            });
        }

        const wisata_terbanyak = await tbl_Wisata.findOne({
            where: whereClause,
            order: [[fn('MAX', col('total_pengunjung_destinasi')), 'DESC']],
        });

        const result = {
            data_desawisata: desawisata.rows.map((items) => ({
                nama_desaWisata: items.nama_desaWisata,
                total_pengunjung: items.total_pengunjung,
            })),
            data_wisata: wisata.rows.map((items) => ({
                nama_destinasi: items.nama_destinasi,
                total_pengunjung_destinasi: items.total_pengunjung_destinasi,
            })),
            data_desawisata_terbanyak: desawisata_terbanyak.total_pengunjung,
            data_wisata_terbanyak: wisata_terbanyak.total_pengunjung_destinasi,

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

module.exports = {
    get_all_event,
    get_all_event_ByAdmin,
    get_detail_event,
    post_event_ByAdmin,
    delete_data_desawisata_byAdmin,
    get_all_dashboard
};