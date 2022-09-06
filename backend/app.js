const express = require('express')
const mongoose = require('mongoose')
const app = express()
const dbConnection = require('./db/connection')
require('dotenv').config()
const loginRegister = require('./routes/loginRegister')
const port = 8080 || process.env.PROCESS
const user = require('./models/modelUser.js')
const verify = require('./middleware/authToken')
const recoveryPass = require('./routes/forgotPassword')
const bcrypt = require('bcrypt')
const addPost = require("./routes/postAdd")
const userProfile = require('./routes/userProfileCreate')
const userProfileSchema = require('./models/userProfile')
const post = require('./models/post')
const cors = require('cors')
const reservationSchema = require('./models/reservation')
const MUUID = require('uuid-mongodb');
const messages = require('./routes/messages')

// user cors, it doesnt work at all on firefox if not included
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/user", loginRegister)
app.use("/", recoveryPass)
app.use("/", addPost)
app.use("/", userProfile)
app.use("/", messages)

app.get("/user/register", (req,res) => {
    res.sendFile(__dirname + '/public/index.html')
})
app.get("/success_login",(req,res)=>{
    res.json({login : "success"})
})

app.get("/profile", verify, async (req,res)=>{
    const token = req.header('x-auth-token')
    let payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url"));
    const userProfileCheck = await user.findOne({email : payload.userEmail})
    const userReservations = await reservationSchema.find({to : payload.userId})
    const userProf = await userProfileSchema.findOne({user: userProfileCheck.userId})
    if(userProfileCheck){
        let result = await post.find({author : userProfileCheck.userId})
        res.status(200).json({profile : userProf, posts : result, reservations : userReservations})
    }else{
        res.status(404).json({msg : `Something went wrong`})
    }
})

app.get("/posts", async (req,res)=>{
    const newPosts = await post.find().sort({ $natural: -1 }).limit(20)
    res.status(200).json({newest20Posts : newPosts})
})

app.get("/posts/:startingId/:postsNum", async (req,res)=>{
    let {startingId, postsNum} = req.params
    const newPosts = await post.find().limit(postsNum).skip(Number(startingId)-1)
    res.status(200).json({postToShow : newPosts})
})

app.get("/posts/:postId", async (req,res)=>{
    let postId = req.params
    const uuidPost = postId.postId
    const uuidToSearch = MUUID.from(uuidPost)
    const postFromId = await post.find({postId : uuidToSearch})
    res.json({postToShow : postFromId})
})
amqp = require('amqplib/callback_api')

amqp.connect('amqps://eptpufqg:OmaKZ0XISvvoAJBXDWcnnfyU1Gi73Scw@sparrow.rmq.cloudamqp.com/eptpufqg', (connError, connection) =>{
        if(connError){
            console.error('[AMQP]', connError.message);
            throw connError
        }
        // Create Channel
        connection.createChannel((channelError, channel) =>{
            if(channelError){
                throw channelError
            }
            // Assert Queue
            const QUEUE = 'r-service'
            channel.assertQueue(QUEUE)
            //Receive Messages
            channel.consume(QUEUE, (msg) => {
                console.log(`Message Received: ${msg.content}`);
            }, {
                noAck: true
            })
        })
    })

const startConnection = async() => {
    try {
        await dbConnection("mongodb+srv://leo:mongo123@r-services.ulww9.mongodb.net/INFO?retryWrites=true&w=majority")
        app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        })
    } catch (error) {
        console.log(error);
    }
}

startConnection()
