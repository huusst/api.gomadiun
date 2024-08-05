const db = require('../models');
const tbl_penginapan = db.tbl_Penginapan;
const tbl_Gallery = db.tbl_Gallery;
const tbl_fasilitas_utama_penginapan = db.tbl_fasilitas_utama_penginapan;
const tbl_Kamar = db.tbl_Kamar;
const tbl_Paket_homestay = db.tbl_Paket_homestay;
const tbl_fasilitas_paket_homestay = db.tbl_fasilitas_paket_homestay;
const Sequelize = require('sequelize');
const { Op, fn, col } = require('sequelize');



const get_all_penginapan = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      keyword = '',
      filter = {},
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;


    const whereClause = {
      [Op.and]: [
        { status_verifikasi: 'verified' },
        keyword ? {
          [Op.or]: [
            { nama_penginapan: { [Op.like]: `%${keyword}%` } },
          ]
        } : {}
      ]
    };

    if (filter.kelas_penginapan) {
      const filterKelas = Array.isArray(filter.kelas_penginapan)
        ? filter.kelas_penginapan
        : filter.kelas_penginapan.split(",");

      if (filterKelas.length > 0) {
        whereClause[Op.and].push({
          kelas_penginapan: {
            [Sequelize.Op.or]: filterKelas.map((name) => ({
              [Sequelize.Op.like]: `%${name.trim()}%`,
            }))
          }
        });
      } else {
        console.log("Empty filter.kelas_penginapan");
        return res.status(404).json({
          success: false,
          message: "Data Tidak Di Temukan",
        });
      }
    }

    if (filter.kategori_penginapan) {
      const filterkategori = Array.isArray(filter.kategori_penginapan)
        ? filter.kategori_penginapan
        : filter.kategori_penginapan.split(",");

      if (filterkategori.length > 0) {
        whereClause[Op.and].push({
          kategori_penginapan: {
            [Sequelize.Op.or]: filterkategori.map((name) => ({
              [Sequelize.Op.like]: `%${name.trim()}%`,
            }))
          }
        });
      } else {
        console.log("Empty filter.kategori_penginapan");
        return res.status(404).json({
          success: false,
          message: "Data Tidak Di Temukan",
        });
      }
    }

    const orderClause = [
      ['total_pengunjung_penginapan', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
    ];


    const data = await tbl_penginapan.findAndCountAll({
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
        id: items.id_penginapan,
        nama: items.nama_penginapan,
        alamat: items.alamat_penginapan,
        kategori: items.kategori_penginapan,
        kelas: items.kelas_penginapan,
        imageUrl: items.sampul_penginapan,
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

const get_detail_penginapan = async (req, res) => {
  try {
    const { id_penginapan } = req.params;

    if (!id_penginapan) {
      return res.status(400).send({ error: "id_penginapan is required" });
    }

    const data = await tbl_penginapan.findOne({
      where: {
        id_penginapan,
      },
      include: [
        {
          model: tbl_Gallery,
          as: "penginapan_gallery_as",
          attributes: [
            "id_gallery",
            "url"
          ],
          where: {
            name_table: "tbl_penginapan"
          },
          required: false
        },
        {
          model: tbl_fasilitas_utama_penginapan,
          as: "penginapan_fasilitas_utama_as",
          attributes: [
            "id_fasilitas_utama",
            "fasilitas"
          ],
        },
      ],
    });

    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: [{
        id: data.id_penginapan,
        nama: data.nama_penginapan,
        alamat: data.alamat_penginapan,
        kategori: data.kategori_penginapan,
        kelas: data.kelas_penginapan,
        harga_terendah: data.harga_terendah_penginapan,
        imageUrl: data.sampul_penginapan,
        gallery: data.penginapan_gallery_as ? data.penginapan_gallery_as.map((items) => ({
          id: items.id_gallery,
          imageUrl: items.url,
        })) : [],
        fasilitas_utama: data.penginapan_fasilitas_utama_as ? data.penginapan_fasilitas_utama_as.map((items) => ({
          id: items.id_fasilitas_utama,
          fasilitas: items.fasilitas,
        })) : [],
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

const get_all_penginapan_ByDesawisata = async (req, res) => {
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
            { nama_penginapan: { [Op.like]: `%${keyword}%` } },
          ]
        } : {}
      ]
    };

    const orderClause = [
      ['total_pengunjung_penginapan', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
    ];


    const data = await tbl_penginapan.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      order: orderClause
    });

    const totalPages = limit ? Math.ceil(data.count / (limit || 1)) : 1;
    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Tersedia",
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
        id: items.id_penginapan,
        nama: items.nama_penginapan,
        alamat: items.alamat_penginapan,
        kategori: "penginapan",
        harga: items.harga_terendah_penginapan,
        imageUrl: items.sampul_penginapan,
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


//kamar
const get_all_kamar_ByPenginapan = async (req, res) => {
  try {
    const { id_penginapan } = req.params;

    if (!id_penginapan) {
      return res.status(400).send({ error: "id_penginapan is required" });
    }

    const {
      order = 'ASC'
    } = req.query;

    const whereClause = {
      [Op.and]: [
        { id_penginapan },
      ]
    };

    const orderClause = [
      ['harga', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
    ];


    const data = await tbl_Kamar.findAndCountAll({
      where: whereClause,
      order: orderClause,
      include: [
        {
          model: tbl_Gallery,
          as: "kamar_gallery_as",
          attributes: [
            "id_gallery",
            "url"
          ],
          where: {
            name_table: "tbl_Kamar"
          },
          required: false,
          order: [['id_gallery', 'ASC']]
        },
      ]
    });

    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Tersedia",
        data: null,
      });
    }

    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: data.rows.map((items) => ({
        id: items.id_kamar,
        nama_kamar: items.nama_kamar,
        deskripsi: items.deskripsi,
        harga: items.harga,
        kapasitas: items.kapasitas,
        jumlah_kamar: items.jumlah_kamar,
        bebas_rokok: items.bebas_rokok,
        fasilitas_sarapan: items.fasilitas_sarapan,
        imageUrl: items.kamar_gallery_as ? items.kamar_gallery_as.map((items) => ({
          id: items.id_gallery,
          url: items.url,
        })) : [],
      })),

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

//pakethomestay
const get_all_homestay_ByPenginapan = async (req, res) => {
  try {
    const { id_penginapan } = req.params;

    if (!id_penginapan) {
      return res.status(400).send({ error: "id_penginapan is required" });
    }

    const {
      order = 'ASC'
    } = req.query;

    const whereClause = {
      [Op.and]: [
        { id_penginapan },
      ]
    };

    const orderClause = [
      ['harga', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
    ];


    const data = await tbl_Paket_homestay.findAndCountAll({
      where: whereClause,
      order: orderClause,
      include: [
        {
          model: tbl_fasilitas_paket_homestay,
          as: "fasilitas_homestay_as",
          attributes: [
            "id_fasilitas_paket",
            "nama_fasilitas_paket"
          ],
        },
      ]
    });

    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Tersedia",
        data: null,
      });
    }

    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: data.rows.map((items) => ({
        id: items.id_paket_homestay,
        nama_paket: items.nama_paket_homestay,
        deskripsi: items.deskripsi_paket_homestay,
        harga: items.harga,
        imageUrl: items.sampul_paket_homestay,
        fasilitas: items.fasilitas_homestay_as ? items.fasilitas_homestay_as.map((items) => ({
          id: items.id_fasilitas_paket,
          fasilitas: items.nama_fasilitas_paket,
        })) : [],
      })),

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
  get_all_penginapan,
  get_detail_penginapan,
  get_all_penginapan_ByDesawisata,
  get_all_kamar_ByPenginapan,
  get_all_homestay_ByPenginapan
};