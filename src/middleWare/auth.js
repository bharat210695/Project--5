const jwt = require('jsonwebtoken')
const UserModel = require('../models/userModel')
const mongoose = require('mongoose')

const isValidObjectId = function(objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}


// check authentication=============================================//
const authentication = function(req, res, next) {
    try {
        let token = req.header('Authorization')
        if (!token) {
            res.status(401).send({ status: false, msg: " token is required" })
        }
        let newToken = token.split(' ')[1]
        let decodedToken = jwt.verify(newToken, "RoomNo-14", { ignoreExpiration: true })
        if (!decodedToken) {
            return res.status(401).send({ status: false, msg: "token is invalid" })
        }
        let timeToExpire = Math.floor(Date.now() / 1000)
        if (decodedToken.exp < timeToExpire) {
            return res.status(401).send({ status: false, msg: "token is expired please login again" })
        }

        next()
    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error })
    }
}


let authorization = async function(req, res, next) {
    try {
        let userId = req.params.userId

        if (!isValidObjectId(userId)) {
            res.status(400).send({ status: false, msg: " bookId is not a valid ObjectId" })
        }
        let token = req.header("Authorization").split(' ')[1]
        let decodedToken = jwt.verify(token, "RoomNo-14")
        let userDetails = await UserModel.findOne({ _id: userId })
        if (!userDetails) {
            return res.status(404).send({ status: false, msg: "id not found" })
        }
        if (decodedToken.userId != userDetails._id) {
            return res.status(403).send({ status: false, msg: "you are not authorized" })
        }
        next()
    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error })
    }
}



module.exports.authorization = authorization
module.exports.authentication = authentication