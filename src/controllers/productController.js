const productModel = require("../models/productModel")
const aws = require("aws-sdk")
const mongoose = require("mongoose")
const currencySymbol = require("currency-symbol-map")


//Connection to  AWS
aws.config.update(
  {
      accessKeyId: "AKIAY3L35MCRVFM24Q7U",
      secretAccessKey: "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",
      region: "ap-south-1"
  }
)

//uploading An Image File to AWS
let uploadFile = async (file) => {
  return new Promise(function (resolve, reject) {

      let s3 = new aws.S3({ apiVersion: "2006-03-01" })

      var uploadParams = {
          ACL: "public-read",
          Bucket: "classroom-training-bucket",
          Key: "sapna/" + file.originalname,
          Body: file.buffer
      }
      console.log(uploadFile)
      s3.upload(uploadParams, function (err, data) {
          if (err) {
              return reject({ "error": err })
          }

          return resolve(data.Location)
      }
      )

  }
  )
}

const isValid = function(value){
    if(typeof value ==undefined ||  value ==null)return false
    if(typeof value==='string'&&value.trim().length===0) return false
    if(typeof value===Number &&value.trim().length===0) return false
    return true
  }

const validForEnum = function (value) {
    let enumValue = ["S", "XS", "M", "X", "L", "XXL", "XL"]
    value = JSON.parse(value)
    for (let x of value) {
        if (enumValue.includes(x) == false) {
            return false
        }
    }
    return true;
}
const validInstallment = function isInteger(value) {
    if (value < 0) return false
    if (value % 1 == 0) return true;

}

const isValidDetails = function (requestBody) {
    return Object.keys(requestBody).length > 0;
};

const createProduct = async function (req, res) {
    try {
        let data = req.body
        let files = req.files
      
if(Object.keys(data).length ==0){return res.status(400).send({status:false, msg: "please input some data"})}

       
        const { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = data



//     title validation

       if(!title){
           return res.status(400).send({status:false, msg:"title required"})
        }

        if(!isValid(title)){
            return res.status(400).send({status:false, msg:"title required"})
        }

       let duplicateTitle = await productModel.findOne({title:title})

       if(duplicateTitle){
           return res.status(400).send({status:false, msg: "title already exist in use"})
        }

// description validation
       
    if(!description){
        return res.status(400).send({status:false, msg:"description required"})
    }

    if(!isValid(description)){
        return res.status(400).send({status:false, msg:"description required"})
    }

    if(!price){
        return res.status(400).send({status:false, msg: "price required"})
    }

    if(!(!isNaN(Number(price)))){
        return res.status(400).send({status:false, msg: "price should be a valid number"})
    }

    if(price<=0){
        return res.status(400).send({status:false, msg: "price should be a valid number"})

    }

    if(!currencyId){
        return res.status(400).send({status:false, msg: "currencyId required"})
    }

    if(!currencyFormat){
        return res.status(400).send({status:false, msg: "currency format required"})
    }

    if(!validForEnum(availableSizes)){
        return res.status(400).send({status:false, msg: "please choose the size from the available sizes"})
    }

    if(currencyId != "INR"){
        return res.status(400).send({status:false, msg: "only indian currencyId INR accepted"})
    }

    if(currencyFormat != "₹"){
        return res.status(400).send({status:false, msg: "only indian currency ₹ accepted "})
    }

    if(isValid(isFreeShipping)){
        if(!((isFreeShipping==="true") || (isFreeShipping === "false"))){
            return res.status(400).send({status:false, msg: "isfreeshipping should be a boolean valus"})
        }
    }
    if (files.length > 0) {
      var  profileImagessweetselfie = await uploadFile(files[0])
    }

        data.productImage = profileImagessweetselfie

       data.availableSizes = JSON.parse(availableSizes)

        if(!data.productImage){return res.status(400).send({status:false, msg: "productImage required"})}

        const created = await productModel.create(data)

        return res.status(201).send({ status: true, data: created })
    }
    catch (err) {
        console.log(err)
        return res.status(500).send({ status: false, msg: err.message })
    }
}
//get Product................................................
const getProduct = async function (req, res) {
    
    
    try{
        const queryData = req.query
        let filter = { isDeleted:false }
       
        const { size, name, priceGreaterThan, priceLessThan, sortPrice } = queryData;
        if(isValid(size)){
            filter["availableSizes"]=size
        }
        let arr=[]
        if(isValid(name)){
          
        const findName=await productModel.find({isDeleted:false}).select({title:1,_id:0})
        for(let i=0;i<findName.length;i++)
        {
            let findingName=findName[i].title
            let newSize=findingName.includes(name)

            if(newSize)
            {
               arr.push(findName[i].title)
            }
        }
      filter["title"]=name
    }

    if(priceGreaterThan!=null && priceLessThan==null )
    {
      filter["price"]={$gt:priceGreaterThan}
    }

    if(priceGreaterThan==null && priceLessThan!=null )
    {
      filter["price"]={$lt:priceLessThan}
    }

    if(priceGreaterThan!=null && priceLessThan!=null )
    {
      filter["price"]={$gt:priceGreaterThan,$lt:priceLessThan}
    }
    if(size) {

        const searchSize = await productModel.find({availableSizes: size, isDeleted: false}).sort({price: sortPrice})

        if(searchSize.length !== 0) {
            return res.status(200).send({ status: true, message: 'Success', data: searchSize})
        }
        else {
            return res.status(404).send({status: false, message: `product not found with this ${size}`})
        }
    }

    if(name) {
        const searchName = await productModel.find({title: {$regex: name}, isDeleted: false}).sort({price: sortPrice})

        if(searchName.length !== 0) {
            return res.status(200).send({status: true, message: 'Success', data: searchName})
        }
        else {
            return res.status(404).send({status: false, message: `product not found with this ${name}`})
        }
    }

    //ascending(low to high)
    if(sortPrice==1){
       let findPrice=await productModel.find(filter).sort({price:1})
       if(findPrice.length==0)
       {
           return res.status(404).send({status:false,message:"data not found"})
       }
       return res.status(200).send({status:true,data:findPrice})
    }

    //descending(high to low)
    if(sortPrice==-1){
        let findPrice=await productModel.find(filter).sort({price:-1})
        if(findPrice.length==0)
        {
            return res.status(404).send({status:false,message:"data not found"})
        }
        return res.status(200).send({status:true,data:findPrice})
     }
 
     let findPrice=await productModel.find(filter)
        if(findPrice.length==0)
        {
            return res.status(404).send({status:false,message:"data not found"})
        }
        return res.status(200).send({status:true,data:findPrice})
    
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

const getProductbyId = async function (req, res) {
    try{
        const productId = req.params.productId

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }

        const findProduct = await productModel.findById(productId)

        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product does not exists' })
        }

        if(findProduct.isDeleted == true){
            return res.status(400).send({ status:false, msg: "product is deleted" });
        }

        return res.status(200).send({ status: true, message: 'Product found successfully', data: findProduct })
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}
//update product........................................................

const updateProduct = async function (req, res) {
    try {
        let data = req.body;
        const productId = req.params.productId
        //if (!(Object.keys(data).length > 0)) { return res.status(400).send({ status: false, message: "Invalid request Please provide details of an user" }); }

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }
       
        const findProduct = await productModel.findById(productId)

        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product does not exists' })
        }

        if(findProduct.isDeleted == true){
            return res.status(400).send({ status:false, msg: "product is deleted" });
        }

        if (!isValidDetails(data)) {
            return res.status(400).send({ status: false, msg: "please provide details to update." });
        }

        let { title, description, price, currencyId, currencyFormat, productImage,availableSizes } = data
        const dataObject = {};
        if (isValid(title)) {
            dataObject['title'] = title.trim()
        }

        if (isValid(description)) {
            dataObject['description'] = description.trim()
        }

        if (isValid(price))  {
            dataObject['price'] = price.trim()
        }


        if (isValid(currencyId)) {
            dataObject['currencyId'] = currencyId.trim()
        }

        if (isValid(currencyFormat))  {
            dataObject['currencyFormat'] = currencyFormat.trim()
        }

        if (isValid(availableSizes))  {
            dataObject['availableSizes'] = availableSizes.trim()
        }
        let file = req.files
        if (file.length > 0) {
            let uploadFileUrl = await uploadFile(file[0])
            dataObject['productImage'] = uploadFileUrl
        }
  

        let updatedProduct = await productModel.findOneAndUpdate({_id:productId},
             dataObject,
            { new: true })

            if (!updatedProduct) {
                return res.status(404).send({ status: false, msg: "user profile not found" })
            }
            return res.status(200).send({ status: true, msg: "User Profile updated", data: updatedProduct })
      

    } catch (error) {
        res.status(500).send({ status: false, msg: error.message });
    }
}//delete product................................................

const deleteProduct = async function (req, res) {
    
    try{
        const productId = req.params.productId

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }

        const findProduct = await productModel.findById(productId);

        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product does not exists' })
        }
        if (findProduct.isDeleted == true){
            return res.status(400).send({status:false, message:"product already deleted."})
        }

        const deletedDetails = await productModel.findOneAndUpdate(
            { _id: productId },
            { $set: { isDeleted: true, deletedAt: new Date() } }, {new:true})

        return res.status(200).send({ status: true, message: 'Product deleted successfully.', data:deletedDetails })
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = {createProduct,getProduct,getProductbyId ,updateProduct,deleteProduct}
