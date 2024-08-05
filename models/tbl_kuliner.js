'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tbl_Kuliner extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  tbl_Kuliner.init({
    id_kuliner: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    id_desaWisata: {
      type: DataTypes.INTEGER
    },
    id_admin: {
      type: DataTypes.INTEGER
    },
    id_admin_verifed: {
      type: DataTypes.INTEGER
    },
    id_admin_pengelola: {
      type: DataTypes.INTEGER
    },
    nama_kuliner: {
      type: DataTypes.STRING
    },
    nib_kuliner: {
      type: DataTypes.STRING
    },
    kbli_kuliner: {
      type: DataTypes.STRING
    },
    alamat_kuliner: {
      type: DataTypes.STRING
    },
    npwp_kuliner: {
      type: DataTypes.STRING
    },
    npwp_pemilik_kuliner: {
      type: DataTypes.STRING
    },
    maps_kuliner: {
      type: DataTypes.TEXT
    },
    sampul_kuliner: {
      type: DataTypes.STRING
    },
    ruang_kuliner: {
      type: DataTypes.STRING
    },
    kontak_person_kuliner: {
      type: DataTypes.STRING
    },
    total_pengunjung_kuliner: {
      type: DataTypes.INTEGER
    },
    status_buka: {
      type: DataTypes.ENUM('Buka', 'Tutup'),
    },
    status_kuliner: {
      type: DataTypes.ENUM('Pribadi', 'Bumdes', 'Pemda'),
    },
    status_verifikasi: {
      type: DataTypes.ENUM('verified', 'unverified'),
      defaultValue: 'unverified'
    }, 
    id_admin_author: {
      type: DataTypes.INTEGER
    },
  }, {
    sequelize,
    modelName: 'tbl_Kuliner',
    tableName: 'tbl_Kuliner',
  });
  return tbl_Kuliner;
};