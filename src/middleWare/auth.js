const jwt = require('jsonwebtoken')
const UserModel = require('../models/userModel')

const isValidObjectId = function(objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}


// check authentication=============================================//
const authentication = function(req, res, next) {

    try {
        let token = req.headers["x-api-key"]

        if (!token)
            return res.status(401).send({ status: false, msg: "Token not present" })

        let decodedToken = jwt.verify(token, "Bharat")

        if (!decodedToken)
            return res.status(401).send({ status: false, msg: "Token is invalid" })

        // req['authenticateToken'] = token
        next()

    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, msg: error.message })
    }
}

// check authorization===================================================
const authorization = function(req, res, next) {
    try {
        let token = req.headers["x-api-key"]

        if (!token)
            return res.status(401).send({ status: false, msg: "Token not present" })

        let decodedToken = jwt.verify(token, "Bharat")

        if (!decodedToken)
            return res.status(401).send({ status: false, msg: "Token is invalid" })

        let userId = req.query.userId

        if (!isValidObjectId(userId)) {
            res.status(400).send({ status: false, msg: " userID is not a valid ObjectId" })
        }

        if (!userId)
            return res.status(400).send({ status: false, msg: "Please Send User Id" })

        let userLoggedIn = decodedToken.userId

        if (userId !== userLoggedIn) {

            res.status(403).send({ status: false, msg: "User is not Allowed access the request" })
        }
        next()

    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, msg: error.message })
    }

}



module.exports.authorization = authorization
module.exports.authentication = authentication