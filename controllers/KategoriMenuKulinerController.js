const db = require('../models');
const tbl_Kategori_menu = db.tbl_Kategori_menu;
const { Op } = require('sequelize');



const get_all_kategori_menu_byKuliner = async (req, res) => {
  try {
    const { id_kuliner } = req.params;

    if (!id_kuliner) {
      return res.status(400).send({ error: "id_kuliner is required" });
    }
    
    const data = await tbl_Kategori_menu.findAndCountAll({
      where: { id_kuliner },
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
        id_kategori: items.	id_kategori_menu,
        nama_kategori_menu: items.nama_kategori_menu,
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
  get_all_kategori_menu_byKuliner
};