const express = require('express')
const app = express()
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const user = require('./routes/user')
app.use(user)

app.listen(process.env.port, () => {
    console.log(`Server running localhost:${process.env.port}`)
})