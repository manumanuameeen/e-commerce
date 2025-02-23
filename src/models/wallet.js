import mongoose from "mongoose";

const { Schema } = mongoose;

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [{
        type: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        description: {
            type: String,

        },
   
    }],
    creditHistory: [
        {
          amount: { type: Number, required: true },
          date: { type: Date, default: Date.now },
          description: { type: String },
     
          
        }
      ],
      debitHistory: [
        {
          amount: { type: Number, required: true },
          date: { type: Date, default: Date.now },
          description: { type: String },
        
        }
      ],

},{ timestamps: true })
const Wallet = mongoose.model("Wallet",walletSchema)



export default Wallet;