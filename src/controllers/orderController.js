
const CartModel = require("../models/cartModel");
const OrderModel = require("../models/orderModel");
const ProductModel = require("../models/productModel");
const UserModel = require("../models/userModel");
const jwt = require("jsonwebtoken")

const isValidObjId=/^[0-9a-fA-F]{24}$/

const isValid = function (value) {
  if (typeof value === "undefined" || typeof value === "null") {
    return false;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return true;
  }
};

const isValidRequestBody = function(object){
  return Object.keys(object).length > 0
  }



const createOrder = async(req, res) => {
    try {
        const userId = req.params.userId;
        const requestBody = req.body;

        //validation for request body
        if (!isValidRequestBody(requestBody)) {
            return res
                .status(400)
                .send({
                    status: false,
                    message: "Invalid request body. Please provide the the input to proceed.",
                });
        }
        //Extract parameters
        const { cartId, cancellable, status } = requestBody;

        //validating userId
        if (!isValidObjId.test(userId)) {
            return res
                .status(400)
                .send({ status: false, message: "Invalid userId in params." });
        }

        const searchUser = await UserModel.findOne({ _id: userId });
        if (!searchUser) {
            return res.status(400).send({
                status: false,
                message: `user doesn't exists for ${userId}`,
            });
        }
        //Authentication & authorization
        if (searchUser._id.toString() != req.userId) {
            res.status(401).send({ status: false, message: `Unauthorized access! User's info doesn't match` });
            return
        }

        if (!cartId) {
            return res.status(400).send({
                status: false,
                message: `Cart doesn't exists for ${userId}`,
            });
        }
        if (!isValidObjId.test(cartId)) {
            return res.status(400).send({
                status: false,
                message: `Invalid cartId in request body.`,
            });
        }

        //searching cart to match the cart by userId whose is to be ordered.
        const searchCartDetails = await CartModel.findOne({
            _id: cartId,
            userId: userId,
        });
        if (!searchCartDetails) {
            return res.status(400).send({
                status: false,
                message: `Cart doesn't belongs to ${userId}`,
            });
        }

        //must be a boolean value.
        if (cancellable) {
            if (typeof cancellable != "boolean") {
                return res.status(400).send({
                    status: false,
                    message: `Cancellable must be either 'true' or 'false'.`,
                });
            }
        }

        // must be either - pending , completed or cancelled.
        if (status) {
          if(!["pending", "completed", "cancelled"].includes(status)){
            return res.status(400).send({status : false, message : "status should be from [pending, completed, cancelled]"})
          }
        }

        //verifying whether the cart is having any products or not.
        if (!searchCartDetails.items.length) {
            return res.status(202).send({
                status: false,
                message: `Order already placed for this cart. Please add some products in cart to make an order.`,
            });
        }

        //adding quantity of every products
        const reducer = (previousValue, currentValue) =>
            previousValue + currentValue;

        let totalQuantity = searchCartDetails.items
            .map((x) => x.quantity)
            .reduce(reducer);

        //object destructuring for response body.
        const orderDetails = {
            userId: userId,
            items: searchCartDetails.items,
            totalPrice: searchCartDetails.totalPrice,
            totalItems: searchCartDetails.totalItems,
            totalQuantity: totalQuantity,
            cancellable,
            status,
        };
        const savedOrder = await OrderModel.create(orderDetails);

        //Empty the cart after the successfull order
        await CartModel.findOneAndUpdate({ _id: cartId, userId: userId }, {
            $set: {
                items: [],
                totalPrice: 0,
                totalItems: 0,
            },
        });
        return res
            .status(200)
            .send({ status: true, message: "Order placed.", data: savedOrder });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};




//updating order status.
const updateOrder = async(req, res) => {
    try {
        const userId = req.params.userId;
        const requestBody = req.body;

        //validating request body.
        if (!isValidRequestBody(requestBody)) {
            return res
                .status(400)
                .send({
                    status: false,
                    message: "Invalid request body. Please provide the the input to proceed.",
                });
        }
        //extract params
        const { orderId, status } = requestBody;
        if (!isValidObjId.test(userId)) {
            return res
                .status(400)
                .send({ status: false, message: "Invalid userId in params." });
        }
        const searchUser = await UserModel.findOne({ _id: userId });
        if (!searchUser) {
            return res.status(400).send({
                status: false,
                message: `user doesn't exists for ${userId}`,
            });
        }

        //Authentication & authorization
        if (searchUser._id.toString() != req.userId) {
            res.status(401).send({ status: false, message: `Unauthorized access! User's info doesn't match` });
            return
        }

        if (!orderId) {
            return res.status(400).send({
                status: false,
                message: `Order doesn't exists for ${orderId}`,
            });
        }

        //verifying does the order belongs to user or not.
        isOrderBelongsToUser = await OrderModel.findOne({ userId: userId });
        if (!isOrderBelongsToUser) {
            return res.status(400).send({
                status: false,
                message: `Order doesn't belongs to ${userId}`,
            });
        }

        if (!status) {
            return res
                .status(400)
                .send({
                    status: true,
                    message: "Mandatory paramaters not provided. Please enter current status of the order."
                });
        }
        if (status) {
          if(!["pending", "completed", "cancelled"].includes(status)){
            return res.status(400).send({status : false, message : "status should be from [pending, completed, cancelled]"})
          }
        }

        //if cancellable is true then status can be updated to any of te choices.
        if (isOrderBelongsToUser["cancellable"] == true) {
          if(!["pending", "completed", "cancelled"].includes(status)){
                if (isOrderBelongsToUser['status'] == 'pending') {
                    const updateStatus = await OrderModel.findOneAndUpdate({ _id: orderId }, {
                        $set: { status: status }
                    }, { new: true })
                    return res.status(200).send({ status: true, message: `Successfully updated the order details.`, data: updateStatus })
                }

                //if order is in completed status then nothing can be changed/updated.
                if (isOrderBelongsToUser['status'] == 'completed') {
                    return res.status(400).send({ status: false, message: `Unable to update or change the status, because it's already in completed status.` })
                }

                //if order is already in cancelled status then nothing can be changed/updated.
                if (isOrderBelongsToUser['status'] == 'cancelled') {
                    return res.status(400).send({ status: false, message: `Unable to update or change the status, because it's already in cancelled status.` })
                }
            }
        }
        //for cancellable : false
        if (isOrderBelongsToUser['status'] == "completed") {
            if (status) {
                return res.status(400).send({ status: true, message: `Cannot update or change the status, because it's already in completed status.` })
            }
        }

        if (isOrderBelongsToUser['status'] == "cancelled") {
            if (status) {
                return res.status(400).send({ status: true, message: `Cannot update or change the status, because it's already in cancelled status.` })
            }
        }

        if (isOrderBelongsToUser['status'] == "pending") {
            // if (status) {
            //     if (["completed", "cancelled"].indexOf(status) === -1) {
            //         return res.status(400).send({
            //             status: false,
            //             message: `Unable to update status due to Non-cancellation policy.`
            //         })
            //     }

                // if ((status === 'pending' || status === 'completed' || status === 'cancelled')) {
                const updatedOrderDetails = await OrderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true })

                return res.status(200).send({ status: true, message: `Successfully updated the order details.`, data: updatedOrderDetails })
                    // }
                    // return res.status(400).send({ status: true, message: `Status must be either- 'pending','completed' & 'cancelled'.` })
            // }
        }

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

module.exports = {createOrder,updateOrder}


