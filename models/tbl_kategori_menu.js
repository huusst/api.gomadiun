'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tbl_Kategori extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  tbl_Kategori.init({
    id_kategori_menu: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    id_admin: {
      type: DataTypes.INTEGER
    },
    id_kuliner: {
      type: DataTypes.INTEGER
    },
    nama_kategori_menu: {
      type: DataTypes.STRING
    },
  }, {
    sequelize,
    modelName: 'tbl_Kategori_menu',
    tableName: 'tbl_Kategori_menu',
  });
  return tbl_Kategori;
};