import User from "../../models/userSchema.js";

import Product from "../../models/productSchema.js";

import Address from "../../models/addressSchema.js";

import Order from "../../models/orderSchema.js";
import Cart from "../../models/cartSchema.js";



const getChekout = async (req, res) => {
    try {
        const successMessage = req.flash('success'); 
        const errorMessage = req.flash('error');  
        const user = req.session.user;
        console.log(user);

        const userDate = await User.findOne({ _id: user })
        // .populate("address");

        const cart = await Cart.findOne({ userId: user }).populate('items.ProductId');

        const address = await Address.findOne({ userId: user })
        if (!address) {
            return res.redirect("/addAddress")
            
            console.log("user have no address so create new one ")
        }


        const subTotal = cart.items.reduce((total, items) => total + items.totalPrice, 0)
        res.render('checkout', {
            user: userDate,
            cart: cart,
            address: address,
            subTotal,
            successMessage: successMessage[0] || null,
            errorMessage: errorMessage[0] || null
        });
console.log('cart ll ninn ulla cart',cart);


    } catch (error) {
        console.log("error", error);
        res.redirect("/pageNotFound")

    }


}


const  checkoutAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId })
        console
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

console.log('req.body :',req.body)
        const userAddress = await Address.findOne({ userId: userData._id })

        if (!userAddress) {
            const newAddress = new Address({
                userId: userId,
                address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }]
            })
            await newAddress.save()
            
        } else {

            userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone })
            await userAddress.save()
            
            console.log('address saved too ');
            // console.log("userAddres from checout page ",{ addressType, name, city, landMark, state, pincode, phone, altPhone });
            
        }

        req.flash('success', 'Address added successfully')
        return res.redirect('/checkout')
    } catch (error) {
        console.log("error in add address in chekout ", error);

        req.flash('error', 'There was an issue adding your address.')
        req.redirect("/pageNotFound")
    }
}
export {
    getChekout,
    checkoutAddress,


}