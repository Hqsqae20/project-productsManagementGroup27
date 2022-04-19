const express = require('express');
const router = express.Router();
const userController=require("../controllers/userController")
const productController=require("../controllers/productController")
const cartController=require("../controllers/cartController")
const orderController=require("../controllers/orderController")
const auth=require("../middleware/auth.js")


//******************* User APIs ******************************************
router.post("/register",userController.createUser)

router.post("/login",userController.login)

router.get("/user/:userId/profile",auth.userAuth,userController.getUser)

router.put("/user/:userId/profile",auth.userAuth,userController.updateUser)


//********************* Product APIs *************************************

router.post("/products",productController.createProduct)

router.get("/products",productController.getProduct)

router.get("/products/:productId",productController.getProductbyId)

router.put("/products/:productId",productController.updateProduct)

router.delete("/products/:productId",productController.deleteProduct)

//************************* Cart APIs *************************************

router.post("/users/:userId/cart",auth.userAuth,cartController.createCart)

router.get("/users/:userId/cart",auth.userAuth,cartController.getCart)

router.put("/users/:userId/cart",auth.userAuth,cartController.updateCart)

router.delete("/users/:userId/cart",auth.userAuth,cartController.deleteCart)

//******************************** Order APIs ****************************

router.post("/users/:userId/orders",auth.userAuth,orderController.createOrder)

router.put("/users/:userId/orders",auth.userAuth,orderController.updateOrder)

module.exports = router;