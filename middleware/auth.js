const db = require('./connection')
const jwt = require('jsonwebtoken')
require('dotenv').config()

function generateToken(username, id) {
    return jwt.sign({ id: id, username: username }, process.env.ACCESS_TOKEN);
}

function permit(...allow) {
    const isAllowed = level => allow.indexOf(level) > -1;
    return async(req, res, next) => {
        if (isAllowed(await checkLevel(req.info.id))) {
            next()
        } else {
            return res.json(generateOutput(true, "ANDA TIDAK DIPERBOLEHKAN MENGAKSES HALAMAN INI", ""))
        }
    }
}

async function authToken(req, res, next) {
    const authHeader = req.headers['authorization'] || ""
    const token = authHeader.split(' ')[1]
    if (token == null) return res.json(generateOutput(true, "ANDA TIDAK DIPERBOLEHKAN MENGAKSES HALAMAN INI", ""))
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, info) => {
        if (err) return res.json(generateOutput(true, "ANDA TIDAK DIPERBOLEHKAN MENGAKSES HALAMAN INI", ""))
        db.query('SELECT * FROM token WHERE token = ?', [token], (err, results) => {
            if (results.length >= 1) {
                if (Date.parse(results[0].create_at) >= (info.iat * 1000)) {
                    req.info = info
                    next()
                } else {
                    return res.json(generateOutput(true, "ANDA TIDAK DIPERBOLEHKAN MENGAKSES HALAMAN INI", ""))
                }
            } else {
                return res.json(generateOutput(true, "ANDA TIDAK DIPERBOLEHKAN MENGAKSES HALAMAN INI", ""))
            }
        })
    })
}

function generateOutput(error, msg, data) {
    return { "error": error, "msg": msg, "data": data }
}
const checkLevel = (id) => {
    return new Promise((resolve, reject) => {
        db.query(`SELECT * FROM level,user WHERE user.id = ?`, [id], (err, results) => {
            if (!err) return resolve(results[0].name)
            return reject(generateOutput(true, "terjadi kesalahan pada database server", ""))
        })
    })
}
const addTokenList = (id, token, res) => {
    return new Promise((resolve, reject) => {
        db.query('INSERT INTO token (token_id, user_id, token, create_at) VALUES (NULL, ?, ?, current_timestamp())', [id, token], (err, results) => {
            if (!err) return resolve(generateOutput(true, "Login berhasil.", { accessToken: token }))
            return reject(generateOutput(true, "terjadi kesalahan pada database server", ""))
        })
    })
}
module.exports.generateToken = generateToken
module.exports.authToken = authToken
module.exports.generateOutput = generateOutput
module.exports.addTokenList = addTokenList
module.exports.permit = permit