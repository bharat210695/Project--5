const mongoose = require('mongoose')
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
            res.status(400).send({ status: false, msg: "email and password both is required" })
            return
        }
        if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))) {
            res.status(400).send({ status: false, msg: "email should be valid email address" })
            return
        }
        if (password.length < 8 || password.length > 16) {
            return res.status(400).send({ status: false, msg: "password should be min 8 and max 16" })
        }

        let User = await UserModel.findOne({ email: email })
        if (User) {
            const Passwordmatch = bcrypt.compareSync(data.password, User.password)
            if (Passwordmatch) {
                let iat = Math.floor(Date.now() / 1000)
                let token = jwt.sign({ userId: User._id, exp: iat + (60 * 30) }, "RoomNo-14")
                let details = { userId: User._id, token: token }
                return res.status(200).send({ status: true, msg: "your login is successfully", data: details })
            } else {
                return res.status(404).send({ status: false, msg: "password is not matched" })
            }
        }
        return res.status(404).send({ status: false, msg: "email not found" })

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

            let { fname, lname, email, phone, profileImage, password, address } = Data
            let detailsToBeUpdated = {}

            if (Object.keys(Data).length == 0) {
                return res.status(400).send({ status: false, message: "for update request body can't empty" })
            }
            if (!isValidObjectId(userId)) {
                return res.status(400).send({ status: false, message: "userId is not a valid objectId" })
            }
            if (Data.hasOwnProperty('fname')) {
                if (isValid(fname)) {
                    detailsToBeUpdated['fname'] = fname
                }
            }
            if (Data.hasOwnProperty('lname')) {
                if (isValid(lname)) {
                    detailsToBeUpdated['lname'] = lname
                }
            }
            if (Data.hasOwnProperty('email')) {
                if (isValid(email) && (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))) {
                    let isEmailAlreadyUsed = await UserModel.findOne({ email })
                    if (isEmailAlreadyUsed) {
                        return res.status(400).send({ status: false, message: "this email is already used please enter another email" })
                    } else {
                        detailsToBeUpdated['email'] = email
                    }
                }
            }
            if (Data.hasOwnProperty('phone')) {
                if (isValid(phone) && (/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone))) {
                    let isPhoneAlreadyUsed = await UserModel.findOne({ phone })
                    if (isPhoneAlreadyUsed) {
                        return res.status(400).send({ status: false, mesage: "this phone is already used please use another phone" })
                    } else {
                        detailsToBeUpdated['phone'] = phone
                    }
                }
            }
            if (Data.hasOwnProperty('profileImage')) {
                if (files && files.length > 0) {
                    let profilePic = await uploadFile(files[0])
                    detailsToBeUpdated['profileImage'] = profilePic
                }
            }
            if (Data.hasOwnProperty('password')) {
                if (isValid(password)) {
                    let hash = bcrypt.hashSync(password, saltRounds)
                    detailsToBeUpdated['password'] = hash
                }
            }
            if (Data.hasOwnProperty("address")) {

                if (address.hasOwnProperty("shipping")) {
                    let shipping = address.shipping

                    let street = address.shipping.street
                    if (shipping.hasOwnProperty("street")) {
                        if (!isValid(street)) {
                            return res.status(400).send({ status: false, message: "please enter valid address of shipping street" })
                        }
                        detailsToBeUpdated["address.shipping.street"] = street
                    }

                    let city = address.shipping.city
                    if (shipping.hasOwnProperty("city")) {
                        if (!isValid(city)) {
                            return res.status(400).send({ status: false, message: "please enter valid address of shipping city" })
                        }
                        detailsToBeUpdated["address.shipping.city"] = city
                    }
                    let pincode = address.shipping.pincode
                    if (shipping.hasOwnProperty("pincode")) {
                        if (pincode.toString().length != 6 || typeof(pincode) != typeof(1)) {
                            return res.status(400).send({ status: false, message: "pincode should be in number and of 6 digits only" })
                        }
                        detailsToBeUpdated["address.shipping.pincode"] = pincode
                    }
                }

                if (address.hasOwnProperty("billing")) {
                    let billing = address.billing

                    let street = address.billing.street
                    if (billing.hasOwnProperty("street")) {
                        if (!isValid(street)) {
                            return res.status(400).send({ status: false, message: "please enter valid address of billing street" })
                        }
                        detailsToBeUpdated["address.billing.street"] = street
                    }

                    let city = address.billing.city
                    if (billing.hasOwnProperty("city")) {
                        if (!isValid(city)) {
                            return res.status(400).send({ status: false, message: "please enter valid address of billing city" })
                        }
                        detailsToBeUpdated["address.billing.city"] = city
                    }

                    let pincode = address.billing.pincode
                    if (billing.hasOwnProperty("pincode")) {
                        if (pincode.toString().length != 6 || typeof(pincode) != typeof(1)) {
                            return res.status(400).send({ status: false, message: "pincode should be in number and of 6 digits only" })
                        }
                        detailsToBeUpdated["address.billing.pincode"] = pincode
                    }
                }

            }

            let userDetailsToBeUpdated = await UserModel.findOneAndUpdate({ _id: userId, isDeleted: false }, detailsToBeUpdated, { new: true })
            if (!userDetailsToBeUpdated) {
                return res.status(404).send({ status: false, message: "user not found with this id" })
            } else {
                return res.status(200).send({ status: true, message: "user details updated successfully", data: userDetailsToBeUpdated })
            }
        } catch (error) {
            console.log("This is the error:", error.message)
            res.status(500).send({ msg: "server error", err: error })
        }
    }
    //===========================================================================================//

module.exports.createUser = createUser
module.exports.loginUser = loginUser
module.exports.getUserDetails = getUserDetails
module.exports.updatedProfile = updatedProfile