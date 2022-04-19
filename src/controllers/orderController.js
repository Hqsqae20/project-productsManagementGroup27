const cartModel = require("../models/cartModel")
const productModel = require("../models/productModel")
const userModel = require("../models/userModel")
const orderModel = require("../models/orderModel")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")

const isValid = function (value) {
    if (typeof value == undefined || value == null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    if (typeof value === Number && value.trim().length === 0) return false
    return true
  }

const isValidStatus = (input) => ["cancelled", "completed", "pending"].indexOf(input) !== -1


const isValidObjectId = function(ObjectId) {
  return mongoose.Types.ObjectId.isValid(ObjectId)
}

const createOrder = async (req, res) => {
    try{
        const userIdFromParams = req.params.userId
        const userIdFromToken = req.userId
        const data = req.body
        const {productId, quantity, cancellable, status} = data

        if (!isValidObjectId(userIdFromParams)) {
            return res.status(400).send({ status: false, msg: "userId is invalid" });
        }

        const userByuserId = await userModel.findById(userIdFromParams);

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }
        
        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({
              status: false,
              message: "Unauthorized access.",
            });
        }

        if (!isValid(productId)) {
            return res.status(400).send({ status: false, messege: "please provide productId" })
        }

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }

        const findProduct = await productModel.findById(productId);
        
        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product not found.' });
        }

        if(findProduct.isDeleted == true){
            return res.status(400).send({ status:false, msg: "product is deleted" });
        }

        if (!isValid(quantity)) {
            return res.status(400).send({ status: false, messege: "please provide quantity" })
        }

        if ((isNaN(Number(quantity)))) {
            return res.status(400).send({status:false, message: 'quantity should be a valid number' })         //price should be valid number
        }

        if (quantity <= 0) {
            return res.status(400).send({status:false, message: 'quantity can not be less than or equal to zero' })    //price should be valid number
        }

        const findUserCart = await cartModel.findOne({userId : userIdFromParams});

        if(!findUserCart){
            return res.status(404).send({status:false, message:"user's cart not found."})
        }

        if(findUserCart.items.length === 0){
            return res.status(400).send({status:false, message:"User cart is empty."})
        }

        const findProductInCart = await cartModel.findOne({ items: { $elemMatch: { productId: productId } } });
       
        if (!findProductInCart) {
            return res.status(404).send({ status: false, message: 'product not found in the cart.' });
        }

        if(cancellable){
            if((cancellable != true) && (cancellable != false)){
                return res.status(400).send({status:false, message:"cancellable should be a valid boolean value."})
            }
        }

        if(!isValid(status)){
            return res.status(400).send({status:false, message:"valid status is required. [completed, pending, cancelled]"})
        }

        const isOrderPlaceEarlier = await orderModel.findOne({userId : userIdFromParams});

        if(!isOrderPlaceEarlier){
            const newOrder = {
                userId : userIdFromParams,
                items : [{
                    productId : productId,
                    quantity : quantity
                }],
                totalPrice : (findProduct.price)*quantity,
                totalItems : 1,
                totalQuantity : quantity,
                cancellable : cancellable,
                status : status
            }
            const saveOrder= await orderModel.create(newOrder)
            return res.status(201).send({status:true, message:"Order saved successfully", data:saveOrder})
        }

        if(isOrderPlaceEarlier){
            const items = isOrderPlaceEarlier.items
            const newTotalPrice = (isOrderPlaceEarlier.totalPrice) + ((findProduct.price)*quantity)
            let countTotalQuantity = 0
            let flag = 0
            
            for(let i=0; i<items.length; i++){
                countTotalQuantity += items[i].quantity
            }

            for(let i=0; i<items.length; i++){
                if(items[i].productId.toString() === productId){
                    console.log("productIds are similar")
                    items[i].quantity += quantity
                    var newOrderData = {
                        items : items,
                        totalPrice : newTotalPrice,
                        totalItems : items.length,
                        totalQuantity : (countTotalQuantity+quantity),
                        cancellable : cancellable,
                        status : status
                    }
                    flag = 1
                    const saveData = await orderModel.findOneAndUpdate(
                        {userId : userIdFromParams},
                        newOrderData, {new:true})
                    return res.status(201).send({status:true, 
                        message:"Order added successfully", data:saveData})
                }
            }

            if(flag === 0){
                console.log("productIds are not similar")
                let addItems = {
                    productId : productId,
                    quantity : quantity
                 }
                const saveData = await orderModel.findOneAndUpdate(
                {userId : userIdFromParams},
                {$addToSet : {items : addItems}, $inc :
                {totalItems : 1, totalPrice: ((findProduct.price)*quantity), totalQuantity:quantity}},
                {new:true, upsert:true})
                return res.status(201).send({status:true, message:"order added successfully", data:saveData})
            }
        }
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}


//------------------------------- update order ----------------------------------------------------------------------


const updateOrder = async (req, res) => {
    try{
        const userIdFromParams = req.params.userId
        const userIdFromToken = req.userId
        const data = req.body
        const {orderId, status} = data

        if (!isValidObjectId(userIdFromParams)) {
            return res.status(400).send({ status: false, msg: "userId is invalid" });
        }

        const userByuserId = await userModel.findById(userIdFromParams);

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }
        
        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({
              status: false,
              message: "Unauthorized access.",
            });
        }

        if (!isValid(orderId)) {
            return res.status(400).send({ status: false, messege: "please provide OrderId" })
        }

        if (!isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, msg: "OrderId is invalid" });
        }

        const findOrder = await orderModel.findById(orderId);
        
        if (!findOrder) {
            return res.status(400).send({ status: false, message: 'Order Id not found.' });
        }

        if (findOrder.totalPrice === 0) {
            return res.status(404).send({ status: false, message: 'No order has been placed' });
        }

        if(!isValidStatus(status)){
            return res.status(400).send({status:false, message:"valid status is required. [completed, pending, cancelled]"})
        }

        if(status === 'cancelled'){
            if(findOrder.cancellable == false){
                return res.status(400).send({status:false, message:"Item can not be cancelled, because it is not cancellable."})
            }

            await orderModel.findOneAndUpdate(
                { userId: userIdFromParams },
                {$set: {
                    items: [],
                    totalPrice: 0,
                    totalItems: 0,
                    totalQuantity : 0
                }
            })
            const findOrderAfterDeletion = await orderModel.findOne({ userId: userIdFromParams })
            
            return res.status(200).send({status: true,
                message: "order cancelled successfully", data:findOrderAfterDeletion})
        }

        const updateOrder = await orderModel.findOneAndUpdate(
            { userId: userIdFromParams },
            {$set: { status: status }},
            {new:true})

            return res.status(200).send({status: true,
                message: "order status updates successfully", data:updateOrder})
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = { createOrder, updateOrder }
