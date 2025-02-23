import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Address from "../../models/addressSchema.js";
import Order from "../../models/orderSchema.js";
import Coupon from "../../models/couponSchema.js";
import Cart from "../../models/cartSchema.js";
import Wallet from "../../models/wallet.js";


    
const applyCoupon = async (req, res) => {

    try {

        
        const { couponCode, orderTotal } = req.body;
        
        console.log(" gettting ",couponCode);
        const userId = req.session.user;

        if (!userId) {

            return res.status(401).json({

                success: false,

                message: "Please login to apply coupon"
            
            });
        
        }

       
        const coupon = await Coupon.findOne({

            name: couponCode,

            isList: true
        });
       
console.log( "coupon:",coupon);



        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: "Invalid coupon code"
            });
        }

       
        

        if (coupon.userBy.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: "You have already used this coupon"
            });
        }
        coupon.userBy.push(userId)
await coupon.save()


        if (orderTotal < coupon.minimumPrice) {
            return res.status(400).json({
                success: false,
                message: `Minimum order amount of ₹${coupon.minimumPrice} required`
            });
        }

        // Calculate discount

        const discountAmount = Math.min(coupon.offerPrice, orderTotal);
        const newTotal = orderTotal - discountAmount;

const cart = await Cart.findOne({userId:userId})

  const totalPrice = cart.items.reduce((sum,item)=>sum+item.totalPrice)




        res.json({
            success: true,
            newTotal,
            discountAmount,
            message: "Coupon applied successfully!"
        });

    } catch (error) {
        console.error("Error in applyCoupon:", error);
        res.status(500).json({
            success: false,
            message: "Failed to apply coupon"
        });
    }
};

const removeCoupon = async (req, res) => {
    console.log("remove coupon ethhi");
    
    try {
        const { couponCode } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to remove coupon"
            });
        }

        const coupons = await Coupon.findOne({ name: couponCode });
        
        if (!coupons) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

      


        await Coupon.updateOne(
            { _id: coupons._id },
            { $pull: { userBy: userId } }
        );

        
        console.log("coupon is gertting",coupons);
        
        await coupons.save();

        res.json({
            success: true,
            message: "Coupon removed successfully"
        });

    } catch (error) {
        console.error("Error in removeCoupon:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove coupon"
        });
    }
};






export{
    applyCoupon,
    removeCoupon,
  
}