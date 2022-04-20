const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController')
const AuthMiddleWare = require('../middleWare/auth')
const ProductController = require('../controllers/productController')
const CartController = require('../controllers/cartController');
const OrderController = require('../controllers/orderController')



// test-api
router.get('/test', function(req, res) {
    res.status(200).send({ status: true, message: "test api working fine" })
})


// User APIs==============================================================================//
router.post('/register', UserController.createUser)
router.post('/login', UserController.loginUser)
router.get('/user/:userId/profile', AuthMiddleWare.authentication, AuthMiddleWare.authorization, UserController.getUserDetails)
router.put('/user/:userId/profile', AuthMiddleWare.authentication, AuthMiddleWare.authorization, UserController.updatedProfile)

// Product APIs================================================================================//
router.post('/products', ProductController.createProduct)
router.get('/products', ProductController.getProduct)
router.get('/products/:productId', ProductController.getProductById)
router.put('/products/:productId', ProductController.updatedProduct)
router.delete('/products/:productId', ProductController.deletedProduct)

// Cart APIs===================================================================================//
router.post('/users/:userId/cart', AuthMiddleWare.authentication, AuthMiddleWare.authorization, CartController.createCart) /
    router.put('/users/:userId/cart', AuthMiddleWare.authentication, AuthMiddleWare.authorization, CartController.updateCart)
router.get('/users/:userId/cart', AuthMiddleWare.authentication, AuthMiddleWare.authorization, CartController.getCart)
router.delete('/users/:userId/cart', AuthMiddleWare.authentication, AuthMiddleWare.authorization, CartController.deleteCart)

// Orders APIs==============================================================================//
router.post('/users/:userId/orders', AuthMiddleWare.authentication, AuthMiddleWare.authorization, OrderController.createOrder)
router.put('/users/:userId/orders', AuthMiddleWare.authentication, AuthMiddleWare.authorization, OrderController.updateOrder)


module.exports = router;