'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tbl_Paket_homestay extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      tbl_Paket_homestay.hasMany(models.tbl_fasilitas_paket_homestay, {
        foreignKey: 'id_paket_homestay',
        sourceKey: 'id_paket_homestay',
        as: "fasilitas_homestay_as",
      });
    }
  }
  tbl_Paket_homestay.init({
    id_paket_homestay: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    id_penginapan: {
      type: DataTypes.INTEGER
    },
    nama_paket_homestay: {
      type: DataTypes.STRING
    },
    deskripsi_paket_homestay: {
      type: DataTypes.TEXT
    },
    sampul_paket_homestay: {
      type: DataTypes.STRING
    },
    harga: {
      type: DataTypes.INTEGER
    },
  }, {
    sequelize,
    modelName: 'tbl_Paket_homestay',
    tableName: 'tbl_Paket_homestay'
  });
  return tbl_Paket_homestay;
};