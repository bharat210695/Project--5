const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController')
const AuthMiddleWare = require('../middleWare/auth')
const ProductController = require('../controllers/productController')


// test-api
router.get('/test', function(req, res) {
    res.status(200).send({ status: true, message: "test api working fine" })
})


// User APIs
router.post('/register', UserController.createUser)
router.post('/login', UserController.loginUser)
router.get('/user/:userId/profile', AuthMiddleWare.authentication, UserController.getUserDetails)
router.put('/user/:userId/profile', AuthMiddleWare.authentication, UserController.updatedProfile)

// Product APIs
router.post('/products', ProductController.createProduct)
router.get('/products', ProductController.getProduct)
router.get('/products/:productId', ProductController.getProductById)
router.put('/products/:productId', ProductController.updatedProduct)
router.delete('/products/:productId', ProductController.deletedProduct)

module.exports = router;