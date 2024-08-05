'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tbl_data_pengunjung extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  tbl_data_pengunjung.init({
    id_data_pengunjung: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    id_table: {
      type: DataTypes.INTEGER
    },
    id_admin_verifed: {
      type: DataTypes.INTEGER
    },
    nama_table: {
      type: DataTypes.STRING
    },
    tahun_data_pengunjung: {
      type: DataTypes.INTEGER
    },
    bulan_data_pengunjung: {
      type: DataTypes.INTEGER
    },
    jumlah_pengunjung_aplikasi: {
      type: DataTypes.INTEGER
    },
    jumlah_pengunjung_lokal: {
      type: DataTypes.INTEGER
    },
    jumlah_pengunjung_mancanegara: {
      type: DataTypes.INTEGER
    },
    jumlah_pegawai_laki: {
      type: DataTypes.INTEGER
    },
    jumlah_pegawai_perempuan: {
      type: DataTypes.INTEGER
    },
    status_verifikasi: {
      type: DataTypes.ENUM('verified', 'unverified', 'rejected'),
      defaultValue: 'unverified'
    },
  }, {
    sequelize,
    modelName: 'tbl_data_pengunjung',
    tableName: 'tbl_data_pengunjung',
  });
  return tbl_data_pengunjung;
};