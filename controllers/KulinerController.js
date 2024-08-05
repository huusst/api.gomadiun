const db = require('../models');
const tbl_Kuliner = db.tbl_Kuliner;
const { Op } = require('sequelize');


const get_all_kuliner = async (req, res) => {
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
                  { nama_kuliner: { [Op.like]: `%${keyword}%` } },
              ]
          } : {}
      ]
  };

    const orderClause = [
      ['total_pengunjung_kuliner', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
  ];

    
    const data = await tbl_Kuliner.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      order:orderClause
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
        id: items.id_kuliner,
        nama: items.nama_kuliner,
        alamat: items.alamat_kuliner,
        kategori: "Kuliner",
        status_buka: items.status_buka,
        imageUrl: items.sampul_kuliner,
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

const get_detail_kuliner = async (req, res) => {
  try {
    const { id_kuliner } = req.params;

    if (!id_kuliner) {
      return res.status(400).send({ error: "id_kuliner is required" });
    }

    const data = await tbl_Kuliner.findOne({
      where: {
        id_kuliner,
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
      success: true,
      message: "Sukses mendapatkan data",
      data: [{
        id: data.id_kuliner,
        nama: data.nama_kuliner,
        alamat: data.alamat_kuliner,
        kategori: "Kuliner",
        no_telp: data.kontak_person_kuliner,
        link_iframe: data.maps_kuliner,
        status_buka: data.status_buka,
        imageUrl: data.sampul_kuliner,
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

const get_all_kuliner_ByDesawisata = async (req, res) => {
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
                  { nama_kuliner: { [Op.like]: `%${keyword}%` } },
              ]
          } : {}
      ]
  };

    const orderClause = [
      ['total_pengunjung_kuliner', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']
  ];

    
    const data = await tbl_Kuliner.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      order:orderClause
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
        id: items.id_kuliner,
        nama: items.nama_kuliner,
        alamat: items.alamat_kuliner,
        kategori: "Kuliner",
        status_buka: items.status_buka,
        imageUrl: items.sampul_kuliner,
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

module.exports = {
  get_all_kuliner,
  get_detail_kuliner,
  get_all_kuliner_ByDesawisata
};