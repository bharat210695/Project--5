const mongoose = require('mongoose')
const OrderModel = require('../models/orderModel')
const ProductModel = require('../models/productModel')
const CartModel = require('../models/cartModel')
const UserModel = require('../models/userModel')
const ObjectId = mongoose.Types.ObjectId

const isValid = function(value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    if (typeof value === 'number' && value.toString().trim().length === 0) return false
    return true;
}

const isValidObjectId = function(ObjectId) {
    return mongoose.Types.ObjectId.isValid(ObjectId)
}


//14.Create an order for the user=======================================================================//
const createOrder = async function(req, res) {
    try {
        let data = req.body
        let userId = req.params.userId

        let { cartId } = data

        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: false, message: "req body can't be empty" })
        }
        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "userId is not a valid objectId" })
        }
        if (!isValid(cartId)) {
            return res.status(400).send({ status: false, message: "cardId is required" })
        }
        if (!isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: "cartId is not a valid objectId" })
        }

        let userDetails = await UserModel.findOne({ _id: userId })
        if (!userDetails) {
            return res.status(400).send({ status: false, message: "user not exist with this userId" })
        }

        let cartDetails = await CartModel.findOne({ _id: cartId })
        if (!cartDetails) {
            return res.status(400).send({ status: false, message: "please create cart first to place order" })
        }
        let totalQuantity = 0
        for (let i = 0; i < cartDetails.items.length; i++) {
            totalQuantity += cartDetails.items[i].quantity
        }

        let orderToBePlaced = {
            userId: userId,
            items: cartDetails.items,
            totalPrice: cartDetails.totalPrice,
            totalItems: cartDetails.totalItems,
            totalQuantity: totalQuantity
        }
        let order = await OrderModel.create(orderToBePlaced)
        return res.status(201).send({ status: true, message: "order placed successfully", data: order })


    } catch (error) {
        console.log(error)
        res.status(500).send({ message: error.message })
    }
}

// 15. Updates an order status===========================================================================//
const updateOrder = async function(req, res) {
    try {
        let userId = req.params.userId
        let data = req.body

        let { orderId, status } = data

        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: false, message: "req body can't be empty" })
        }
        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "userId is not a valid objectId" })
        }
        if (!isValid(orderId)) {
            return res.status(400).send({ status: false, message: "orderId is required" })
        }
        if (!isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: "orderId is not a valid objectId" })
        }
        if (!isValid(status)) {
            return res.status(400).send({ status: false, message: "status is required" })
        }
        if (status != "canceled") {
            return res.status(400).send({ status: false, message: "you can only update your cancellation status" })
        }

        let userDetails = await UserModel.findOne({ _id: userId })
        if (!userDetails) {
            return res.status(404).send({ status: false, message: "user not exist for this userId" })
        }

        let orderDetails = await OrderModel.findOne({ _id: orderId, isDeleted: false })
        if (!orderDetails) {
            return res.status(400).send({ status: false, message: "no order exist with this orderId" })
        }
        if (orderDetails.cancellable != true) {
            return res.status(400).send({ status: false, message: "this item can't be cancelled as it is not cancellable" })
        }
        if (orderDetails.status == 'completed') {
            return res.status(400).send({ status: false, message: "your order has been completed so can't be cancelled" })
        }

        let updatedOrderDetails = await OrderModel.findOneAndUpdate({ _id: orderId, isDeleted: false, cancellable: true, status: "pending" }, { $set: { status: status } }, { new: true })
        if (updatedOrderDetails) {
            return res.status(200).send({ status: true, message: "your order has been cancelled", data: updatedOrderDetails })
        } else {
            return res.status(400).send({ status: false, message: "your order is already cancelled" })
        }

    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: error.message })
    }
}



module.exports.createOrder = createOrder
module.exports.updateOrder = updateOrder