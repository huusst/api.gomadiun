const db = require("../models");
const tbl_Otp = db.tbl_Otp;
const tbl_wisatawan = db.tbl_Wisatawan;
const tbl_Admin = db.tbl_Admin;
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const Login = async (req, res) => {
    let id
    let name
    let email
    let password

    try {
        const user_wisatawan = await tbl_wisatawan.findOne({
            where: {
                email: req.body.email,
            },
        });

        if (!user_wisatawan) {
            return res.status(400).json({ msg: "Akun Anda tidak terdaftar!" });
        }

        if (user_wisatawan) {
            const match = await bcrypt.compare(
                req.body.password,
                user_wisatawan.password
            );
            if (!match) {
                return res.status(400).json({ msg: "Password Anda salah" });
            }

            id = user_wisatawan.id_wisatawan
            name = user_wisatawan.name
            email = user_wisatawan.email
            password = user_wisatawan.password
        }

        const token = jwt.sign(
            {
                id,
                email,
                password,
            }, process.env.JWT_SECRET, { expiresIn: '10s' }
        );

        const token_refresh = jwt.sign(
            {
                id,
                email,
                password,
            }, process.env.JWT_REFRESH_SECRET, { expiresIn: '1d' }
        );

        await tbl_wisatawan.update({ refresh_token: token_refresh }, {
            where: {
                id_wisatawan: id,
            },
        });

        res.cookie('refreshtoken', token_refresh, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({ message: "Login Berhasil", token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Terjadi kesalahan pada server" });
    }
};

const Me = async (req, res) => {
    let id
    let name
    let role

    const token = req.cookies.refreshtoken;

    if (!token) {
        return res.status(401).json({ msg: "Akun Belum Login!", token });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id = decoded.id;

        const user_wisatawan = await tbl_wisatawan.findOne({
            attributes: ['id_wisatawan', 'name', 'profile'],
            where: {
                id_wisatawan: id
            }
        });

        if (!user_wisatawan) {
            return res.status(404).json({ msg: "User tidak ditemukan" });
        }
        else if (user_wisatawan) {
            name = user_wisatawan['name'];
            role = 'wisatawan';
        }

        res.status(200).json({ user_wisatawan, role });
    } catch (error) {
        console.error(error);
        // res.clearCookie('token');
        res.status(500).json({ msg: "Terjadi kesalahan pada server", error });
    }
}

const sendOtp = async (req, res) => {
    try {
        const email = req.body.email;
        const typesend = req.body.typesend;

        const otpActive = await tbl_Otp.findOne({ where: { email_user: email } });

        if (otpActive) {
            const currentTime = new Date();
            const expiredTime = otpActive.expiryTime;

            const timeDifference = (currentTime.getTime() - expiredTime.getTime()) / (1000 * 60); // Dalam menit

            if (timeDifference <= 5) {
                return res.status(422).json({
                    status: 422,
                    success: false,
                    message: "Terjadi Kesalahan, Coba lagi nanti!",
                });
            } else {
                await tbl_Otp.destroy({
                    where: {
                        email_user: email,
                    },
                });
            }
        }

        const otp = otpGenerator.generate(6,
            {
                digits: true,
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false
            });

        // Simpan OTP dan waktu kadaluarsa dalam database
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + 5); // Waktu kadaluarsa 5 menit dari sekarang
        const otpadd = await tbl_Otp.create({ email_user: email, otp: otp, expiryTime: expiryTime });

        if (!otpadd) {
            res.status(422).send('OTP sent Failed!');
        }



        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'nurafiifalmas@student.uns.ac.id',
                pass: 'qmaq qtyp lscc wnpu'
            }
        });

        const mailOptions = {
            from: 'nurafiifalmas@student.uns.ac.id',
            to: email,
            subject: 'Verifikasi Kode OTP',
            text: `Jangan berikan kode ini kepada orang lain, Kode OTP: ${otp}`
        };

        const mailOptionsreset = {
            from: 'nurafiifalmas@student.uns.ac.id',
            to: email,
            subject: 'Reset your password',
            text: `Jangan berikan kode ini kepada orang lain, Kode OTP: ${otp}`
        };

        if (typesend === "reset") {
            await transporter.sendMail(mailOptionsreset);
        } else {
            await transporter.sendMail(mailOptions);
        }


        return res.status(200).json({
            status: 200,
            success: true,
            message: "OTP sent successfully, check your Email!",
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).send('Error sending OTP');
    }
};

const VerifOtp = async (req, res) => {

    try {
        const { email, otp } = req.body;

        const otpActive = await tbl_Otp.findOne({ where: { email_user: email, otp: otp } });

        if (otpActive) {
            const currentTime = new Date();
            const expiredTime = otpActive.expiryTime;

            const timeDifference = (currentTime.getTime() - expiredTime.getTime()) / (1000 * 60); // Dalam menit

            if (timeDifference <= 5) {

                const update = await tbl_Otp.destroy({
                    where: {
                        email_user: email,
                    },
                });

                if (update) {
                    return res.status(200).json({
                        status: 200,
                        success: true,
                        message: "Otp Valid!",
                    });
                }
            } else {
                return res.status(422).json({
                    status: 422,
                    success: false,
                    message: "Kode OTP expired!",
                });
            }
        } else {
            return res.status(422).json({
                status: 422,
                success: false,
                message: "Kode OTP salah!",
            });
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

const logOut = async (req, res) => {
    const {
        keyword = '',
    } = req.query;

    if (!keyword) {
        return res.status(401).json({ msg: "query keywoard is required!" });
    }

    const token = keyword === "wisatawan" ? req.cookies.refreshtoken : req.cookies.tokenadmin;

    if (!token) {
        return res.status(401).json({ msg: "Akun Belum Login!", token });
    }

    const user_wisatawan = await tbl_wisatawan.findOne({
        where: {
            refresh_token: token,
        },
    });

    if (!user_wisatawan) {

        const user_admin = await tbl_Admin.findOne({
            where: {
                refresh_token: token,
            },
        });

        if (!user_admin) {
            return res.status(422).json({ msg: "Admin tidak ada" });
        }

        const id = user_admin.id_admin;

        await tbl_Admin.update({ refresh_token: null }, {
            where: {
                id_admin: id,
            },
        });

        res.clearCookie('tokenadmin');
        res.status(200).json({ msg: "Admin telah berhasil logout" });

    } else {

        const id = user_wisatawan.id_wisatawan;

        await tbl_wisatawan.update({ refresh_token: null }, {
            where: {
                id_wisatawan: id,
            },
        });

        res.clearCookie('refreshtoken');
        res.status(200).json({ msg: "Anda telah berhasil logout" });
    }
};


//admin

const LoginAdmin = async (req, res) => {
    let id
    let name
    let email
    let password
    let role

    try {
        const user_admin = await tbl_Admin.findOne({
            where: {
                email_admin: req.body.email,
            },
        });

        if (!user_admin) {
            return res.status(422).json({ status: 'error', message: "Akun Anda tidak terdaftar!" });
        }

        if (user_admin) {
            const match = await bcrypt.compare(
                req.body.password,
                user_admin.password_admin
            );
            if (!match) {
                return res.status(422).json({ status: 'error', message: "Password Anda salah" });
            }
            if (user_admin.status_akun === "suspend") {
                return res.status(422).json({ status: 'error', message: "Akun Anda dinonaktifkan" });
            }

            id = user_admin.id_admin
            name = user_admin.nama_admin
            email = user_admin.email_admin
            password = user_admin.password_admin
            role = user_admin.role
        }

        const token = jwt.sign(
            {
                id,
                email,
                password,
                role,
            }, process.env.JWT_SECRET, { expiresIn: '10s' }
        );

        const token_refresh = jwt.sign(
            {
                id,
                email,
                password,
                role
            }, process.env.JWT_REFRESH_SECRET, { expiresIn: '1d' }
        );

        await tbl_Admin.update({ refresh_token: token_refresh }, {
            where: {
                id_admin: id,
            },
        });

        res.cookie('tokenadmin', token_refresh, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({ message: "Login Berhasil", token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Terjadi kesalahan pada server" });
    }
};

const MeAdmin = async (req, res) => {
    let id
    let name
    let role

    const token = req.cookies.tokenadmin;

    if (!token) {
        return res.status(401).json({ msg: "Akun Belum Login!", token });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        id = decoded.id;

        const user_admin = await tbl_Admin.findOne({
            attributes: ['id_admin', 'nama_admin', 'sampul_admin', 'role'],
            where: {
                id_admin: id
            }
        });

        if (!user_admin) {
            return res.status(404).json({ msg: "User tidak ditemukan" });
        }

        res.status(200).json({ user_admin });
    } catch (error) {
        console.error(error);
        // res.clearCookie('token');
        res.status(500).json({ msg: "Terjadi kesalahan pada server", error });
    }
}

module.exports = {
    Login,
    Me,
    logOut,
    sendOtp,
    VerifOtp,
    LoginAdmin,
    MeAdmin
}; 