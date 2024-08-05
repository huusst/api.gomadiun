'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tbl_Kamar extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      tbl_Kamar.hasMany(models.tbl_Gallery, {
        foreignKey: 'id_table',
        sourceKey: 'id_kamar',
        as: "kamar_gallery_as",
      });
    }
  }
  tbl_Kamar.init({
    id_kamar: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    id_penginapan: {
      type: DataTypes.INTEGER
    },
    nama_kamar: {
      type: DataTypes.STRING
    },
    deskripsi: {
      type: DataTypes.TEXT
    },
    harga: {
      type: DataTypes.INTEGER
    },
    kapasitas: {
      type: DataTypes.INTEGER
    },
    jumlah_kamar: {
      type: DataTypes.INTEGER
    },
    bebas_rokok: {
      type: DataTypes.ENUM('true', 'false'),
    },
    fasilitas_sarapan: {
      type: DataTypes.ENUM('true', 'false'),
    },
  }, {
    sequelize,
    modelName: 'tbl_Kamar',
    tableName: 'tbl_Kamar',
  });
  return tbl_Kamar;
};