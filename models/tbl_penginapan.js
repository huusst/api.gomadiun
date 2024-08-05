'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tbl_Penginapan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      tbl_Penginapan.hasMany(models.tbl_Gallery, {
        foreignKey: 'id_table',
        sourceKey: 'id_penginapan',
        as: "penginapan_gallery_as",
      });
      tbl_Penginapan.hasMany(models.tbl_fasilitas_utama_penginapan, {
        foreignKey: 'id_penginapan',
        sourceKey: 'id_penginapan',
        as: "penginapan_fasilitas_utama_as",
      });
    }
  }
  tbl_Penginapan.init({
    id_penginapan: {
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
    nama_penginapan: {
      type: DataTypes.STRING
    },
    nib_penginapan: {
      type: DataTypes.STRING
    },
    kbli_penginapan: {
      type: DataTypes.STRING
    },
    alamat_penginapan: {
      type: DataTypes.STRING
    },
    npwp_penginapan: {
      type: DataTypes.STRING
    },
    npwp_pemilik_penginapan: {
      type: DataTypes.STRING
    },
    desk_penginapan: {
      type: DataTypes.TEXT
    },
    kelas_penginapan: {
      type: DataTypes.STRING
    },
    harga_terendah_penginapan: {
      type: DataTypes.STRING
    },
    sampul_penginapan: {
      type: DataTypes.STRING
    },
    ruang_penginapan: {
      type: DataTypes.STRING
    },
    kontak_person_penginapan: {
      type: DataTypes.STRING
    },
    total_pengunjung_penginapan: {
      type: DataTypes.INTEGER
    },
    kategori_penginapan: {
      type: DataTypes.ENUM('Hotel', 'Homestay'),
    },
    status_penginapan: {
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
    modelName: 'tbl_Penginapan',
    tableName: 'tbl_Penginapan',
  });
  return tbl_Penginapan;
};