const cartModel = require("../models/cartModel")
const productModel = require("../models/productModel")
const userModel = require("../models/userModel")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const isValid = function (value) {
    if (typeof value == undefined || value == null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    if (typeof value === Number && value.trim().length === 0) return false
    return true
  }

const isValidObjId=/^[0-9a-fA-F]{24}$/

const isValidObjectId = function(ObjectId) {
  return mongoose.Types.ObjectId.isValid(ObjectId)
}


const createCart = async(req, res)=>{
  try {
      const data=req.body
      const userIdbyParams=req.params.userId
      let {userId, productId, cartId} = data

      // if (!isValidObjId.test(userId)) {
      //     return res
      //       .status(400)
      //       .send({ status: false, message: "please provide valid UserId" });
      //   }
      if (!isValid(userId)) {
          res.status(400).send({ status: false, message: 'please provide userId' })
          return
        }

        const userByuserId = await userModel.findById(userIdbyParams);

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }

      if(userIdbyParams!==data.userId){
            res.status(400).send({status:false, message:"Plz Provide Similar UserId's in params and body"})
            return  
       }


      const isProductPresent=await productModel.findOne({_id:productId, isDeleted:false})

      if(!isProductPresent){
          return res.status(404).send({status: false, message: `Product not found by this productId ${productId}`})
      }

      if (data.hasOwnProperty("cartId")) {
          
          if (!isValid(cartId)) {
            return res.status(400).send({ status: false, message: "cartId could not be blank" });
          }

          if (!isValidObjId.test(cartId)) {
              return res.status(400).send({ status: false, message: "cartId  is not valid" });
            }

          const isCartIdPresent = await cartModel.findById(cartId);

          if (!isCartIdPresent) {
              return res.status(404).send({ status: false, message: `Cart not found by this cartId ${cartId}` });
          }

          const cartIdForUser = await cartModel.findOne({ userId: userId });

          if (!cartIdForUser) {
            return res.status(403).send({
              status: false,
              message: `User is not allowed to update this cart`,
            });
          }

          if (cartId !== cartIdForUser._id.toString()) {
              return res.status(403).send({
                status: false,
                message: `User is not allowed to update this cart`,
              });
            }

          const isProductPresentInCart = isCartIdPresent.items.map(
          (product) => (product["productId"] = product["productId"].toString()));

          if (isProductPresentInCart.includes(productId)) {
        
          const updateExistingProductQuantity = await cartModel.findOneAndUpdate({ _id: cartId, "items.productId":productId},
                  {
                    $inc: {totalPrice: +isProductPresent.price,"items.$.quantity": +1,},}, { new: true });

          return res.status(200).send({ status: true, message: "Product quantity updated to cart",data: updateExistingProductQuantity,
                });
              }

          const addNewProductInItems = await cartModel.findOneAndUpdate(
                  { _id: cartId },
                  {
                    $addToSet: { items: { productId: productId, quantity: 1 } },
                    $inc: { totalItems: +1, totalPrice: +isProductPresent.price },
                  },
                  { new: true }
              );

              return res.status(200).send({status: true, message: "Item updated to cart", data: addNewProductInItems,});

      }
      else{
          const isCartPresentForUser = await cartModel.findOne({ userId: userId });

          if (isCartPresentForUser) {
            return res.status(400).send({status: false, message: "cart already exist, provide cartId in req. body",});
          }

          const productData = 
          {
            productId: productId,
            quantity: 1
          }

          const cartData = {
              userId: userId,
              items: [productData],
              totalPrice: isProductPresent.price,
              totalItems: 1,
            };

          const addedToCart = await cartModel.create(cartData);

          return res.status(201).send({ status: true, message: "New cart created and product added to cart", data: addedToCart });
      }
      }

       catch (err) {
      res.status(500).send({status:false, message:err.message})
  }
}


const getCart = async function (req, res) {
  try{
    let userIdFromParams = req.params.userId
    let userIdFromToken = req.userId

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

    const findCart = await cartModel.findOne({ userId: userIdFromParams })
    
    if (!findCart) {
        return res.status(400).send({ status: false, message: "no cart exist with this id" })
    }
    
    if(findCart.totalPrice === 0){
        return res.status(404).send({status:false, msg:"your cart is empty."})
    }

   return res.status(200).send({status:true, msg:"Cart Details.", data:findCart})
}
catch(error){
    return res.status(500).json({ status: false, message: error.message });
}
}


const updateCart = async function (req, res) {
  try {
    let userId = req.params.userId
    let requestBody = req.body;
    let userIdFromToken = req.userId;

    //validation starts.
    if (!isValidObjId.test(userId)) {
        return res.status(400).send({ status: false, message: "Invalid userId in body" })
    }

    let findUser = await userModel.findOne({ _id: userId })
    if (!findUser) {
        return res.status(400).send({ status: false, message: "UserId does not exits" })
    }

    //Authentication & authorization
    if (findUser._id.toString() != userIdFromToken) {
        res.status(401).send({ status: false, message: `Unauthorized access! User's info doesn't match` });
        return
    }

    //Extract body
    const { cartId, productId, removeProduct } = requestBody
    // if (!validator.isValidRequestBody(requestBody)) {
    //     return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide cart details.' })
    // }

    //cart validation
    if (!isValidObjId.test(cartId)) {
        return res.status(400).send({ status: false, message: "Invalid cartId in body" })
    }
    let findCart = await cartModel.findById({ _id: cartId })
    if (!findCart) {
        return res.status(400).send({ status: false, message: "cartId does not exists" })
    }

    //product validation
    if (!isValidObjId.test(productId)) {
        return res.status(400).send({ status: false, message: "Invalid productId in body" })
    }
    let findProduct = await productModel.findOne({ _id: productId, isDeleted: false })
    if (!findProduct) {
        return res.status(400).send({ status: false, message: "productId does not exists" })
    }

    //finding if products exits in cart
    let isProductinCart = await cartModel.findOne({ items: { $elemMatch: { productId: productId } } })
    if (!isProductinCart) {
        return res.status(400).send({ status: false, message: `This ${productId} product does not exists in the cart` })
    }

    //removeProduct validation either 0 or 1.
    if (!(!isNaN(Number(removeProduct)))) {
        return res.status(400).send({ status: false, message: `removeProduct should be a valid number either 0 or 1` })
    }

    //removeProduct => 0 for product remove completely, 1 for decreasing its quantity.
    if (!((removeProduct === 0) || (removeProduct === 1))) {
        return res.status(400).send({ status: false, message: 'removeProduct should be 0 (product is to be removed) or 1(quantity has to be decremented by 1) ' })
    }

    let findQuantity = findCart.items.find(x => x.productId.toString() === productId)
        //console.log(findQuantity)

    if (removeProduct === 0) {
        let totalAmount = findCart.totalPrice - (findProduct.price * findQuantity.quantity) // substract the amount of product*quantity

        await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } } }, { new: true })

        let quantity = findCart.totalItems - 1
        let data = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { totalPrice: totalAmount, totalItems: quantity } }, { new: true }) //update the cart with total items and totalprice

        return res.status(200).send({ status: true, message: `${productId} is been removed`, data: data })
    }

    // decrement quantity
    let totalAmount = findCart.totalPrice - findProduct.price
    let itemsArr = findCart.items

    for (i in itemsArr) {
        if (itemsArr[i].productId.toString() == productId) {
            itemsArr[i].quantity = itemsArr[i].quantity - 1

            if (itemsArr[i].quantity < 1) {
                await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } } }, { new: true })
                let quantity = findCart.totalItems - 1

                let data = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { totalPrice: totalAmount, totalItems: quantity } }, { new: true }) //update the cart with total items and totalprice

                return res.status(200).send({ status: true, message: `No such quantity/product exist in cart`, data: data })
            }
        }
    }
    let data = await cartModel.findOneAndUpdate({ _id: cartId }, { items: itemsArr, totalPrice: totalAmount }, { new: true })

    return res.status(200).send({ status: true, message: `${productId} quantity is been reduced By 1`, data: data })

}
catch (error) {
  return res.status(500).send({ status: false, message: error.message })
}
}
const deleteCart = async function (req, res) {
    try {
        //let userId = req.params.userId
        let userIdFromParams = req.params.userId
        let userIdFromToken = req.userId
        if (! isValidObjectId(userIdFromParams)) {
            return res.status(400).send({ status: false, message: "userId is invalid" })
        }

        const findUserById = await userModel.findOne({ _id: userIdFromParams})

        if (!findUserById) {
            return res.status(404).send({ status: false, message: "No user found" })
        }

        if (userIdFromToken != userIdFromParams) {
          return res.status(403).send({status: false,message: "Unauthorized access.",});
      }

        const findCartById = await cartModel.findOne({ userId: userIdFromParams})//.select({"items[0].productId":1,_id:1})

        if (!findCartById) {
            return res.status(404).send({ status: false, message: "No cart Available,Already deleted" })
        }


        const deleteProductData = await cartModel.findOneAndUpdate({ userId: userIdFromParams  },
            { $set: { items:[],totalItems:0,totalPrice:0} },
            { new: true })

            await cartModel.findOne({ userId: userIdFromParams })

        return res.status(200).send({ status: true, message: "Product deleted successfullly.",data:deleteProductData })

        
    }catch (error) {
    return res.status(500).send({ status: false, message: error.message })
  }
}

module.exports = {getCart,deleteCart,updateCart,createCart}
