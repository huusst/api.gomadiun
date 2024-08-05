const db = require('../models');
const tbl_data_pengunjung = db.tbl_data_pengunjung;
const tbl_DesaWisata = db.tbl_DesaWisata;
const tbl_Wisata = db.tbl_Wisata;
const tbl_Admin = db.tbl_Admin;
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const multer = require('multer');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

const monthNames = {
    1: 'Januari',
    2: 'Februari',
    3: 'Maret',
    4: 'April',
    5: 'Mei',
    6: 'Juni',
    7: 'Juli',
    8: 'Agustus',
    9: 'September',
    10: 'Oktober',
    11: 'November',
    12: 'Desember'
};

//admin
const get_all_data_pengunjung_noverified_byAdmin = async (req, res) => {
    try {

        let id_admin;

        const token = req.cookies.tokenadmin;

        if (!token) {
            return res.status(401).json({ message: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_admin = decoded.id;


        const user_admin = await tbl_Admin.findOne({
            attributes: ['role'],
            where: {
                id_admin
            }
        });

        if (!user_admin) {
            return res.status(401).json({ message: "Hak akses ditolakggg" });
        }

        const { id_table } = req.params;

        if (!id_table) {
            return res.status(400).send({ error: "id_table is required" });
        }

        const {
            keywoard = '',
        } = req.query;

        if (!keywoard) {
            return res.status(400).send({ error: "keywoard is required" });
        }

        const whereClause = {
            id_table: id_table,
            nama_table: keywoard,
            [Op.or]: [
                { status_verifikasi: 'unverified' },
                { status_verifikasi: 'rejected' }
            ],
        };


        const orderClause = [
            ['bulan_data_pengunjung', 'ASC']
        ];

        const data = await tbl_data_pengunjung.findAndCountAll({
            where: whereClause,
            order: orderClause,
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Data Tidak Ditemukan",
                data: null,
            });
        }

        const formattedData = data.rows.map(item => ({
            ...item.toJSON(),
            bulan_data_pengunjung: monthNames[item.bulan_data_pengunjung],
            bulan_data_pengunjung_value: item.bulan_data_pengunjung
        }));


        const results = await Promise.all(data.rows.map(async (pengunjung) => {
            let detail_admin_verified = [];

            detail_admin_verified = await tbl_Admin.findOne({
                where: { id_admin: pengunjung.id_admin_verifed },
                attributes: [
                    "id_admin",
                    "nama_admin",
                    "role",
                    "namaLengkap_admin",
                    "sampul_admin"
                ]
            });

            return {
                id_data_pengunjung: pengunjung.id_data_pengunjung,
                detail_admin_verified,
                tahun_data_pengunjung: pengunjung.tahun_data_pengunjung,
                bulan_data_pengunjung: pengunjung.bulan_data_pengunjung,
                jumlah_pengunjung_lokal: pengunjung.jumlah_pengunjung_lokal,
                jumlah_pengunjung_mancanegara: pengunjung.jumlah_pengunjung_mancanegara,
                jumlah_pegawai_laki: pengunjung.jumlah_pegawai_laki,
                jumlah_pegawai_perempuan: pengunjung.jumlah_pegawai_perempuan,
                status_verifikasi: pengunjung.status_verifikasi,
                bulan_data_pengunjung: monthNames[pengunjung.bulan_data_pengunjung],
                bulan_data_pengunjung_value: pengunjung.bulan_data_pengunjung,
            };
        }));


        return res.status(200).json({
            status: 200,
            success: true,
            message: "Data Pengunjung",
            data: results,
        });

    } catch (error) {
        console.log(error, 'Data Error');
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            data: null
        });
    }
};

const get_all_data_pengunjung_byAdmin = async (req, res) => {
    try {

        let id_admin;

        const token = req.cookies.tokenadmin;

        if (!token) {
            return res.status(401).json({ message: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_admin = decoded.id;


        const user_admin = await tbl_Admin.findOne({
            attributes: ['role'],
            where: {
                id_admin
            }
        });

        if (user_admin.role !== "admin" && user_admin.role !== "dinas" && user_admin.role !== "admin pengelola" && user_admin.role !== "user pengelola") {
            return res.status(401).json({ message: "Hak akses ditolakggg" });
        }

        const { id_table } = req.params;

        if (!id_table) {
            return res.status(400).send({ error: "id_table is required" });
        }

        const {
            tahun = '',
            keywoard = '',
        } = req.query;

        if (!keywoard) {
            return res.status(400).send({ error: "keywoard is required" });
        }

        const YearNow = moment().tz("Asia/Jakarta").format("YYYY");

        const whereClause = {
            [Op.and]: [
                { id_table: id_table },
                { nama_table: keywoard },
                { status_verifikasi: 'verified' },
                tahun ? {
                    [Op.or]: [
                        { tahun_data_pengunjung: tahun },
                    ]
                } : {
                    [Op.or]: [
                        { tahun_data_pengunjung: YearNow },
                    ]
                }
            ]
        }


        const orderClause = [
            ['bulan_data_pengunjung', 'ASC']
        ];

        const data = await tbl_data_pengunjung.findAndCountAll({
            where: whereClause,
            order: orderClause,
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Data Tidak Ditemukan",
                data: null,
                seleted_tahun: tahun ? tahun : YearNow,
            });
        }

        const formattedData = data.rows.map(item => ({
            ...item.toJSON(),
            bulan_data_pengunjung: monthNames[item.bulan_data_pengunjung],
            bulan_data_pengunjung_value: item.bulan_data_pengunjung
        }));

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Data Pengunjung",
            data: formattedData,
            seleted_tahun: tahun ? tahun : YearNow,
        });

    } catch (error) {
        console.log(error, 'Data Error');
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            data: null
        });
    }
};

const add_data_data_pengunjung_byAdmin = async (req, res) => {
    try {


        let id_admin_login;

        const token = req.cookies.tokenadmin;

        if (!token) {
            return res.status(401).json({ message: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_admin_login = decoded.id;


        const user_admin = await tbl_Admin.findOne({
            attributes: ['role'],
            where: {
                id_admin: id_admin_login
            }
        });

        if (!user_admin) {
            return res.status(401).json({ message: "Hak akses ditolak" });
        }

        const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

        const {
            keywoard = '',
        } = req.query;

        if (!keywoard) {
            return res.status(422).send({ status: 'error', message: "keywoard is required" });
        }

        const { id_table, tahun_data_pengunjung, bulan_data_pengunjung, jumlah_pengunjung_lokal, jumlah_pengunjung_mancanegara, jumlah_pegawai_laki, jumlah_pegawai_perempuan } = req.body;

        if (!id_table || !tahun_data_pengunjung || !bulan_data_pengunjung || !jumlah_pengunjung_lokal || !jumlah_pengunjung_mancanegara || !jumlah_pegawai_laki || !jumlah_pegawai_perempuan) {
            return res.status(422).json({ status: 'error', message: "Lengkapi data inputan update data pengunjung" });
        }

        let add_data = [];

        if (user_admin.role === "admin" || user_admin.role === "dinas") {

                const data_pengunjung_desawisata = await tbl_data_pengunjung.findAndCountAll({
                    where: {
                        id_table: id_table,
                        nama_table: keywoard,
                        tahun_data_pengunjung: tahun_data_pengunjung,
                        bulan_data_pengunjung: bulan_data_pengunjung,
                        status_verifikasi: 'verified'
                    }
                });

                if (data_pengunjung_desawisata.count !== 0) {
                    return res.status(422).json({
                        status: 'error',
                        success: false,
                        message: "Data hanya dapat ditambahkan setiap bulan per tahun",
                    });
                }

                add_data = await tbl_data_pengunjung.create({
                    id_table: id_table,
                    id_admin_verifed: id_admin_login,
                    nama_table: keywoard,
                    tahun_data_pengunjung: tahun_data_pengunjung,
                    bulan_data_pengunjung: bulan_data_pengunjung,
                    jumlah_pengunjung_lokal: jumlah_pengunjung_lokal,
                    jumlah_pengunjung_aplikasi: 0,
                    jumlah_pengunjung_mancanegara: jumlah_pengunjung_mancanegara,
                    jumlah_pegawai_laki: jumlah_pegawai_laki,
                    jumlah_pegawai_perempuan: jumlah_pegawai_perempuan,
                    status_verifikasi: 'verified',
                    createdAt: currentDateTime,
                    updatedAt: currentDateTime
                });

            if (keywoard === "tbl_desawisata") {

                const data_desawisata = await tbl_DesaWisata.findOne({
                    where: {
                        id_desaWisata: id_table,
                    },
                });

                if (!data_desawisata) {
                    return res.status(422).json({
                        success: false,
                        message: "Data Tidak Ditemukan",
                        data: null,
                    });
                }

                const total_pengunjung_inputan = parseInt(jumlah_pengunjung_lokal) + parseInt(jumlah_pengunjung_mancanegara);
                const total_pengunjung_update = data_desawisata.total_pengunjung + total_pengunjung_inputan;

                await data_desawisata.update({
                    total_pengunjung: total_pengunjung_update,
                    id_admin_author: id_admin_login,
                    updatedAt: currentDateTime
                });

            } else if (keywoard === "tbl_wisata") {

                const data_wisata = await tbl_Wisata.findOne({
                    where: {
                        id_wisata: id_table,
                    },
                });

                if (!data_wisata) {
                    return res.status(422).json({
                        success: false,
                        message: "Data Tidak Ditemukan",
                        data: null,
                    });
                }

                const total_pengunjung_inputan = parseInt(jumlah_pengunjung_lokal) + parseInt(jumlah_pengunjung_mancanegara);
                const total_pengunjung_update = data_wisata.total_pengunjung_destinasi + total_pengunjung_inputan;

                await data_wisata.update({
                    total_pengunjung_destinasi: total_pengunjung_update,
                    id_admin_author: id_admin_login,
                    updatedAt: currentDateTime
                });

            }

        } else {

                add_data = await tbl_data_pengunjung.create({
                    id_table: id_table,
                    nama_table: keywoard,
                    tahun_data_pengunjung: tahun_data_pengunjung,
                    bulan_data_pengunjung: bulan_data_pengunjung,
                    jumlah_pengunjung_lokal: jumlah_pengunjung_lokal,
                    jumlah_pengunjung_aplikasi: 0,
                    jumlah_pengunjung_mancanegara: jumlah_pengunjung_mancanegara,
                    jumlah_pegawai_laki: jumlah_pegawai_laki,
                    jumlah_pegawai_perempuan: jumlah_pegawai_perempuan,
                    status_verifikasi: 'unverified',
                    createdAt: currentDateTime,
                    updatedAt: currentDateTime
                });

        }

        if (!add_data) {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: "Data pengunjung gagal ditambahkan",
            });
        }


        if (user_admin.role === "admin" || user_admin.role === "dinas") {

            return res.status(200).json({
                status: "success",
                success: true,
                message: "Data pengunjung berhasil ditambahkan",
                data: add_data
            });

        } else {

            return res.status(200).json({
                status: "success",
                success: true,
                message: "Data pengunjung berhasil diajukan, tunggu konfirmasi Admin dinas",
                data: add_data
            });
        }

    } catch (error) {
        console.log(error, 'Data Error');
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            data: null
        });
    };
};

const update_data_pengunjung_byAdmin = async (req, res) => {

    try {

        let id_admin_login;

        const token = req.cookies.tokenadmin;

        if (!token) {
            return res.status(401).json({ message: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_admin_login = decoded.id;


        const user_admin = await tbl_Admin.findOne({
            attributes: ['role'],
            where: {
                id_admin: id_admin_login
            }
        });

        if (!user_admin) {
            return res.status(401).json({ message: "Hak akses ditolak" });
        }

        const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");


        const { id_data_pengunjung } = req.params;

        if (!id_data_pengunjung) {
            return res.status(400).send({ error: "id_data_pengunjung is required" });
        }

        const pengunjung_update = await tbl_data_pengunjung.findOne({
            where: {
                id_data_pengunjung
            },
        });

        if (!pengunjung_update) {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: 'Data Pengunjung tidak terdaftar'
            });
        }

        const { tahun_data_pengunjung, bulan_data_pengunjung, jumlah_pengunjung_lokal, jumlah_pengunjung_mancanegara, jumlah_pegawai_laki, jumlah_pegawai_perempuan } = req.body;

        if (!tahun_data_pengunjung || !bulan_data_pengunjung ) {
            return res.status(422).json({ status: 'error', message: "Lengkapi data inputan update data pengunjung" });
        }

        let update_data = [];

        if (user_admin.role === "admin" || user_admin.role === "dinas") {

            if (pengunjung_update.status_verifikasi === "verified") {

                if (pengunjung_update.nama_table === "tbl_desawisata") {

                    const data_desawisata = await tbl_DesaWisata.findOne({
                        where: {
                            id_desaWisata: pengunjung_update.id_table,
                        },
                    });

                    if (!data_desawisata) {
                        return res.status(422).json({
                            success: false,
                            message: "Data Tidak Ditemukan",
                            data: null,
                        });
                    }

                    const total_pengunjung_inputan = parseInt(jumlah_pengunjung_lokal) + parseInt(jumlah_pengunjung_mancanegara);
                    const total_pengunjung_sebelumnya_data_pengunjung = parseInt(pengunjung_update.jumlah_pengunjung_lokal) + parseInt(pengunjung_update.jumlah_pengunjung_mancanegara);
                    const total_pengunjung_sebelumnya_desawisata = data_desawisata.total_pengunjung - total_pengunjung_sebelumnya_data_pengunjung;
                    const total_pengunjung_update = total_pengunjung_sebelumnya_desawisata + total_pengunjung_inputan;

                    await data_desawisata.update({
                        total_pengunjung: total_pengunjung_update,
                        id_admin_author: id_admin_login,
                        updatedAt: currentDateTime
                    });

                } else if (pengunjung_update.nama_table === "tbl_wisata") {

                    const data_wisata = await tbl_Wisata.findOne({
                        where: {
                            id_wisata: pengunjung_update.id_table,
                        },
                    });

                    if (!data_wisata) {
                        return res.status(422).json({
                            success: false,
                            message: "Data Tidak Ditemukan",
                            data: null,
                        });
                    }

                    const total_pengunjung_inputan = parseInt(jumlah_pengunjung_lokal) + parseInt(jumlah_pengunjung_mancanegara);
                    const total_pengunjung_sebelumnya_data_pengunjung = parseInt(pengunjung_update.jumlah_pengunjung_lokal) + parseInt(pengunjung_update.jumlah_pengunjung_mancanegara);
                    const total_pengunjung_sebelumnya_desawisata = data_wisata.total_pengunjung_destinasi - total_pengunjung_sebelumnya_data_pengunjung;
                    const total_pengunjung_update = total_pengunjung_sebelumnya_desawisata + total_pengunjung_inputan;

                    await data_wisata.update({
                        total_pengunjung_destinasi: total_pengunjung_update,
                        id_admin_author: id_admin_login,
                        updatedAt: currentDateTime
                    });

                }
            }

            update_data = await pengunjung_update.update({
                tahun_data_pengunjung: tahun_data_pengunjung,
                bulan_data_pengunjung: bulan_data_pengunjung,
                jumlah_pengunjung_lokal: jumlah_pengunjung_lokal,
                jumlah_pengunjung_mancanegara: jumlah_pengunjung_mancanegara,
                jumlah_pegawai_laki: jumlah_pegawai_laki,
                jumlah_pegawai_perempuan: jumlah_pegawai_perempuan,
                updatedAt: currentDateTime
            });

        } else {

            if (pengunjung_update.status_verifikasi === "verified") {
                return res.status(422).json({ status: 'error', message: "Data pengunjung tidak dapat diubah" });
            }

            update_data = await pengunjung_update.update({
                tahun_data_pengunjung: tahun_data_pengunjung,
                bulan_data_pengunjung: bulan_data_pengunjung,
                jumlah_pengunjung_lokal: jumlah_pengunjung_lokal,
                jumlah_pengunjung_mancanegara: jumlah_pengunjung_mancanegara,
                jumlah_pegawai_laki: jumlah_pegawai_laki,
                jumlah_pegawai_perempuan: jumlah_pegawai_perempuan,
                updatedAt: currentDateTime
            });
        }

        if (!update_data) {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: "Data pengunjung gagal ditambahkan",
            });
        }

        return res.status(200).json({
            status: "success",
            success: true,
            message: "Data pengunjung berhasil diubah",
            data: update_data
        });

    } catch (error) {
        console.log(error, 'Data Error');
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            data: null
        });
    };
};


const put_verifikasi_data_pengunjung = async (req, res) => {
    try {

        let id_admin_login;

        const token = req.cookies.tokenadmin;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_admin_login = decoded.id;

        const user_admin = await tbl_Admin.findOne({
            attributes: ['role'],
            where: {
                id_admin: id_admin_login
            }
        });

        if (user_admin.role !== "admin" && user_admin.role !== "dinas") {
            return res.status(401).json({ message: "Hak akses ditolak" });
        }

        const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

        const { id_data_pengunjung } = req.params;

        if (!id_data_pengunjung) {
            return res.status(422).send({ error: "id_data_pengunjung is required" });
        }

        const { id_admin, status_verifikasi } = req.body;

        if (!id_admin || !status_verifikasi) {
            return res.status(422).json({ status: 'error', message: "Lengkapi data inputan verifikasi desa" });
        }

        const admin_verifikator = await tbl_Admin.findOne({
            where: {
                [Op.and]: [
                    { id_admin: id_admin },
                    { role: "dinas" }
                ]
            }
        });

        if (!admin_verifikator) {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: 'Admin verifikator tidak valid'
            });
        }

        const pengunjung_update = await tbl_data_pengunjung.findOne({
            where: {
                id_data_pengunjung
            },
        });

        if (!pengunjung_update) {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: 'Data Pengunjung tidak terdaftar'
            });
        }

        if (status_verifikasi !== "verified") {

            const update_data = await pengunjung_update.update({
                id_admin_verifed: id_admin,
                status_verifikasi: 'rejected',
                updatedAt: currentDateTime
            });

            if (!update_data) {
                return res.status(422).json({
                    status: 'error',
                    success: false,
                    message: "Gagal memverifikasi data!",
                });
            }

            return res.status(200).json({
                status: 'success',
                message: "Data pengunjung berhasil diverifikasi",
                data: update_data
            });

        }

        const data_pengunjung_desawisata = await tbl_data_pengunjung.findOne({
            where: {
                id_table: pengunjung_update.id_table,
                nama_table: pengunjung_update.nama_table,
                tahun_data_pengunjung: pengunjung_update.tahun_data_pengunjung,
                bulan_data_pengunjung: pengunjung_update.bulan_data_pengunjung,
                status_verifikasi: 'verified'
            }
        });


        if (!data_pengunjung_desawisata) {
            
            let data_desawisata = []; 
            let data_wisata = [];

            if (pengunjung_update.nama_table === "tbl_desawisata") {

                data_desawisata = await tbl_DesaWisata.findOne({
                    where: {
                        id_desaWisata: pengunjung_update.id_table,
                    },
                });

                if (!data_desawisata) {
                    return res.status(422).json({
                        success: false,
                        message: "Data Tidak Ditemukan",
                        data: null,
                    });
                }

            } else if (pengunjung_update.nama_table === "tbl_wisata") {

                data_wisata = await tbl_Wisata.findOne({
                    where: {
                        id_wisata: pengunjung_update.id_table,
                    },
                });

                if (!data_wisata) {
                    return res.status(422).json({
                        success: false,
                        message: "Data Tidak Ditemukan",
                        data: null,
                    });
                }

            }

            const update_data = await pengunjung_update.update({
                id_admin_verifed: id_admin,
                status_verifikasi: status_verifikasi,
                updatedAt: currentDateTime
            });

            if (!update_data) {
                return res.status(422).json({
                    status: 'error',
                    success: false,
                    message: "Gagal memverifikasi data!",
                });
            }

            if (pengunjung_update.nama_table === "tbl_desawisata") {

                const total_pengunjung_inputan = parseInt(pengunjung_update.jumlah_pengunjung_lokal) + parseInt(pengunjung_update.jumlah_pengunjung_mancanegara);
                const total_pengunjung_update = parseInt(data_desawisata.total_pengunjung) + total_pengunjung_inputan;
    
                await data_desawisata.update({
                    total_pengunjung: total_pengunjung_update,
                    id_admin_author: id_admin_login,
                    updatedAt: currentDateTime
                });

            } else if (pengunjung_update.nama_table === "tbl_wisata") {

                const total_pengunjung_inputan = parseInt(pengunjung_update.jumlah_pengunjung_lokal) + parseInt(pengunjung_update.jumlah_pengunjung_mancanegara);
                const total_pengunjung_update = parseInt(data_wisata.total_pengunjung_destinasi) + total_pengunjung_inputan;
    
                await data_wisata.update({
                    total_pengunjung_destinasi: total_pengunjung_update,
                    id_admin_author: id_admin_login,
                    updatedAt: currentDateTime
                });

            }


            return res.status(200).json({
                status: 'success',
                message: "Data pengunjung berhasil diverifikasi",
                data: update_data
            });

        } else {

            let data_desawisata = [];
            let data_wisata = [];

            if (pengunjung_update.nama_table === "tbl_desawisata") {

                data_desawisata = await tbl_DesaWisata.findOne({
                    where: {
                        id_desaWisata: pengunjung_update.id_table,
                    },
                });

                if (!data_desawisata) {
                    return res.status(422).json({
                        success: false,
                        message: "Data Tidak Ditemukan",
                        data: null,
                    });
                }

            } else if (pengunjung_update.nama_table === "tbl_wisata") {

                data_wisata = await tbl_Wisata.findOne({
                    where: {
                        id_wisata: pengunjung_update.id_table,
                    },
                });

                if (!data_wisata) {
                    return res.status(422).json({
                        success: false,
                        message: "Data Tidak Ditemukan",
                        data: null,
                    });
                }

            }

            const jumlah_pengunjung_lokal_update = data_pengunjung_desawisata.jumlah_pengunjung_lokal + pengunjung_update.jumlah_pengunjung_lokal;
            const jumlah_pengunjung_mancanegara_update = data_pengunjung_desawisata.jumlah_pengunjung_mancanegara + pengunjung_update.jumlah_pengunjung_mancanegara;
            const jumlah_pegawai_laki_update = data_pengunjung_desawisata.jumlah_pegawai_laki + pengunjung_update.jumlah_pegawai_laki;
            const jumlah_pegawai_perempuan_update = data_pengunjung_desawisata.jumlah_pegawai_perempuan + pengunjung_update.jumlah_pegawai_perempuan;

            const update_data = await data_pengunjung_desawisata.update({
                id_admin_verifed: id_admin,
                jumlah_pengunjung_lokal: jumlah_pengunjung_lokal_update,
                jumlah_pengunjung_mancanegara: jumlah_pengunjung_mancanegara_update,
                jumlah_pegawai_laki: jumlah_pegawai_laki_update,
                jumlah_pegawai_perempuan: jumlah_pegawai_perempuan_update,
                updatedAt: currentDateTime
            });

            if (!update_data) {
                return res.status(422).json({
                    status: 'error',
                    success: false,
                    message: "Gagal memverifikasi data!",
                });
            }
            
            if (pengunjung_update.nama_table === "tbl_desawisata") {

                const total_pengunjung_inputan = parseInt(pengunjung_update.jumlah_pengunjung_lokal) + parseInt(pengunjung_update.jumlah_pengunjung_mancanegara);
                const total_pengunjung_update = parseInt(data_desawisata.total_pengunjung) + total_pengunjung_inputan;
    
                await data_desawisata.update({
                    total_pengunjung: total_pengunjung_update,
                    id_admin_author: id_admin_login,
                    updatedAt: currentDateTime
                });

            } else if (pengunjung_update.nama_table === "tbl_wisata") {

                const total_pengunjung_inputan = parseInt(pengunjung_update.jumlah_pengunjung_lokal) + parseInt(pengunjung_update.jumlah_pengunjung_mancanegara);
                const total_pengunjung_update = parseInt(data_wisata.total_pengunjung_destinasi) + total_pengunjung_inputan;
    
                await data_wisata.update({
                    total_pengunjung_destinasi: total_pengunjung_update,
                    id_admin_author: id_admin_login,
                    updatedAt: currentDateTime
                });

            }

            await pengunjung_update.destroy();

            return res.status(200).json({
                status: 'success',
                message: "Data pengunjung berhasil diverifikasi",
                data: update_data
            });

        }


    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 'error',
            success: false,
            message: "internal server error",
            data: null,
        });
    }
};

const delete_data_pengunjung_byAdmin = async (req, res) => {
    try {

        let id_admin_login;

        const token = req.cookies.tokenadmin;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_admin_login = decoded.id;

        const user_admin = await tbl_Admin.findOne({
            attributes: ['role'],
            where: {
                id_admin: id_admin_login
            }
        });

        if (!user_admin) {
            return res.status(401).json({ message: "Hak akses ditolak" });
        }

        const { id_data_pengunjung } = req.params;

        if (!id_data_pengunjung) {
            return res.status(422).send({ tatus: 'error', error: "id_data_pengunjung is required" });
        }

        const pengunjung_delete = await tbl_data_pengunjung.findOne({
            where: {
                id_data_pengunjung
            },
        });

        if (!pengunjung_delete) {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: 'Data Pengunjung tidak terdaftar'
            });
        }
        if (pengunjung_delete.status_verifikasi === "verified") {
            return res.status(422).send({ tatus: 'error', error: "Data pengunjung tidak dapat dihapus" });
        }

        const delete_data_pengunjung = await pengunjung_delete.destroy();

        if (!delete_data_pengunjung) {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: "Data pengunjung gagal dihapus",
            });
        }

        return res.status(200).json({
            status: 'success',
            success: true,
            message: "Data pengunjung berhasil dihapus",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "internal server error",
        });
    }

};



module.exports = {
    get_all_data_pengunjung_noverified_byAdmin,
    get_all_data_pengunjung_byAdmin,
    add_data_data_pengunjung_byAdmin,
    put_verifikasi_data_pengunjung,
    delete_data_pengunjung_byAdmin,
    update_data_pengunjung_byAdmin
};