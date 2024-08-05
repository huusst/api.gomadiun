const db = require('../models');
const tbl_Menu = db.tbl_Menu;
const { Op } = require('sequelize');



const get_all_menu_byKuliner = async (req, res) => {
  try {
    const { id_kuliner } = req.params;

    if (!id_kuliner) {
      return res.status(400).send({ error: "id_kuliner is required" });
    }
    const whereClause = {
      [Op.and]: [
        { id_kuliner } ,
        { status_tersedia: 'tersedia' },
      ]
  };

    const data = await tbl_Menu.findAndCountAll({
      where: whereClause,
    });

    if (data.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Data Tidak Ditemukan",
        data: null,
      });
    }
    
    const result = {
      success: true,
      message: "Sukses mendapatkan data",
      data: data.rows.map((items) => ({
        id: items.id_menu,
        id_kategori: items.id_kategori_menu,
        nama: items.nama_menu,
        harga: items.harga_menu,
        img: items.sampul_menu,
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
  get_all_menu_byKuliner
};