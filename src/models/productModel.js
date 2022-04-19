const mongoose = require("mongoose");
//const ObjectId = mongoose.Schema.Types.ObjectId

const productSchema = new mongoose.Schema({


    title: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
       // match:,
    },
    currencyId: {
        type: String,
        required: true,
        //INR:,
    },
    currencyFormat: {
        type: String,
        required: true,
       // RupeeSymbol:,
    },

    isFreeShipping: {
        type: Boolean,
        default: false
    },
    productImage: {
        type: String,
        required: true
    },
    style: {
        type: String
    },

    availableSizes: {
        type: [String],
        enum: ["S", "XS", "M", "X", "L", "XXL", "XL"]
    },
    installments: {
        type: Number
    },
    deletedAt: {
        type: Date,
        default:null
    },
     isDeleted: {
        type: Boolean,
        default: false,

    }
},
    { timestamps: true })

module.exports = mongoose.model('products', productSchema)
