const db = require("../models");
const tbl_detail_pesanan = db.tbl_detail_pesanan;
const tbl_data_pengunjung = db.tbl_data_pengunjung;
const tbl_pesanan = db.tbl_pesanan;
const tbl_Wisata = db.tbl_Wisata;
const tbl_Kuliner = db.tbl_Kuliner;
const tbl_Menu = db.tbl_Menu;
const tbl_pembayaran = db.tbl_pembayaran;
const tbl_wisatawan = db.tbl_Wisatawan;
const Sequelize = require('sequelize');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const crypto = require('crypto');

const get_all_keranjang = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const data = await tbl_pesanan.findAndCountAll({
            where: {
                [Op.and]: [
                    { id_wisatawan: id_wisatawan },
                    { status_pesanan: 'keranjang' },
                ]
            },
            attributes: [
                "id_pesanan",
                "id_pembayaran",
                "id_wisatawan",
                "id_destinasi",
                "nama_destinasi",
                "kode_pesanan",
                "kode_qr",
                "tgl_booking",
                "total_pesanan",
                "status_pesanan",
                "createdAt",
                "updatedAt"
            ]
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Keranjang masih kosong",
                data: null,
            });
        }

        const results = await Promise.all(data.rows.map(async (pesanan) => {
            let detail_destinasi = null;
            let detail_pesanan = [];
            if (pesanan.nama_destinasi === 'tbl_destinasi') {
                detail_destinasi = await tbl_Wisata.findOne({
                    where: { id_wisata: pesanan.id_destinasi },
                    attributes: [
                        "id_wisata",
                        "nama_destinasi"
                    ]
                });

                detail_pesanan = await tbl_detail_pesanan.findAll({
                    where: { id_pesanan: pesanan.id_pesanan },
                    attributes: [
                        "id_detail_pesanan",
                        "id_menu",
                        "nama_menu",
                        "jumlah",
                        "harga_satuan"
                    ],

                    include: [
                        {
                            model: tbl_Wisata,
                            as: "tiket_detail_as",
                            attributes: [
                                "id_wisata",
                                "nama_destinasi",
                                "harga_tiket",
                                "sampul_destinasi"
                            ],
                            required: false,
                        },
                    ]
                });
            } else if (pesanan.nama_destinasi === 'tbl_kuliner') {
                detail_destinasi = await tbl_Kuliner.findOne({
                    where: { id_kuliner: pesanan.id_destinasi },
                    attributes: [
                        "id_kuliner",
                        "nama_kuliner"
                    ]
                });

                detail_pesanan = await tbl_detail_pesanan.findAll({
                    where: { id_pesanan: pesanan.id_pesanan },
                    attributes: [
                        "id_detail_pesanan",
                        "id_menu",
                        "nama_menu",
                        "jumlah",
                        "harga_satuan"
                    ],

                    include: [
                        {
                            model: tbl_Menu,
                            as: "menu_detail_as",
                            attributes: [
                                "id_menu",
                                "nama_menu",
                                "harga_menu",
                                "sampul_menu"
                            ],
                            required: false,
                        },
                    ]
                });
            }

            return {
                id_pesanan: pesanan.id_pesanan,
                id_pembayaran: pesanan.id_pembayaran,
                id_destinasi: pesanan.id_destinasi,
                kode_pesanan: pesanan.kode_pesanan,
                kode_qr: pesanan.kode_qr,
                tgl_booking: pesanan.tgl_booking,
                total_pesanan: pesanan.total_pesanan,
                jenis_destinasi: pesanan.nama_destinasi,
                nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                detail_pesanan: detail_pesanan.map((items) => ({
                    id_detail_pesanan: items.id_detail_pesanan,
                    id_menu: items.id_menu,
                    nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                    jumlah: items.jumlah,
                    harga_satuan: items.harga_satuan,
                    sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                }))
            };
        }));

        const totalSum = await tbl_pesanan.sum('total_pesanan', {
            where: {
                [Op.and]: [
                    { id_wisatawan: id_wisatawan },
                    { status_pesanan: 'keranjang' },
                ]
            }
        });

        const biaya_admin = 5000;

        const result = {
            success: true,
            message: "Sukses mendapatkan data",
            data: [{
                detail_transaksi: [{
                    total_pemesanan: totalSum,
                    biaya_admin: biaya_admin,
                    // total_pembayaran: totalSum + biaya_admin,
                    total_pembayaran: totalSum,
                }],
                list_keranjang: results
            }]

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

const post_newAddTocart_tiket = async (req, res) => {
    const generateRandomCodePemesanan = () => {
        return Math.floor(1000 + Math.random() * 9000);
    };

    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;


        const { id_menu, id_destinasi, jumlah, date } = req.body;

        if (!date) {
            return res.status(422).json({ message: "Pilih tanggal booking", token });
        }


        const whereClause = {
            [Op.and]: [
                { id_destinasi: id_destinasi },
                { id_wisatawan: id_wisatawan },
                { nama_destinasi: 'tbl_destinasi' },
                { status_pesanan: 'keranjang' },
            ]
        };

        const ExistTicket = await tbl_pesanan.findOne({
            where: whereClause
        });

        if (ExistTicket) {

            const ExistDetailPesanan = await tbl_detail_pesanan.findOne({
                where: {
                    id_pesanan: ExistTicket.id_pesanan
                }
            });

            await ExistDetailPesanan.update({
                jumlah: jumlah || ExistDetailPesanan.jumlah,
                updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss") || ExistDetailPesanan.updatedAt,
            });

            const data_menu = await tbl_Wisata.findOne({
                where: {
                    id_wisata: id_menu
                }
            });

            const harga_satuan = data_menu.harga_tiket * jumlah

            await ExistTicket.update({
                total_pesanan: harga_satuan || ExistTicket.total_pesanan,
                updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss") || ExistTicket.updatedAt,
            });


            return res.status(200).json({
                status: 200,
                success: true,
                message: "Pesanan Berhasil Diperbarui",
                data: {
                    data: ExistDetailPesanan,
                },
            });

        } else {

            const generateKodeQR = (kodePesanan, date, idWisatawan) => {
                const formattedDate = `T${new Date(date).getDate()}`;
                const formattedIdWisatawan = `ID${idWisatawan}`;
                return `QR${formattedIdWisatawan[2]}${formattedIdWisatawan.slice(-1)}${kodePesanan}${formattedDate}${formattedIdWisatawan}`;
            };

            const kode_pesanan = `KPT${generateRandomCodePemesanan()}`;
            const kode_qr = generateKodeQR(kode_pesanan, date, id_wisatawan);

            const data = await tbl_pesanan.create({
                id_wisatawan: id_wisatawan,
                id_destinasi: id_destinasi,
                nama_destinasi: 'tbl_destinasi',
                kode_pesanan: kode_pesanan,
                kode_qr: kode_qr,
                tgl_booking: date,
                status_pesanan: 'keranjang',
                createdAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
                updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")
            });

            if (data) {

                const data_menu = await tbl_Wisata.findOne({
                    where: {
                        id_wisata: id_menu
                    }
                });

                const harga_satuan = data_menu.harga_tiket * jumlah

                const add_menu = await tbl_detail_pesanan.create({
                    id_pesanan: data.id_pesanan,
                    id_menu: id_menu,
                    nama_menu: 'tbl_destinasi',
                    jumlah: jumlah,
                    harga_satuan: data_menu.harga_tiket,
                    createdAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
                    updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")
                });

                if (add_menu) {
                    await data.update({
                        total_pesanan: harga_satuan || data.total_pesanan,
                        updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss") || data.updatedAt,
                    });

                    return res.status(200).json({
                        status: 200,
                        success: true,
                        message: "Pesanan Berhasil Ditambahkan",
                        data: {
                            data: [data, add_menu]
                        },
                    });
                }

            }
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "internal server error",
            data: null,
            error: "Internal Server Error",
        });
    }
};

const post_newAddTocart_menu = async (req, res) => {
    const generateRandomCodePemesanan = () => {
        return Math.floor(1000 + Math.random() * 9000);
    };

    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;


        const { id_menu, id_destinasi, jumlah, date } = req.body;

        if (!date) {
            return res.status(422).json({ message: "Pilih tanggal booking", token });
        }

        const whereClause = {
            [Op.and]: [
                { id_destinasi: id_destinasi },
                { id_wisatawan: id_wisatawan },
                { nama_destinasi: 'tbl_kuliner' },
                { status_pesanan: 'keranjang' },
            ]
        };

        const ExistTicket = await tbl_pesanan.findOne({
            where: whereClause
        });

        if (ExistTicket) {

            const ExistDetailPesanan = await tbl_detail_pesanan.findOne({
                where: {
                    [Op.and]: [
                        { id_pesanan: ExistTicket.id_pesanan },
                        { id_menu: id_menu },
                        { nama_menu: 'tbl_menu' },
                    ]
                }
            });

            if (ExistDetailPesanan) {

                const data_menu = await tbl_Menu.findOne({
                    where: {
                        id_menu: id_menu
                    }
                });

                const harga_satuan = data_menu.harga_menu * jumlah;
                const harga_satuan_sebelumnya = data_menu.harga_menu * ExistDetailPesanan.jumlah;
                const total_harga_sebelumnya = ExistTicket.total_pesanan;
                const hitung = total_harga_sebelumnya - harga_satuan_sebelumnya;
                const update_total_harga_sekarang = hitung + harga_satuan;


                await ExistDetailPesanan.update({
                    jumlah: jumlah || ExistDetailPesanan.jumlah,
                    updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss") || ExistDetailPesanan.updatedAt,
                });

                await ExistTicket.update({
                    total_pesanan: update_total_harga_sekarang || ExistTicket.total_pesanan,
                    updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss") || ExistTicket.updatedAt,
                });


                return res.status(200).json({
                    status: 200,
                    success: true,
                    message: "Pesanan Berhasil Diperbarui",
                    data: {
                        data: ExistDetailPesanan,
                    },
                });

            } else {

                const data_menu = await tbl_Menu.findOne({
                    where: {
                        id_menu: id_menu
                    }
                });

                const add_menu = await tbl_detail_pesanan.create({
                    id_pesanan: ExistTicket.id_pesanan,
                    id_menu: id_menu,
                    nama_menu: 'tbl_menu',
                    jumlah: jumlah,
                    harga_satuan: data_menu.harga_menu,
                    createdAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
                    updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")
                });

                if (add_menu) {

                    const harga_satuan = data_menu.harga_menu * jumlah;
                    const total_harga_sebelumnya = ExistTicket.total_pesanan;
                    const update_total_harga_sekarang = total_harga_sebelumnya + harga_satuan;

                    await ExistTicket.update({
                        total_pesanan: update_total_harga_sekarang || ExistTicket.total_pesanan,
                    });

                    return res.status(200).json({
                        status: 200,
                        success: true,
                        message: "Pesanan Berhasil Ditambahkan",
                        data: {
                            data: [ExistTicket, add_menu]
                        },
                    });
                }
            }

        } else {

            const generateKodeQR = (kodePesanan, date, idWisatawan) => {
                const formattedDate = `T${new Date(date).getDate()}`;
                const formattedIdWisatawan = `ID${idWisatawan}`;
                return `QR${formattedIdWisatawan[2]}${formattedIdWisatawan.slice(-1)}${kodePesanan}${formattedDate}${formattedIdWisatawan}`;
            };

            const kode_pesanan = `KPM${generateRandomCodePemesanan()}`;
            const kode_qr = generateKodeQR(kode_pesanan, date, id_wisatawan);

            const data = await tbl_pesanan.create({
                id_wisatawan: id_wisatawan,
                id_destinasi: id_destinasi,
                nama_destinasi: 'tbl_kuliner',
                kode_pesanan: kode_pesanan,
                kode_qr: kode_qr,
                tgl_booking: date,
                status_pesanan: 'keranjang',
                createdAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
                updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")
            });

            if (data) {

                const data_menu = await tbl_Menu.findOne({
                    where: {
                        id_menu: id_menu
                    }
                });

                const harga_satuan = data_menu.harga_menu * jumlah

                const add_menu = await tbl_detail_pesanan.create({
                    id_pesanan: data.id_pesanan,
                    id_menu: id_menu,
                    nama_menu: 'tbl_menu',
                    jumlah: jumlah,
                    harga_satuan: data_menu.harga_menu,
                    createdAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
                    updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")
                });

                if (add_menu) {
                    await data.update({
                        total_pesanan: harga_satuan || data.total_pesanan,
                    });

                    return res.status(200).json({
                        status: 200,
                        success: true,
                        message: "Pesanan Berhasil Ditambahkan",
                        data: {
                            data: [data, add_menu]
                        },
                    });
                }

            }
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "internal server error",
            data: null,
            error: "Internal Server Error",
        });
    }
};

const remove_cart = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;


        const { id_detail_pesanan } = req.params;


        if (!id_detail_pesanan) {
            return res.status(400).send({ error: "id_detail_pesanan is required" });
        }

        const ExistMenu = await tbl_detail_pesanan.findOne({
            where:
                { id_detail_pesanan },
        });

        if (!ExistMenu) {
            return res.status(422).json({
                success: false,
                message: 'Cart item not found'
            });
        }


        if (ExistMenu.nama_menu === "tbl_destinasi") {

            const delete_pesanan = await tbl_pesanan.destroy({
                where: { id_pesanan: ExistMenu.id_pesanan }
            });

            if (delete_pesanan) {

                const delete_menu = await tbl_detail_pesanan.destroy({
                    where: { id_detail_pesanan }
                });

                if (delete_menu) {
                    return res.status(200).json({
                        status: 200,
                        success: true,
                        message: "Pesanan Berhasil Dihapus",
                    });
                }
            }

        } else if (ExistMenu.nama_menu === "tbl_menu") {

            const cekmenu = await tbl_detail_pesanan.findAndCountAll({
                where: { id_pesanan: ExistMenu.id_pesanan }
            });

            if (cekmenu.count === 1) {

                const check_pesanan = await tbl_pesanan.findOne({
                    where: { id_pesanan: ExistMenu.id_pesanan }
                });

                if (check_pesanan) {

                    const delete_pesanan = await tbl_pesanan.destroy({
                        where: { id_pesanan: check_pesanan.id_pesanan }
                    });

                    if (delete_pesanan) {

                        const delete_menu = await tbl_detail_pesanan.destroy({
                            where: { id_detail_pesanan }
                        });

                        if (delete_menu) {
                            return res.status(200).json({
                                status: 200,
                                success: true,
                                message: "Pesanan Berhasil Dihapus",
                            });
                        }
                    }
                } else {
                    return res.status(422).json({
                        success: false,
                        message: 'Pesanan not found'
                    });
                }

            } else {

                const data_pesanan = await tbl_pesanan.findOne({
                    where: { id_pesanan: ExistMenu.id_pesanan }
                });

                const harga_menu = ExistMenu.harga_satuan * ExistMenu.jumlah;
                const total_harga_sebelumnya = data_pesanan.total_pesanan;
                const update_total_harga_sekarang = total_harga_sebelumnya - harga_menu;

                await data_pesanan.update({
                    total_pesanan: update_total_harga_sekarang || data_pesanan.total_pesanan,
                });

                const delete_menu = await tbl_detail_pesanan.destroy({
                    where: { id_detail_pesanan }
                });

                if (delete_menu) {
                    return res.status(200).json({
                        status: 200,
                        success: true,
                        message: "Pesanan Berhasil Dihapus",
                    });
                }
            }
        }



    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "internal server error",
            data: null,
            error: "Internal Server Error",
        });
    }
};

const CheckExistKeranjangPesanan = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const {
            filter = {},
        } = req.query;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const whereClause = {
            [Op.and]: [
                { id_wisatawan: id_wisatawan },
                { status_pesanan: 'keranjang' },
            ]
        };

        const whereClausemenu = {
            [Op.and]: [
            ]
        };

        if (filter.id_destinasi) {
            const filterId = Array.isArray(filter.id_destinasi)
                ? filter.id_destinasi
                : filter.id_destinasi.split(",");

            if (filterId.length > 0) {
                whereClause[Op.and].push({
                    id_destinasi: {
                        [Sequelize.Op.or]: filterId.map((name) => ({
                            [Sequelize.Op.like]: `%${name.trim()}%`,
                        }))
                    }
                });
            } else {
                console.log("Empty filter.id_destinasi");
                return res.status(404).json({
                    success: false,
                    message: "Data Tidak Di Temukan",
                });
            }
        }

        if (filter.nama_destinasi) {
            const filterNama = Array.isArray(filter.nama_destinasi)
                ? filter.nama_destinasi
                : filter.nama_destinasi.split(",");

            if (filterNama.length > 0) {
                whereClause[Op.and].push({
                    nama_destinasi: {
                        [Sequelize.Op.or]: filterNama.map((name) => ({
                            [Sequelize.Op.like]: `%${name.trim()}%`,
                        }))
                    }
                });
            } else {
                console.log("Empty filter.nama_destinasi");
                return res.status(404).json({
                    success: false,
                    message: "Data Tidak Di Temukan",
                });
            }
        }

        if (filter.id_menu) {
            const filterIdMenu = Array.isArray(filter.id_menu)
                ? filter.id_menu
                : filter.id_menu.split(",");

            if (filterIdMenu.length > 0) {
                whereClausemenu[Op.and].push({
                    id_menu: {
                        [Sequelize.Op.or]: filterIdMenu.map((name) => ({
                            [Sequelize.Op.like]: `%${name.trim()}%`,
                        }))
                    }
                });
            } else {
                console.log("Empty filter.id_menu");
                return res.status(404).json({
                    success: false,
                    message: "Data Tidak Di Temukan",
                });
            }
        }

        const data = await tbl_pesanan.findAndCountAll({
            where: whereClause,
            attributes: [
                "id_pesanan",
                "tgl_booking",
            ],
            include: [
                {
                    model: tbl_detail_pesanan,
                    as: "pesanan_detail_as",
                    attributes: [
                        "id_detail_pesanan",
                        "id_menu",
                        "nama_menu",
                        "jumlah"
                    ],
                    where: whereClausemenu,
                    required: false
                },
            ],
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Keranjang masih kosong",
                data: null,
            });
        }
        const result = {
            success: true,
            message: "Sukses mendapatkan data",
            data: data.rows.map((pesanan) => ({
                id_pesanan: pesanan.id_pesanan,
                tgl_booking: pesanan.tgl_booking.toISOString().split('T')[0],
                detail_pesanan: pesanan.pesanan_detail_as.map((pesanan) => ({
                    id_detail_pesanan: pesanan.id_detail_pesanan,
                    id_menu: pesanan.id_menu,
                    nama_menu: pesanan.nama_menu,
                    jumlah: pesanan.jumlah,
                })),
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

const AddPesanan = async (req, res) => {
    const generateRandomCode = () => {
        return Math.floor(1000 + Math.random() * 900000000);
    };

    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const kode_pembayaran = `KPON-${generateRandomCode()}`;

        const { dataId, dataTotalPembayaran } = req.body;

        if (!dataId) {
            return res.status(422).json({ message: "Data id tidak tersedia" });
        }

        if (!dataTotalPembayaran) {
            return res.status(422).json({ message: "Data Total tidak tersedia" });
        }

        const user_wisatawan = await tbl_wisatawan.findOne({
            where: {
                id_wisatawan: id_wisatawan
            }
        });


        const data_pesanan = await tbl_pesanan.findAndCountAll({
            where: {
                [Op.and]: [
                    { status_pesanan: 'keranjang' },
                    { id_pesanan: { [Op.in]: dataId } }
                ]
            }
        });

        const results = await Promise.all(data_pesanan.rows.map(async (pesanan) => {
            let detail_pesanan = [];
            if (pesanan.nama_destinasi === 'tbl_destinasi') {

                detail_pesanan = await tbl_detail_pesanan.findAll({
                    where: { id_pesanan: pesanan.id_pesanan },
                    attributes: [
                        "id_detail_pesanan",
                        "id_menu",
                        "nama_menu",
                        "jumlah",
                        "harga_satuan"
                    ],

                    include: [
                        {
                            model: tbl_Wisata,
                            as: "tiket_detail_as",
                            attributes: [
                                "id_wisata",
                                "nama_destinasi",
                                "harga_tiket",
                                "sampul_destinasi"
                            ],
                            required: false,
                        },
                    ]
                });
            } else if (pesanan.nama_destinasi === 'tbl_kuliner') {

                detail_pesanan = await tbl_detail_pesanan.findAll({
                    where: { id_pesanan: pesanan.id_pesanan },
                    attributes: [
                        "id_detail_pesanan",
                        "id_menu",
                        "nama_menu",
                        "jumlah",
                        "harga_satuan"
                    ],

                    include: [
                        {
                            model: tbl_Menu,
                            as: "menu_detail_as",
                            attributes: [
                                "id_menu",
                                "nama_menu",
                                "harga_menu",
                                "sampul_menu"
                            ],
                            required: false,
                        },
                    ]
                });
            }

            return detail_pesanan.map((items) => ({
                id: items.id_menu,
                price: items.harga_satuan,
                quantity: items.jumlah,
                name: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
            }));
        }));

        const authstring = btoa(`${process.env.MIDTRANS_SERVER_KEY}:`)

        const payload = {
            transaction_details: {
                order_id: kode_pembayaran,
                gross_amount: dataTotalPembayaran
            },
            item_details: results.flat(),
            customer_details: {
                first_name: user_wisatawan.name,
                email: user_wisatawan.email,
                phone: user_wisatawan.no_hp
            },
            callbacks: {
                finish: `${process.env.FRONTEND_APP_URL}/pesananku`,
                error: `${process.env.FRONTEND_APP_URL}/pesananku`,
                pending: `${process.env.FRONTEND_APP_URL}/pesananku`,
            }
        };


        const post_midtrans = await fetch(`${process.env.MIDTRANS_APP_URL}/snap/v1/transactions`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authstring}`
            },

            body: JSON.stringify(payload)
        })

        const data_post_midtrans = await post_midtrans.json()

        if (post_midtrans.status !== 201) {
            res.status(500).json({ message: 'Terjadi kesalahan' });
        }

        const pembayaranBaru = await tbl_pembayaran.create({
            id_wisatawan: id_wisatawan,
            kode_pembayaran: kode_pembayaran,
            status_pembayaran: 'belum_bayar',
            total_pembayaran: dataTotalPembayaran,
            data_pembayaran_snap_token: data_post_midtrans.token,
            data_pembayaran_snap_redirect_url: data_post_midtrans.redirect_url,
            createdAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
            updatedAt: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")
        });

        if (!pembayaranBaru) {
            return res.status(422).json({ message: "Pesanan gagal dibuat" });
        }

        await tbl_pesanan.update(
            { status_pesanan: 'proses', id_pembayaran: pembayaranBaru.id_pembayaran },
            { where: { id_pesanan: dataId } }
        );

        res.status(200).json({
            message: 'Pesanan berhasil dibuat',
            pembayaran: pembayaranBaru,
        });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const Get_Pesanan_belumBayar = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const data = await tbl_pembayaran.findAndCountAll({
            where: {
                [Op.and]: [
                    { id_wisatawan: id_wisatawan },
                    { status_pembayaran: 'belum_bayar' },
                ]
            },
            include: [
                {
                    model: tbl_wisatawan,
                    as: "wisatawan_detail_as",
                },
            ],
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Belum ada pesanan",
                data: null,
            });
        }

        const get_pesanan = await Promise.all(data.rows.map(async (pesanan) => {

            const data_pesanan = await tbl_pesanan.findAndCountAll({
                where: {
                    [Op.and]: [
                        { id_wisatawan: id_wisatawan },
                        { id_pembayaran: pesanan.id_pembayaran },
                        { status_pesanan: 'proses' },
                    ]
                },
                attributes: [
                    "id_pesanan",
                    "id_pembayaran",
                    "id_wisatawan",
                    "id_destinasi",
                    "nama_destinasi",
                    "kode_pesanan",
                    "kode_qr",
                    "tgl_booking",
                    "total_pesanan",
                    "status_pesanan",
                    "createdAt",
                    "updatedAt"
                ]
            });

            const results = await Promise.all(data_pesanan.rows.map(async (pesanan) => {
                let detail_destinasi = [];
                let detail_pesanan = [];
                if (pesanan.nama_destinasi === 'tbl_destinasi') {
                    detail_destinasi = await tbl_Wisata.findOne({
                        where: { id_wisata: pesanan.id_destinasi },
                        attributes: [
                            "id_wisata",
                            "nama_destinasi"
                        ]
                    });

                    detail_pesanan = await tbl_detail_pesanan.findAll({
                        where: { id_pesanan: pesanan.id_pesanan },
                        attributes: [
                            "id_detail_pesanan",
                            "id_menu",
                            "nama_menu",
                            "jumlah",
                            "harga_satuan"
                        ],

                        include: [
                            {
                                model: tbl_Wisata,
                                as: "tiket_detail_as",
                                attributes: [
                                    "id_wisata",
                                    "nama_destinasi",
                                    "harga_tiket",
                                    "sampul_destinasi"
                                ],
                                required: false,
                            },
                        ]
                    });
                } else if (pesanan.nama_destinasi === 'tbl_kuliner') {
                    detail_destinasi = await tbl_Kuliner.findOne({
                        where: { id_kuliner: pesanan.id_destinasi },
                        attributes: [
                            "id_kuliner",
                            "nama_kuliner"
                        ]
                    });

                    detail_pesanan = await tbl_detail_pesanan.findAll({
                        where: { id_pesanan: pesanan.id_pesanan },
                        attributes: [
                            "id_detail_pesanan",
                            "id_menu",
                            "nama_menu",
                            "jumlah",
                            "harga_satuan"
                        ],

                        include: [
                            {
                                model: tbl_Menu,
                                as: "menu_detail_as",
                                attributes: [
                                    "id_menu",
                                    "nama_menu",
                                    "harga_menu",
                                    "sampul_menu"
                                ],
                                required: false,
                            },
                        ]
                    });
                }

                // return detail_pesanan.map((items) => ({
                //         nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                //         id_detail_pesanan: items.id_detail_pesanan,
                //         id_menu: items.id_menu,
                //         nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                //         jumlah: items.jumlah,
                //         harga_satuan: items.harga_satuan,
                //         harga_total: items.harga_satuan * items.jumlah,
                //         sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                //     }));

                return {
                    id_pesanan: pesanan.id_pesanan,
                    id_pembayaran: pesanan.id_pembayaran,
                    id_destinasi: pesanan.id_destinasi,
                    kode_pesanan: pesanan.kode_pesanan,
                    kode_qr: pesanan.kode_qr,
                    tgl_booking: pesanan.tgl_booking,
                    total_pesanan: pesanan.total_pesanan,
                    jenis_destinasi: pesanan.nama_destinasi,
                    tgl_pesanan: pesanan.createdAt,
                    nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                    detail_pesanan: detail_pesanan.map((items) => ({
                        id_detail_pesanan: items.id_detail_pesanan,
                        id_menu: items.id_menu,
                        nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                        jumlah: items.jumlah,
                        harga_satuan: items.harga_satuan,
                        sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                    }))
                };
            }));
            pesanan.dataValues.pesanan = results.flat();
            return pesanan;
        }));

        res.status(200).json({
            message: 'Pesanan berhasil didapat',
            data: get_pesanan,
        });

    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const Get_Pesanan_selesai = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const data = await tbl_pembayaran.findAndCountAll({
            where: {
                [Op.and]: [
                    { id_wisatawan: id_wisatawan },
                    { status_pembayaran: 'selesai' },
                ]
            },
            include: [
                {
                    model: tbl_wisatawan,
                    as: "wisatawan_detail_as",
                },
            ],
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Belum ada pesanan selesai",
                data: null,
            });
        }
        const get_pesanan = await Promise.all(data.rows.map(async (pesanan) => {

            const data_pesanan = await tbl_pesanan.findAndCountAll({
                where: {
                    [Op.and]: [
                        { id_wisatawan: id_wisatawan },
                        { id_pembayaran: pesanan.id_pembayaran },
                        { status_pesanan: 'selesai' },
                    ]
                },
                attributes: [
                    "id_pesanan",
                    "id_pembayaran",
                    "id_wisatawan",
                    "id_destinasi",
                    "nama_destinasi",
                    "kode_pesanan",
                    "kode_qr",
                    "tgl_booking",
                    "total_pesanan",
                    "status_pesanan",
                    "createdAt",
                    "updatedAt"
                ]
            });

            const results = await Promise.all(data_pesanan.rows.map(async (pesanan) => {
                let detail_destinasi = [];
                let detail_pesanan = [];
                if (pesanan.nama_destinasi === 'tbl_destinasi') {
                    detail_destinasi = await tbl_Wisata.findOne({
                        where: { id_wisata: pesanan.id_destinasi },
                        attributes: [
                            "id_wisata",
                            "nama_destinasi",
                        ]
                    });

                    detail_pesanan = await tbl_detail_pesanan.findAll({
                        where: { id_pesanan: pesanan.id_pesanan },
                        attributes: [
                            "id_detail_pesanan",
                            "id_menu",
                            "nama_menu",
                            "jumlah",
                            "harga_satuan"
                        ],

                        include: [
                            {
                                model: tbl_Wisata,
                                as: "tiket_detail_as",
                                attributes: [
                                    "id_wisata",
                                    "nama_destinasi",
                                    "harga_tiket",
                                    "sampul_destinasi"
                                ],
                                required: false,
                            },
                        ]
                    });
                } else if (pesanan.nama_destinasi === 'tbl_kuliner') {
                    detail_destinasi = await tbl_Kuliner.findOne({
                        where: { id_kuliner: pesanan.id_destinasi },
                        attributes: [
                            "id_kuliner",
                            "nama_kuliner",
                        ]
                    });

                    detail_pesanan = await tbl_detail_pesanan.findAll({
                        where: { id_pesanan: pesanan.id_pesanan },
                        attributes: [
                            "id_detail_pesanan",
                            "id_menu",
                            "nama_menu",
                            "jumlah",
                            "harga_satuan"
                        ],

                        include: [
                            {
                                model: tbl_Menu,
                                as: "menu_detail_as",
                                attributes: [
                                    "id_menu",
                                    "nama_menu",
                                    "harga_menu",
                                    "sampul_menu"
                                ],
                                required: false,
                            },
                        ]
                    });
                }

                // return detail_pesanan.map((items) => ({
                //         nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                //         id_detail_pesanan: items.id_detail_pesanan,
                //         id_menu: items.id_menu,
                //         nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                //         jumlah: items.jumlah,
                //         harga_satuan: items.harga_satuan,
                //         harga_total: items.harga_satuan * items.jumlah,
                //         sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                //     }));
                const formattedTglBooking = pesanan.tgl_booking.toISOString().split('T')[0];

                return {
                    id_pesanan: pesanan.id_pesanan,
                    id_pembayaran: pesanan.id_pembayaran,
                    id_destinasi: pesanan.id_destinasi,
                    kode_pesanan: pesanan.kode_pesanan,
                    kode_qr: pesanan.kode_qr,
                    tgl_booking: pesanan.tgl_booking,
                    total_pesanan: pesanan.total_pesanan,
                    jenis_destinasi: pesanan.nama_destinasi,
                    tgl_pesanan: pesanan.createdAt,
                    tgl_pesanan_selesai: pesanan.updatedAt,
                    nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                    detail_pesanan: detail_pesanan.map((items) => ({
                        id_detail_pesanan: items.id_detail_pesanan,
                        id_menu: items.id_menu,
                        nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                        jumlah: items.jumlah,
                        harga_satuan: items.harga_satuan,
                        sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                    }))
                };
            }));
            pesanan.dataValues.pesanan = results.flat();
            return pesanan;
        }));


        res.status(200).json({
            message: 'Pesanan berhasil didapat',
            data: get_pesanan,
        });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const Get_Pesanan_Eticket = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const data = await tbl_pembayaran.findAndCountAll({
            where: {
                [Op.and]: [
                    { id_wisatawan: id_wisatawan },
                    { status_pembayaran: 'bayar' },
                ]
            },
            include: [
                {
                    model: tbl_wisatawan,
                    as: "wisatawan_detail_as",
                },
            ],
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "E-ticket belum tersedia",
                data: null,
            });
        }
        const get_pesanan = await Promise.all(data.rows.map(async (pesanan) => {

            const data_pesanan = await tbl_pesanan.findAndCountAll({
                where: {
                    [Op.and]: [
                        { id_wisatawan: id_wisatawan },
                        { id_pembayaran: pesanan.id_pembayaran },
                        { status_pesanan: 'proses' },
                    ]
                },
                attributes: [
                    "id_pesanan",
                    "id_pembayaran",
                    "id_wisatawan",
                    "id_destinasi",
                    "nama_destinasi",
                    "kode_pesanan",
                    "kode_qr",
                    "tgl_booking",
                    "total_pesanan",
                    "status_pesanan",
                    "createdAt",
                    "updatedAt"
                ]
            });

            const results = await Promise.all(data_pesanan.rows.map(async (pesanan) => {
                let detail_destinasi = [];
                let detail_pesanan = [];
                if (pesanan.nama_destinasi === 'tbl_destinasi') {
                    detail_destinasi = await tbl_Wisata.findOne({
                        where: { id_wisata: pesanan.id_destinasi },
                        attributes: [
                            "id_wisata",
                            "nama_destinasi",
                        ]
                    });

                    detail_pesanan = await tbl_detail_pesanan.findAll({
                        where: { id_pesanan: pesanan.id_pesanan },
                        attributes: [
                            "id_detail_pesanan",
                            "id_menu",
                            "nama_menu",
                            "jumlah",
                            "harga_satuan"
                        ],

                        include: [
                            {
                                model: tbl_Wisata,
                                as: "tiket_detail_as",
                                attributes: [
                                    "id_wisata",
                                    "nama_destinasi",
                                    "harga_tiket",
                                    "sampul_destinasi"
                                ],
                                required: false,
                            },
                        ]
                    });
                } else if (pesanan.nama_destinasi === 'tbl_kuliner') {
                    detail_destinasi = await tbl_Kuliner.findOne({
                        where: { id_kuliner: pesanan.id_destinasi },
                        attributes: [
                            "id_kuliner",
                            "nama_kuliner",
                        ]
                    });

                    detail_pesanan = await tbl_detail_pesanan.findAll({
                        where: { id_pesanan: pesanan.id_pesanan },
                        attributes: [
                            "id_detail_pesanan",
                            "id_menu",
                            "nama_menu",
                            "jumlah",
                            "harga_satuan"
                        ],

                        include: [
                            {
                                model: tbl_Menu,
                                as: "menu_detail_as",
                                attributes: [
                                    "id_menu",
                                    "nama_menu",
                                    "harga_menu",
                                    "sampul_menu"
                                ],
                                required: false,
                            },
                        ]
                    });
                }

                // return detail_pesanan.map((items) => ({
                //         nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                //         id_detail_pesanan: items.id_detail_pesanan,
                //         id_menu: items.id_menu,
                //         nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                //         jumlah: items.jumlah,
                //         harga_satuan: items.harga_satuan,
                //         harga_total: items.harga_satuan * items.jumlah,
                //         sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                //     }));
                const formattedTglBooking = pesanan.tgl_booking.toISOString().split('T')[0];

                return {
                    id_pesanan: pesanan.id_pesanan,
                    id_pembayaran: pesanan.id_pembayaran,
                    id_destinasi: pesanan.id_destinasi,
                    kode_pesanan: pesanan.kode_pesanan,
                    kode_qr: pesanan.kode_qr,
                    tgl_booking: pesanan.tgl_booking,
                    total_pesanan: pesanan.total_pesanan,
                    jenis_destinasi: pesanan.nama_destinasi,
                    tgl_pesanan: pesanan.createdAt,
                    tgl_pesanan_selesai: pesanan.updatedAt,
                    nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                    detail_pesanan: detail_pesanan.map((items) => ({
                        id_detail_pesanan: items.id_detail_pesanan,
                        id_menu: items.id_menu,
                        nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                        jumlah: items.jumlah,
                        harga_satuan: items.harga_satuan,
                        sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                    }))
                };
            }));
            pesanan.dataValues.pesanan = results.flat();
            return pesanan;
        }));


        res.status(200).json({
            message: 'Pesanan berhasil didapat',
            data: get_pesanan,
        });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const Get_Pesanan_batalkan = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const data = await tbl_pembayaran.findAndCountAll({
            where: {
                [Op.and]: [
                    { id_wisatawan: id_wisatawan },
                    { status_pembayaran: 'batal' },
                ]
            },
            include: [
                {
                    model: tbl_wisatawan,
                    as: "wisatawan_detail_as",
                },
            ],
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Belum ada pesanan dibatalkan",
                data: null,
            });
        }

        const get_pesanan = await Promise.all(data.rows.map(async (pesanan) => {

            const data_pesanan = await tbl_pesanan.findAndCountAll({
                where: {
                    [Op.and]: [
                        { id_wisatawan: id_wisatawan },
                        { id_pembayaran: pesanan.id_pembayaran },
                        { status_pesanan: 'selesai' },
                    ]
                },
                attributes: [
                    "id_pesanan",
                    "id_pembayaran",
                    "id_wisatawan",
                    "id_destinasi",
                    "nama_destinasi",
                    "kode_pesanan",
                    "kode_qr",
                    "tgl_booking",
                    "total_pesanan",
                    "status_pesanan",
                    "createdAt",
                    "updatedAt"
                ]
            });

            const results = await Promise.all(data_pesanan.rows.map(async (pesanan) => {
                let detail_destinasi = [];
                let detail_pesanan = [];
                if (pesanan.nama_destinasi === 'tbl_destinasi') {
                    detail_destinasi = await tbl_Wisata.findOne({
                        where: { id_wisata: pesanan.id_destinasi },
                        attributes: [
                            "id_wisata",
                            "nama_destinasi"
                        ]
                    });

                    detail_pesanan = await tbl_detail_pesanan.findAll({
                        where: { id_pesanan: pesanan.id_pesanan },
                        attributes: [
                            "id_detail_pesanan",
                            "id_menu",
                            "nama_menu",
                            "jumlah",
                            "harga_satuan"
                        ],

                        include: [
                            {
                                model: tbl_Wisata,
                                as: "tiket_detail_as",
                                attributes: [
                                    "id_wisata",
                                    "nama_destinasi",
                                    "harga_tiket",
                                    "sampul_destinasi"
                                ],
                                required: false,
                            },
                        ]
                    });
                } else if (pesanan.nama_destinasi === 'tbl_kuliner') {
                    detail_destinasi = await tbl_Kuliner.findOne({
                        where: { id_kuliner: pesanan.id_destinasi },
                        attributes: [
                            "id_kuliner",
                            "nama_kuliner"
                        ]
                    });

                    detail_pesanan = await tbl_detail_pesanan.findAll({
                        where: { id_pesanan: pesanan.id_pesanan },
                        attributes: [
                            "id_detail_pesanan",
                            "id_menu",
                            "nama_menu",
                            "jumlah",
                            "harga_satuan"
                        ],

                        include: [
                            {
                                model: tbl_Menu,
                                as: "menu_detail_as",
                                attributes: [
                                    "id_menu",
                                    "nama_menu",
                                    "harga_menu",
                                    "sampul_menu"
                                ],
                                required: false,
                            },
                        ]
                    });
                }

                // return detail_pesanan.map((items) => ({
                //         nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                //         id_detail_pesanan: items.id_detail_pesanan,
                //         id_menu: items.id_menu,
                //         nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                //         jumlah: items.jumlah,
                //         harga_satuan: items.harga_satuan,
                //         harga_total: items.harga_satuan * items.jumlah,
                //         sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                //     }));

                return {
                    id_pesanan: pesanan.id_pesanan,
                    id_pembayaran: pesanan.id_pembayaran,
                    id_destinasi: pesanan.id_destinasi,
                    kode_pesanan: pesanan.kode_pesanan,
                    kode_qr: pesanan.kode_qr,
                    tgl_booking: pesanan.tgl_booking,
                    total_pesanan: pesanan.total_pesanan,
                    jenis_destinasi: pesanan.nama_destinasi,
                    tgl_pesanan: pesanan.createdAt,
                    tgl_pesanan_selesai: pesanan.updatedAt,
                    nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
                    detail_pesanan: detail_pesanan.map((items) => ({
                        id_detail_pesanan: items.id_detail_pesanan,
                        id_menu: items.id_menu,
                        nama_menu: items.tiket_detail_as ? "Tiket " + items.tiket_detail_as.nama_destinasi : items.menu_detail_as.nama_menu,
                        jumlah: items.jumlah,
                        harga_satuan: items.harga_satuan,
                        sampul_menu: items.tiket_detail_as ? items.tiket_detail_as.sampul_destinasi : items.menu_detail_as.sampul_menu,
                    }))
                };
            }));
            pesanan.dataValues.pesanan = results.flat();
            return pesanan;
        }));


        res.status(200).json({
            message: 'Pesanan berhasil didapat',
            data: get_pesanan,
        });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const Post_Pesanan_dibatalkan = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const { id_pembayaran } = req.params;
        const {
            keterangan = '',
        } = req.query;

        if (!id_pembayaran) {
            return res.status(422).json({ msg: "id_pembayaran is required!", token });
        }

        const data = await tbl_pembayaran.findOne({
            where: {
                [Op.and]: [
                    { id_wisatawan: id_wisatawan },
                    { id_pembayaran: id_pembayaran },
                ]
            },
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Pesanan tidak ditemukan",
                data: null,
            });
        }

        if (data.status_pembayaran !== 'belum_bayar') {
            return res.status(422).json({
                success: false,
                message: "Pesanan gagal dibatalkans",
                data: data.status_pembayaran,
            });
        }

        const tgl_pembatalan = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

        await data.update({
            status_pembayaran: "batal" || data.status_pembayaran,
            keterangan_pembayaran: keterangan || data.keterangan_pembayaran,
            updatedAt: tgl_pembatalan || data.updatedAt,
        });

        await tbl_pesanan.update(
            { status_pesanan: 'selesai' },
            { where: { id_pembayaran: id_pembayaran } }
        );

        res.status(200).json({
            message: 'Pesanan berhasil dibatalkan',
            data: data,
        });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const Post_Pesanan_dibayar = async (req, res) => {
    try {
        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const { id_pembayaran } = req.params;

        if (!id_pembayaran) {
            return res.status(422).json({ msg: "id_pembayaran is required!", token });
        }

        const data = await tbl_pembayaran.findOne({
            where: {
                [Op.and]: [
                    { id_wisatawan: id_wisatawan },
                    { id_pembayaran: id_pembayaran },
                ]
            },
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Pesanan tidak ditemukan",
                data: null,
            });
        }

        if (data.status_pembayaran !== 'belum_bayar') {
            return res.status(422).json({
                success: false,
                message: "Pesanan gagal dibayar",
                data: data.status_pembayaran,
            });
        }

        const tgl_pembayaran = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

        await data.update({
            status_pembayaran: "bayar" || data.status_pembayaran,
            tgl_pembayaran: tgl_pembayaran || data.tgl_pembayaran,
            metode_pembayaran: "Bank Tranfer" || data.metode_pembayaran,
        });

        res.status(200).json({
            message: 'Pesanan berhasil dibayar',
            data: data,
        });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const checkSignatureKey = async (id_pembayaran, data) => {
    const hash = crypto.createHash('sha512').update(`${data.order_id}${data.status_code}${data.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`).digest('hex')

    if (data.signature_key !== hash) {
        return {
            status: 'Error',
            message: 'Invalid Signature Key',
        }

    }

    let responseData = null;
    let transactionStatus = data.transaction_status;
    let fraudStatus = data.fraud_status;

    if (transactionStatus == 'capture') {
        if (fraudStatus == 'accept') {

            const tgl_pembayaran = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

            const transaction = await tbl_pembayaran.update(
                {
                    status_pembayaran: "bayar",
                    tgl_pembayaran: tgl_pembayaran,
                    metode_pembayaran: data.payment_type,
                },
                { where: { id_pembayaran: id_pembayaran } }
            );

            responseData = transaction;

        }
    } else if (transactionStatus == 'settlement') {

        const tgl_pembayaran = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

        const transaction = await tbl_pembayaran.update(
            {
                status_pembayaran: "bayar",
                tgl_pembayaran: tgl_pembayaran,
                metode_pembayaran: data.payment_type,
            },
            { where: { id_pembayaran: id_pembayaran } }
        );
        responseData = transaction;

    } else if (transactionStatus == 'cancel' ||
        transactionStatus == 'deny' || transactionStatus == 'expire') {
        const tgl_pembatalan = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

        const transaction = await tbl_pembayaran.update(
            {
                status_pembayaran: "batal",
                keterangan_pembayaran: "Waktu pembayaran habis, pesanan dibatalkan oleh sistem",
                updatedAt: tgl_pembatalan,
            },
            { where: { id_pembayaran: id_pembayaran } }
        );

        await tbl_pesanan.update(
            { status_pesanan: 'selesai' },
            { where: { id_pembayaran: id_pembayaran } }
        );

        responseData = transaction;

    } else if (transactionStatus == 'pending') {

        const transaction = await tbl_pembayaran.update(
            {
                status_pembayaran: "belum_bayar",
            },
            { where: { id_pembayaran: id_pembayaran } }
        );

        responseData = transaction;
    }

    return {
        status: "Success",
        data: responseData[0]
    }
}

const trxNotif = async (req, res) => {

    try {
        const data = req.body;

        const transaksi = await tbl_pembayaran.findOne({
            where: { kode_pembayaran: data.order_id },
        });

        if (transaksi) {
            checkSignatureKey(transaksi.id_pembayaran, data).then(result => {
                console.log('result', result);
            });
        };

        res.status(200).json({
            status: 'Success',
            message: 'Ok',
        });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const check_Pesanan_dibayar = async (req, res) => {
    try {

        let id_wisatawan;

        const token = req.cookies.refreshtoken;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_wisatawan = decoded.id;

        const { id_pembayaran } = req.params;

        const data = await tbl_pembayaran.findOne({
            where: {
                [Op.and]: [
                    { id_pembayaran: id_pembayaran },
                    { id_wisatawan: id_wisatawan },
                    { status_pembayaran: 'belum_bayar' },
                ]
            },
        });

        if (data.count === 0) {
            return res.status(422).json({
                success: false,
                message: "Gagal melakukan pembayaran",
                data: null,
            });
        }

        res.status(200).json({
            message: 'Pesanan berhasil didapat',
            data: data,
        });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}

const Post_checkIn_destinasi = async (req, res) => {
    try {

        let id_admin_login;

        const token = req.cookies.tokenadmin;

        if (!token) {
            return res.status(401).json({ msg: "Akun Belum Login!", token });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id_admin_login = decoded.id;

        const { kode_qr } = req.params;

        if (!kode_qr) {
            return res.status(422).json({ msg: "kode_qr is required!" });
        }

        const data_pesanan = await tbl_pesanan.findOne({
            where: {
                kode_qr: kode_qr
            },
        });

        if (!data_pesanan) {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: "Qrcode Invalid!",
            });
        }

        const pesanan = data_pesanan.dataValues;

        const data_wisatawan = await tbl_wisatawan.findOne({
            where: {
                id_wisatawan: pesanan.id_wisatawan
            }, attributes: [
                "name",
                "no_hp",
                "email",
                "profile",
            ]
        });

        let detail_destinasi = {};
        let detail_pesanans = [];

        if (pesanan.nama_destinasi === 'tbl_destinasi') {
            detail_destinasi = await tbl_Wisata.findOne({
                where: { id_wisata: pesanan.id_destinasi },
                attributes: [
                    "id_wisata",
                    "id_admin",
                    "id_admin_pengelola",
                    "nama_destinasi",
                ]
            });

            detail_pesanans = await tbl_detail_pesanan.findAll({
                where: { id_pesanan: pesanan.id_pesanan },
                attributes: [
                    "id_detail_pesanan",
                    "id_menu",
                    "nama_menu",
                    "jumlah",
                    "harga_satuan"
                ],
                include: [
                    {
                        model: tbl_Wisata,
                        as: "tiket_detail_as",
                        attributes: [
                            "id_wisata",
                            "nama_destinasi",
                            "harga_tiket",
                            "sampul_destinasi"
                        ],
                        required: false,
                    },
                ]
            });

        } else if (pesanan.nama_destinasi === 'tbl_kuliner') {
            detail_destinasi = await tbl_Kuliner.findOne({
                where: { id_kuliner: pesanan.id_destinasi },
                attributes: [
                    "id_kuliner",
                    "id_admin",
                    "id_admin_pengelola",
                    "nama_kuliner",
                ]
            });

            detail_pesanans = await tbl_detail_pesanan.findAll({
                where: { id_pesanan: pesanan.id_pesanan },
                attributes: [
                    "id_detail_pesanan",
                    "id_menu",
                    "nama_menu",
                    "jumlah",
                    "harga_satuan"
                ],
                include: [
                    {
                        model: tbl_Menu,
                        as: "menu_detail_as",
                        attributes: [
                            "id_menu",
                            "nama_menu",
                            "harga_menu",
                            "sampul_menu"
                        ],
                        required: false,
                    },
                ]
            });
        }

        if (detail_destinasi.id_admin !== id_admin_login) {

            if (detail_destinasi.id_admin_pengelola !== id_admin_login) {
                return res.status(422).json({
                    status: 'error',
                    success: false,
                    message: "Qrcode Invalid!",
                });
            }
        }

        const data_pembayaran = await tbl_pembayaran.findOne({
            where: {
                id_pembayaran: data_pesanan.id_pembayaran
            },
            attributes: [
                "id_pembayaran",
                "id_wisatawan",
                "kode_pembayaran",
                "total_pembayaran",
                "tgl_pembayaran",
                "metode_pembayaran",
                "status_pembayaran",
            ]
        });

        if (data_pembayaran.status_pembayaran === 'belum_bayar') {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: "Ticket belum dibayar!",
            });
        }

        if (data_pembayaran.status_pembayaran === 'batal') {
            return res.status(422).json({
                status: 'error',
                success: false,
                message: "Ticket dibatalkan!",
            });
        }

        const result = {
            id_pesanan: pesanan.id_pesanan,
            data_wisatawan,
            data_pembayaran,
            id_destinasi: pesanan.id_destinasi,
            kode_pesanan: pesanan.kode_pesanan,
            kode_qr: pesanan.kode_qr,
            tgl_booking: pesanan.tgl_booking,
            total_pesanan: pesanan.total_pesanan,
            jenis_destinasi: pesanan.nama_destinasi,
            tgl_pesanan: pesanan.createdAt,
            tgl_pesanan_selesai: pesanan.updatedAt,
            nama_destinasi: detail_destinasi.id_wisata ? detail_destinasi.nama_destinasi : detail_destinasi.nama_kuliner,
            detail_pesanan: detail_pesanans.map((item) => ({
                id_detail_pesanan: item.id_detail_pesanan,
                id_menu: item.id_menu,
                nama_menu: item.tiket_detail_as ? "Tiket " + item.tiket_detail_as.nama_destinasi : item.menu_detail_as.nama_menu,
                jumlah: item.jumlah,
                harga_satuan: item.harga_satuan,
                sampul_menu: item.tiket_detail_as ? item.tiket_detail_as.sampul_destinasi : item.menu_detail_as.sampul_menu,
            }))
        };

        const tgl_kadaluarsa = moment(data_pesanan.tgl_booking, "YYYY-MM-DD HH:mm:ss").tz("Asia/Jakarta");
        const tgl_checkIn = moment().tz("Asia/Jakarta");

        console.log(tgl_kadaluarsa.format("YYYY-MM-DD HH:mm:ss"));
        console.log(tgl_checkIn.format("YYYY-MM-DD HH:mm:ss"));

        if (tgl_checkIn.isAfter(tgl_kadaluarsa)) {
            return res.status(422).json({
                status: 'info',
                success: false,
                message: "Tiket sudah kadaluarsa!",
            });
        }

        if (data_pesanan.status_pesanan === 'selesai') {
            return res.status(422).json({
                status: 'info',
                success: false,
                message: "Tikect sudah digunakan!",
                data: result,
            });
        }

        await data_pembayaran.update({
            status_pembayaran: "selesai" || data_pembayaran.status_pembayaran,
        });

        const data_destinasi = await tbl_Wisata.findOne({
            where: {
                id_wisata: data_pesanan.id_destinasi
            },
        });

        const detail_pesanan = await tbl_detail_pesanan.findOne({
            where: {
                id_pesanan: data_pesanan.id_pesanan
            },
        });

        await data_pesanan.update({
            status_pesanan: 'selesai' || data_pesanan.status_pesanan,
            updatedAt: tgl_checkIn || data_pesanan.updatedAt,
        });

        const update_pengunjung_destinasi = data_destinasi.total_pengunjung_destinasi + detail_pesanan.jumlah

        const currentDateTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const data_pengunjung_wisata = await tbl_data_pengunjung.findOne({
            where: {
                id_table: data_destinasi.id_wisata,
                nama_table: "tbl_wisata",
                tahun_data_pengunjung: currentYear,
                bulan_data_pengunjung: currentMonth,
                status_verifikasi: 'verified'
            }
        });


        if (!data_pengunjung_wisata) {

            await tbl_data_pengunjung.create({
                id_table: data_destinasi.id_wisata,
                id_admin_verifed: 1,
                nama_table: "tbl_wisata",
                tahun_data_pengunjung: currentYear,
                bulan_data_pengunjung: currentMonth,
                jumlah_pengunjung_lokal: 0,
                jumlah_pengunjung_aplikasi: detail_pesanan.jumlah,
                jumlah_pengunjung_mancanegara: 0,
                jumlah_pegawai_laki: 0,
                jumlah_pegawai_perempuan: 0,
                status_verifikasi: 'verified',
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            });

        } else {

            const jumlah_pengunjung_aplikasi_update = data_pengunjung_wisata.jumlah_pengunjung_aplikasi + detail_pesanan.jumlah;

            await data_pengunjung_wisata.update({
                jumlah_pengunjung_aplikasi: jumlah_pengunjung_aplikasi_update,
                updatedAt: currentDateTime
            });
        }

        await data_destinasi.update({
            total_pengunjung_destinasi: update_pengunjung_destinasi || data_destinasi.total_pengunjung_destinasi,
            updatedAt: tgl_checkIn || data_destinasi.updatedAt,
        });

        res.status(200).json({
            status: 'success',
            message: 'Check in berhasil!',
            data: result,
        });

    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ message: 'Terjadi kesalahan', error });
    }
}




module.exports = {
    get_all_keranjang,
    post_newAddTocart_tiket,
    post_newAddTocart_menu,
    remove_cart,
    CheckExistKeranjangPesanan,
    AddPesanan,
    Get_Pesanan_belumBayar,
    Get_Pesanan_Eticket,
    Get_Pesanan_batalkan,
    Get_Pesanan_selesai,
    Post_Pesanan_dibatalkan,
    Post_Pesanan_dibayar,
    trxNotif,

    check_Pesanan_dibayar,
    Post_checkIn_destinasi

};