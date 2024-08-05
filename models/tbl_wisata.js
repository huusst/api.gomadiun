'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tbl_Destinasi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      tbl_Destinasi.belongsTo(models.tbl_DesaWisata, {
        foreignKey: 'id_desaWisata',
        targetKey: 'id_desaWisata', 
        as: "wisata_desawisata_as",
      });
    }
  }
  tbl_Destinasi.init({
    id_wisata: {
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
    nama_destinasi: {
      type: DataTypes.STRING
    },
    nib_destinasi: {
      type: DataTypes.STRING
    },
    kbli_destinasi: {
      type: DataTypes.STRING
    },
    alamat_destinasi: {
      type: DataTypes.STRING
    },
    npwp_destinasi: {
      type: DataTypes.STRING
    },
    npwp_pemilik_destinasi: {
      type: DataTypes.STRING
    },
    desk_destinasi: {
      type: DataTypes.TEXT
    },
    maps_destinasi: {
      type: DataTypes.TEXT
    },
    sampul_destinasi: {
      type: DataTypes.STRING
    },
    ruang_destinasi: {
      type: DataTypes.STRING
    },
    harga_tiket: {
      type: DataTypes.INTEGER
    },
    status_jalan: {
      type: DataTypes.ENUM('1', '2', '3'),
    },
    jenis_kendaraan: {
      type: DataTypes.ENUM('1', '2', '3'),
    },
    jumlah_fasilitas: {
      type: DataTypes.INTEGER,
    },
    kontak_person_destinasi: {
      type: DataTypes.STRING
    },
    status_wisata: {
      type: DataTypes.ENUM('Pribadi', 'Bumdes', 'Pemda'),
    },
    status_verifikasi: {
      type: DataTypes.ENUM('verifed', 'unverifed'),
      defaultValue: 'unverifed'
    },
    total_pengunjung_destinasi: {
      type: DataTypes.INTEGER
    }, 
    id_admin_author: {
      type: DataTypes.INTEGER
    },
  }, {
    sequelize,
    modelName: 'tbl_Wisata',
    tableName: 'tbl_Wisata',
  });
  return tbl_Destinasi;
};