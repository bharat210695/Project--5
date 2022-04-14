const { default: mongoose } = require('mongoose')
const ProductModel = require('../models/productModel')
const ObjectId = mongoose.Types.ObjectId
const bcrypt = require('bcrypt');
const saltRounds = 10;
const aws = require('aws-sdk')
const validator = require('validator')

const isValid = function(value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    if (typeof value === 'number' && value.toString().trim().length === 0) return false
    return true;
}

const isValidObjectId = function(ObjectId) {
        return mongoose.Types.ObjectId.isValid(ObjectId)
    }
    //=====================================================================//
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

// 5. create product document=====================================//
const createProduct = async function(req, res) {
    try {
        let data = req.body.data
        let Data = JSON.parse(data)
        let files = req.files
        let { title, description, price, currencyId, currencyFormat, isFreeShipping, productImage, style, availableSizes, installments, isDeleted } = Data

        if (Object.keys(Data).length == 0) {
            return res.status(400).send({ status: false, message: "request body is empty ,BAD REQUEST" })
        }
        if (!isValid(title)) {
            return res.status(400).send({ status: false, message: "title is required" })
        }
        if (!isValid(description)) {
            return res.status(400).send({ status: false, message: "description is required" })
        }
        if (!isValid(price)) {
            return res.status(400).send({ status: false, message: "price is required" })
        }
        if (!isValid(currencyId)) {
            return res.status(400).send({ status: false, message: "currencyId is required" })
        }
        if (currencyId != 'INR') {
            return res.status(400).send({ status: false, Message: "currency should be INR" })
        }
        if (!isValid(currencyFormat)) {
            return res.status(400).send({ status: false, message: "currencyFormat is required" })
        }
        if (currencyFormat != "₹") {
            return res.status(400).send({ status: false, Message: "currencyFormat should be ₹ " })
        }
        if (!isValid(isFreeShipping)) {
            return res.status(400).send({ status: false, message: "isFreeShipping is required" })
        }
        if (!files || (files && files.length === 0)) {
            return res.status(400).send({ status: false, msg: "productImage is required" })
        }
        if (!isValid(style)) {
            return res.status(400).send({ status: false, message: "style is required" })
        }
        if (!isValid(availableSizes)) {
            return res.status(400).send({ status: false, message: "last name is required" })
        }
        for (let i = 0; i < availableSizes.length; i++) {
            availableSizesNewArray.push(availableSizes[i].toUpperCase())
            if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(availableSizes[i]))) {
                return res.status(400).send({ status: false, message: `please provide available size from  ${["S", "XS", "M", "X", "L", "XXL", "XL"]}` })
            }

        }


        if (!isValid(installments)) {
            return res.status(400).send({ status: false, message: "installment is required" })
        }

        isTitleAlreadyUsed = await ProductModel.findOne({ title: title });
        if (isTitleAlreadyUsed) {
            return res.status(400).send({ status: false, message: `${title} title  is already exist` })
        }

        const productPhoto = await uploadFile(files[0])

        const product = {
            title: title,
            description: description,
            price: price,
            currencyId: currencyId,
            currencyFormat: currencyFormat,
            isFreeShipping: isFreeShipping,
            productImage: productPhoto,
            style: style,
            availableSizes: availableSizes,
            installments: installments
        }

        const newProduct = await ProductModel.create(product)
        return res.status(201).send({ status: true, message: "product created successfully", data: newProduct })

    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error.message })
    }
}

// 6. Returns all products =========================================//
const getProduct = async function(req, res) {
    try {
        const filterQuery = { isDeleted: false }
        const queryParams = req.query;

        const { size, name, priceGreaterThan, priceLessThan, priceSort } = queryParams;

        if (isValid(size)) {
            filterQuery['availableSizes'] = size
        }
        if (isValid(name)) {
            filterQuery['title'] = {}
            filterQuery['title']['$regex'] = name
            filterQuery['title']['$options'] = '$i'
        }
        if (isValid(priceGreaterThan)) {

            if (!(!isNaN(Number(priceGreaterThan)))) {
                return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
            }
            if (priceGreaterThan <= 0) {
                return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
            }
            if (!Object.prototype.hasOwnProperty.call(filterQuery, 'price'))
                filterQuery['price'] = {}
            filterQuery['price']['$gte'] = Number(priceGreaterThan)
            console.log(typeof Number(priceGreaterThan))
        }
        if (isValid(priceLessThan)) {

            if (!(!isNaN(Number(priceLessThan)))) {
                return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
            }
            if (priceLessThan <= 0) {
                return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
            }
            if (!Object.prototype.hasOwnProperty.call(filterQuery, 'price'))
                filterQuery['price'] = {}
            filterQuery['price']['$lte'] = Number(priceLessThan)
            console.log(typeof Number(priceLessThan))
        }
        if (isValid(priceSort)) {

            if (!((priceSort == 1) || (priceSort == -1))) {
                return res.status(400).send({ status: false, message: `priceSort should be 1 or -1 ` })
            }
            const products = await ProductModel.find(filterQuery).sort({ price: priceSort })

            if (Array.isArray(products) && products.length === 0) {
                return res.status(404).send({ status: false, message: 'No Product found' })
            }
            return res.status(200).send({ status: true, message: 'Product list', data: products })
        }
        const products = await ProductModel.find(filterQuery)

        if (Array.isArray(products) && products.length === 0) {
            return res.status(404).send({ status: false, message: 'No Product found' })
        }

        return res.status(200).send({ status: true, message: 'Product list', data: products })
    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error.message })
    }
}

// 7. Returns product details by product id==============================================//
const getProductById = async function(req, res) {
    try {
        let productId = req.params.productId
        const product = await ProductModel.findOne({ _id: productId, isDeleted: false })
        if (!product) {
            return res.status(400).send({ status: false, message: 'product does not exist with this Id' })
        }
        res.status(200).send({ status: true, message: 'success', data: product })

    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error.message })
    }
}

// 8. Updates a product========================================================================//
const updatedProduct = async function(req, res) {
    try {
        const data = JSON.parse(req.body.data);
        const productId = req.params.productId
        const product = await ProductModel.findOne({ _id: productId, isDeleted: false })
        if (!product) {
            return res.status(404).send({ status: false, message: 'please provide valid product id ' })
        }
        const { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = data;
        const newProduct = {}
        const files = req.files

        if (!files || (files && files.length === 0)) {
            return res.status(400).send({ status: false, msg: "productImage is required" })
        }
        const productPhoto = await uploadFile(files[0])
        newProduct.productImage = productPhoto


        if (isValid(title)) {
            const isTitleAlreadyUsed = await ProductModel.findOne({ title: title });
            if (isTitleAlreadyUsed) {
                return res.status(400).send({ status: false, msg: `${title} already exist ` })
            }
            newProduct.title = title
        }
        if (isValid(description)) {
            newProduct.description = description
        }
        if (isValid(price)) {
            newProduct.price = price
        }
        if (isValid(currencyId)) {
            newProduct.currencyId = currencyId
        }
        if (isValid(currencyFormat)) {
            newProduct.currencyFormat = currencyFormat
        }
        if (isValid(isFreeShipping)) {
            newProduct.isFreeShipping = isFreeShipping
        }
        if (isValid(style)) {
            newProduct.style = style
        }
        if (isValid(availableSizes)) {
            if (availableSizes.length === 0) {
                return res.status(400).send({ status: false, message: "provide product size" })
            }
            let array = []
            for (let i = 0; i < availableSizes.length; i++) {
                array.push(availableSizes[i].toUpperCase())
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))) {
                    return res.status(400).send({ status: false, message: `please provide available size from  ${["S", "XS", "M", "X", "L", "XXL", "XL"]}` })
                }
            }
            newProduct.availableSizes = availableSizes
        }

        if (isValid(installments)) {
            newProduct.installments = installments
        }
        const newUpdateProduct = await ProductModel.findOneAndUpdate({ _id: productId }, newProduct, { new: true })
        return res.status(200).send({ status: true, message: 'Success', data: newUpdateProduct });

    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error.message })
    }
}

// 9. Deletes a product by product id==========================================================//
const deletedProduct = async function(req, res) {
    try {
        let productId = req.params.productId
        const product = await ProductModel.findOne({
            _id: productId,
            isDeleted: false
        })
        if (!product) {
            return res.status(400).send({ status: false, message: "product does not exist with this Id" })
        }
        const deleted = await ProductModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { isDeleted: true, deletedAt: new Date() }, { new: true })
        res.status(200).send({ status: true, message: 'successfully deleted', data: deleted })
    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error.message })
    }
}

//=============================================================================================//
module.exports = {
    createProduct,
    getProduct,
    getProductById,
    updatedProduct,
    deletedProduct
}