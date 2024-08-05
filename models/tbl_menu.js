'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tbl_Produk extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  tbl_Produk.init({
    id_menu: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    id_kuliner: {
      type: DataTypes.INTEGER
    },
    id_kategori_menu: {
      type: DataTypes.INTEGER
    },
    id_admin: {
      type: DataTypes.INTEGER
    },
    nama_menu: {
      type: DataTypes.STRING
    },
    harga_menu: {
      type: DataTypes.INTEGER
    },
    sampul_menu: {
      type: DataTypes.STRING
    },
    status_tersedia: {
      type: DataTypes.ENUM('tersedia', 'habis'),
    },
  }, {
    sequelize,
    modelName: 'tbl_Menu',
    tableName: 'tbl_Menu',
  });
  return tbl_Produk;
};