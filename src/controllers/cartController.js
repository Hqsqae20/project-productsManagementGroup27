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
      const userId = req.params.userId
      const userIdFromParams = req.params.userId
      const userIdFromToken = req.userId
      const { cartId, productId, removeProduct } = req.body

      const key = Object.keys(req.body)

      if (key == 0) {
          return res.status(400).send({ status: false, msg: "please enter some data" })
      }

      if (!isValidObjectId(userIdFromParams)) {
          return res.status(400).send({ status: false, msg: "userId is invalid" })
      }

      const findByUser = await userModel.findById(userIdFromParams);

        if (!findByUser) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }
        
        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({
              status: false,
              message: "Unauthorized access.",
            });
        }


      if (!isValid(cartId)) {
          return res.status(400).send({ status: false, msg: "cartId is required" })
      }

      if (!isValidObjectId(cartId)) {
          return res.status(400).send({ status: false, msg: "cartId is invalid" })
      }

      const findCart = await cartModel.findById(cartId);
    
        if (!findCart) {
            return res.status(404).send({ status: false, message: 'cart not found.' });
        }

      if (!isValid(productId)) {
          return res.status(400).send({ status: false, msg: "productId is required" })
      }

      if (!isValidObjectId(productId)) {
          return res.status(400).send({ status: false, msg: "productId is invalid" })
      }

      const ProductById = await userModel.findById(productId);

        if (!ProductById) {
            return res.status(404).send({ status: false, message: 'Product not found.' });
        }

        if(ProductById.isDeleted == true){
          return res.status(400).send({ status:false, msg: "product is deleted" });
      }

      const findProductInCart = await cartModel.findOne({ items: { $elemMatch: { productId: productId } } });
       
        if (!findProductInCart) {
            return res.status(404).send({ status: false, message: 'product not found in the cart.' });
        }
      

      if (!isValid(removeProduct)) {
          return res.status(400).send({ status: false, msg: "removeProduct is required" })
      }

      let cartData = await cartModel.findById(cartId)
      if (!cartData) { return res.status(404).send({ status: false, msg: "cartData not found !" }) 
  }

      if (isValid(removeProduct)) {
          if (typeof removeProduct != Number) {
              return res.status(400).send({ status: false, msg: "only number are allowed!" })
          }
      }
      if (removeProduct == 0) {
          let items = []
          let dataObj = {}
          let removePrice = 0
          for (let i = 0; i < cartData.length; i++) {
              if (cartData.items[i].productId != productId) {
                  return res.status(400).send({ status: false, msg: "product not found in the cart" })
              }
              if (cartData.items[i].productId == productId) {
                  const productRes = await productModel.findOne({ _id: productId, isDeleted: false })
                  if (!productRes) { return res.status(404).send({ status: false, msg: "product not found !" }) }
                  removePrice = productRes.price * cartData.items[i].quantity
              }
              items.push(cartData.items[i])

          }
          productPrice = cartData.totalPrice - removePrice
          dataObj.totalPrice = productPrice
          dataObj.totalItems = items.length
          dataObj.items = items
          const removeRes = await cartModel.findOneAndUpdate({ productId: productId }, dataObj, { new: true })
          return res.status(200).send({ status: true, message: "remove success", data: removeRes })

      }
      if(removeProduct == 1) {
          let dataObj = {}
          let item =[]
          let productPrice = 0
          for (let i = 0; i < cartData.length; i++) {
              if (cartData.items[i].productId != productId) {
                  return res.status(400).send({ status: false, msg:  "product not found in the cart" })
              }
              if (cartData.items[i].productId == productId) {
                  const productRes = await productModel.findOne({ _id: productId, isDeleted: false })
                  if (!productRes) { return res.status(404).send({ status: false, msg: "product not found !" }) }
                  item.push({productId:productId,quantity:cartData.items[i].quantity - 1})
                  dataObj.totalPrice = cartData.totalPrice - productRes.price
                  dataObj.totalItems = item.length
                  dataObj.items = item
                  
              }
              const reduceData = await cartModel.findOneAndUpdate({productId:productId},dataObj,{new:true})
              
              return res.status(200).send({ status: true, message: "success", data:reduceData})

          }

      }
      else{
          return res.status(400).send({ status: false, msg: "removeProduct field should be allowed only 0 and 1 " }) 
      }

  }
  catch (err) {
      return res.status(500).send({ status: false, msg: err.message })
  }
}

//delete item from cart..................................................
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
