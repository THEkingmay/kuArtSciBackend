const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const userRouter = require('./routes/user')

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/user' , userRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT , ()=>{
    console.log('server is running on PORT ', PORT)
})
