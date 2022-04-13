const { default: mongoose } = require('mongoose')
const UserModel = require('../models/userModel')
const ObjectId = mongoose.Types.ObjectId
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const saltRounds = 10;
const aws = require('aws-sdk')
    //======================================================================================//
const isValid = function(value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    if (typeof value === 'number' && value.toString().trim().length === 0) return false
    return true;
}
const isValidObjectId = function(ObjectId) {
        return mongoose.Types.ObjectId.isValid(ObjectId)
    }
    //========================================================================================//

aws.config.update({
    accessKeyId: "AKIAY3L35MCRVFM24Q7U",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile = async(file) => {
    return new Promise(async function(resolve, reject) {
        let s3 = new aws.S3({ apiVersion: "2006-03-01" })
        var uploadParams = {
            ACL: "public-read",
            Bucket: "classroom-training-bucket",
            Key: "bharat/" + file.originalname,
            Body: file.buffer
        }

        s3.upload(uploadParams, function(err, data) {
            if (err) {
                return reject({ "error": err })
            }
            return resolve(data.Location)
        })
    })
}


// 1. create user document===============================================================================================//
const createUser = async function(req, res) {

    try {
        let data = req.body.data
        let Data = JSON.parse(data)
        let files = req.files
        let { fname, lname, email, profileImage, phone, password, address, } = Data

        if (Object.keys(Data).length == 0) {
            return res.status(400).send({ status: false, message: "request body is empty ,BAD REQUEST" })
        }
        if (!isValid(fname)) {
            return res.status(400).send({ status: false, message: "first name is required" })
        }
        if (!isValid(lname)) {
            return res.status(400).send({ status: false, message: "last name is required" })
        }
        if (!isValid(email)) {
            return res.status(400).send({ status: false, message: "email id is required" })
        }
        if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))) {
            return res.status(400).send({ status: false, message: "email Id is not a valid emailId" })
        }
        // if (!isValid(profileImage)) {
        //     return res.status(400).send({ status: false, message: "Profile photo is required" })
        // }
        if (!files || (files && files.length === 0)) {
            return res.status(400).send({ status: false, msg: "profileImage is required" })
        }

        if (!isValid(phone)) {
            return res.status(400).send({ status: false, message: "phone is required" })
        }
        if (!(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone))) {
            return res.status(400).send({ status: false, message: "phone no. is not a valid phone no." })
        }
        if (!isValid(password)) {
            return res.status(400).send({ status: false, message: "password is required" })
        }
        if (password.length < 8 || password.length > 16) {
            return res.status(400).send({ status: false, message: "password should be in between minLen 8, maxLen 15" })
        }

        if (!isValid(address)) {
            return res.status(400).send({ status: false, message: "address is required" })
        }
        if (address.shipping) {
            if (!isValid(address.shipping.street)) {
                return res.status(400).send({ status: false, message: "shipping street name is required" })
            }
            if (!isValid(address.shipping.city)) {
                return res.status(400).send({ status: false, message: "shipping city name is required" })
            }
            if (!isValid(address.shipping.pincode)) {
                return res.status(400).send({ status: false, message: "shipping pincode is required" })
            }
        }

        if (address.billing) {
            if (!isValid(address.billing.street)) {
                return res.status(400).send({ status: false, message: "billing street name is required" })
            }
            if (!isValid(address.billing.city)) {
                return res.status(400).send({ status: false, message: "billing city name is required" })
            }
            if (!isValid(address.billing.pincode)) {
                return res.status(400).send({ status: false, message: "billing pincode is required" })
            }
        }
        isPhoneAlreadyUsed = await UserModel.findOne({ phone })
        if (isPhoneAlreadyUsed) {
            return res.status(400).send({ status: false, msg: " phone no. is already used, please provide another phone no." })
        }
        isEmailAlreadyUsed = await UserModel.findOne({ email })
        if (isEmailAlreadyUsed) {
            return res.status(400).send({ status: false, msg: " emailId is already used, please provide another emailId" })
        }

        const profilePhoto = await uploadFile(files[0])
        const encryptedPass = await bcrypt.hash(password.toString(), saltRounds)

        const newUser = {
            fname: fname,
            lname: lname,
            profileImage: profilePhoto,
            email: email,
            phone: phone,
            password: encryptedPass,
            address: address
        }
        const userCreated = await UserModel.create(newUser)
        return res.status(201).send({ status: true, msg: "user created successfully", data: userCreated })

    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error.message })
    }
}

// 2. allow user to login================================================================//
const loginUser = async function(req, res) {

    try {
        let data = req.body
        let { email, password } = data

        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: false, msg: "request body must contain some valid data" })
        }
        if (!(isValid(email) && isValid(password))) {
            return res.status(400).send({ status: false, msg: "email and password both is required" })
        }
        if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))) {
            return res.status(400).send({ status: false, msg: "email should be valid email address" })
        }
        if (password.length < 8 || password.length > 16) {
            return res.status(400).send({ status: false, msg: "password should be min 8 and max 16" })
        }

        let User = await UserModel.findOne({ email: email })
        if (User) {
            const passwordMatch = bcrypt.compareSync(data.password.toString(), User.password)
            if (passwordMatch) {
                let iat = Math.floor(Date.now() / 1000)
                let token = jwt.sign({ userId: User._id, exp: iat + (60 * 30) }, 'Bharat')
                res.setHeader('x-api-key', token);
                let details = { userId: User._id, token: token }
                return res.status(201).send({ status: true, msg: "your login is successfully", data: details })
            } else {
                return res.status(404).send({ status: false, msg: "password is not matched" })
            }
        }
    } catch (error) {
        console.log("This is the error:", error.message)
        res.status(500).send({ message: "server error", err: error })
    }
}

// 3. get user data===============================================================================//
const getUserDetails = async function(req, res) {
    try {
        let userId = req.params.userId


        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, msg: "userId is not a valid objectId" })
        }

        let userDetails = await UserModel.findOne({ _id: userId })
        if (!userDetails) {
            return res.status(404).send({ status: false, msg: "no user exist with this userId" })
        } else {
            return res.status(200).send({ status: true, msg: "user profile details", data: userDetails })
        }

    } catch (error) {
        console.log("This is the error:", error.message)
        res.status(500).send({ msg: "server error", err: error })
    }
}

// 4. update user profile====================================================================================//
const updatedProfile = async function(req, res) {
        try {
            let data = req.body.data
            let Data = JSON.parse(data)
            let files = req.files
            let userId = req.params.userId
            let { fname, lname, email, profileImage, phone, password, address, } = Data
            let updatedUserData = {}

            if (Object.keys(Data).length == 0) {
                return res.status(400).send({ status: false, message: "body can't be empty, provide valid data for update" })
            }
            if (!isValidObjectId(userId)) {
                return res.status(400).send({ status: false, message: "userId is invalid" })
            }

            if (!isValid(fname)) {
                return res.status(400).send({ status: false, message: "first name is required" })
            }
            if (!isValid(lname)) {
                return res.status(400).send({ status: false, message: "last name is required" })
            }
            if (!isValid(email)) {
                return res.status(400).send({ status: false, message: "email id is required" })
            }
            if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))) {
                return res.status(400).send({ status: false, message: "email Id is not a valid emailId" })
            }
            // if (!isValid(profileImage)) {
            //     return res.status(400).send({ status: false, message: "Profile photo is required" })
            // }
            if (!files || (files && files.length === 0)) {
                return res.status(400).send({ status: false, msg: "profileImage is required" })
            }
            if (!isValid(phone)) {
                return res.status(400).send({ status: false, message: "phone is required" })
            }
            if (!(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone))) {
                return res.status(400).send({ status: false, message: "phone no. is not a valid phone no." })
            }
            if (!isValid(password)) {
                return res.status(400).send({ status: false, message: "password is required" })
            }
            if (password.length < 8 || password.length > 16) {
                return res.status(400).send({ status: false, message: "password should be in between minLen 8, maxLen 15" })
            }
            if (!isValid(address)) {
                return res.status(400).send({ status: false, message: "address is required" })
            }
            if (address.shipping) {
                if (!isValid(address.shipping.street)) {
                    return res.status(400).send({ status: false, message: "shipping street name is required" })
                }
                if (!isValid(address.shipping.city)) {
                    return res.status(400).send({ status: false, message: "shipping city name is required" })
                }
                if (!isValid(address.shipping.pincode)) {
                    return res.status(400).send({ status: false, message: "shipping pincode is required" })
                }
            }

            if (address.billing) {
                if (!isValid(address.billing.street)) {
                    return res.status(400).send({ status: false, message: "billing street name is required" })
                }
                if (!isValid(address.billing.city)) {
                    return res.status(400).send({ status: false, message: "billing city name is required" })
                }
                if (!isValid(address.billing.pincode)) {
                    return res.status(400).send({ status: false, message: "billing pincode is required" })
                }
            }
            isPhoneAlreadyUsed = await UserModel.findOne({ phone })
            if (isPhoneAlreadyUsed) {
                return res.status(400).send({ status: false, msg: " phone no. is already used, please provide another phone no." })
            }
            isEmailAlreadyUsed = await UserModel.findOne({ email })
            if (isEmailAlreadyUsed) {
                return res.status(400).send({ status: false, msg: " emailId is already used, please provide another emailId" })
            }


            const newUser = await UserModel.findOneAndUpdate({ _id: req.params.userId }, updatedUserData, { new: true })
            res.status(200).send({ status: true, message: "User profile updated", data: newUser })


        } catch (error) {
            console.log("This is the error:", error.message)
            res.status(500).send({ message: "server error", err: error })
        }

    }
    //===========================================================================================//

module.exports.createUser = createUser
module.exports.loginUser = loginUser
module.exports.getUserDetails = getUserDetails
module.exports.updatedProfile = updatedProfile