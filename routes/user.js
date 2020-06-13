const express = require('express')
const router = express.Router()
const db = require('../middleware/connection')
const jwt = require('jsonwebtoken')
var md5 = require('md5')
require('dotenv').config()
const auth = require('../middleware/auth')

router.post('/register', (req, res) => {
    const name = req.body.name.toLowerCase()
    const username = req.body.username.toLowerCase()
    const password = md5(req.body.password)
    const level = 3
    db.query('SELECT * FROM user WHERE username = ?', [username], (err, results) => {
        if (err) return res.json(auth.generateOutput(true, "Terjadi kesalahan saat proses registrasi.", {}))
        if (results.length == 0) {
            db.query(`INSERT INTO user (id, full_name, username, password, level, create_at, update_at) VALUES (NULL, ?, ?, ?, ?, current_timestamp(), current_timestamp())`, [name, username, password, level], (err, results) => {
                if (err) {
                    console.log(err)
                    res.json(auth.generateOutput(true, "Terjadi kesalahan saat proses registrasi.", {}))
                } else {
                    res.json(auth.generateOutput(false, "Registrasi berhasil.", {}))
                }
            })
        } else {
            res.json(auth.generateOutput(true, "Username telah digunakan", {}))
        }
    })
})
router.get('/logout', auth.authToken, (req, res) => {
    const authHeader = req.headers['authorization']
    const token = authHeader.split(' ')[1]
    if (token == null) return res.json(auth.generateOutput(true, "ANDA TIDAK DIPERBOLEHKAN MENGAKSES HALAMAN INI", {}))
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, nim) => {
        if (err) return res.json(auth.generateOutput(true, "ANDA TIDAK DIPERBOLEHKAN MENGAKSES HALAMAN INI", {}))
        db.query(`DELETE FROM token WHERE token=?`, [token], (err, results) => {
            if (err || results.affectedRows == 0) {
                res.json(auth.generateOutput(true, "Terjadi kesalahan saat proses logout.", {}))
            } else {
                res.json(auth.generateOutput(false, "Berhasil logout", {}))
            }
        })
    })
})
router.post('/login', async(req, res) => {
    const username = req.body.username
    const password = md5(req.body.password)
    const singleToken = req.body.singleToken || false
    db.query('SELECT * FROM user WHERE username = ? AND password = ?', [username, password], async(err, results) => {
        if (err) {
            res.json(auth.generateOutput(true, "Terjadi kesalahan saat proses login.", {}))
        } else {
            if (results.length == 1) {
                if (!singleToken) {
                    const accessToken = auth.generateToken(username, results[0].id)
                    res.json(await auth.addTokenList(results[0].id, accessToken))
                } else {
                    db.query('SELECT * FROM user,token WHERE user.id = token.user_id AND user.username = ?', [username], async(err, cekres) => {
                        if (err) res.json(auth.generateOutput(true, "Terjadi kesalahan saat proses login.", {}))
                        if (cekres.length >= 1) {
                            res.json(auth.generateOutput(false, "Login berhasil.", { accessToken: cekres[0].token }))
                        } else {
                            const accessToken = auth.generateToken(username, results[0].id)
                            res.json(await auth.addTokenList(results[0].id, accessToken))
                        }
                    })
                }
            } else {
                res.json(auth.generateOutput(true, "Username/password salah.", {}))
            }
        }
    })
})
const getTokenList = (id, res) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM token WHERE user_id = ?', [id], (err, results) => {
            if (!err) return resolve(results)
            return reject(auth.generateOutput(true, "terjadi kesalahan pada database server", {}))
        })
    })
}
router.get('/info', auth.authToken, async(req, res) => {
    //semua user yang telah terverifikasi bisa mengakses halaman ini
    let tokenList = await getTokenList(req.info.id, res).catch(result => {
        res.json(result)
    })
    req.info.level = await auth.checkLevel(req.info.id)
    req.info.token = []
    req.info.token.push(tokenList)
    res.json(auth.generateOutput(false, "", req.info))
})
router.get('/admin', auth.authToken, auth.permit("admin"), async(req, res) => {
    //hanya admin yang dapat mengakses halaman ini
    res.json(auth.generateOutput(false, "INI HALAMAN ADMIN", {}))
})
router.get('/member', auth.authToken, auth.permit("member"), async(req, res) => {
    //hanya member yang dapat mengakses halaman ini
    res.json(auth.generateOutput(false, "INI HALAMAN MEMBER", {}))
})
router.get('/multi', auth.authToken, auth.permit("admin", "moderator"), async(req, res) => {
    //hanya admin dan moderator yang dapat mengakses halaman ini
    res.json(auth.generateOutput(false, "INI HALAMAN ADMIN", {}))
})
module.exports = router