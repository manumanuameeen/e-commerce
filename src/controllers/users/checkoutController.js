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
        console.log('cart ll ninn ulla cart', cart);


    } catch (error) {
        console.log("error", error);
        res.redirect("/pageNotFound")

    }


}


const checkoutAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId })
        console
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

        console.log('req.body :', req.body)
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



const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { selectedAddress, paymentMethod } = req.body;

        // Validate cart
        const cart = await Cart.findOne({ userId: userId }).populate("items.ProductId");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: "Your cart is empty" 
            });
        }

        const userAddressDoc = await Address.findOne({ userId: userId });
        if (!userAddressDoc) {
            return res.status(400).json({ 
                success: false,
                message: 'No addresses found for user' 
            });
        }

        const addressDetails = userAddressDoc.address.find(addr => 
            addr._id.toString() === selectedAddress
        );

        if (!addressDetails) {
            return res.status(400).json({ 
                success: false,
                message: 'Selected address not found' 
            });
        }

    
        let totalPrice = 0;
        const orderItems = [];

        for (const item of cart.items) {
            const product = await Product.findById(item.ProductId._id);
            if (!product) {
                return res.status(400).json({ 
                    success: false,
                    message: `Product ${item.ProductId.productName} not found` 
                });
            }

            const itemPrice = product.salePrice * item.quantity;
            totalPrice += itemPrice;

            orderItems.push({
                product: item.ProductId._id,
                quantity: item.quantity,
                price: product.salePrice,
                colorVariant: item.colorVariant
            });

     
            const colorVariant = product.colorVarients.find(
                variant => variant.color === item.colorVariant
            );
            if (colorVariant) {
                colorVariant.quantity -= item.quantity;
                await product.save();
            }
        }

        
    
        const newOrder = new Order({
            orderIteams: orderItems,
            totalPrice: totalPrice,
            finalAmount: totalPrice,
            address: userAddressDoc._id,
            paymentMethod:  paymentMethod,
            status: 'Pending',
            createdOn: new Date()
        });
console.log("new order created",newOrder)
        await newOrder.save();

        const user = await User.findById(userId)
        user.orderHistory.push(newOrder._id);
        await user.save();

        await Cart.findOneAndUpdate(
            { userId: userId },
            { $set: { items: [] } }
        );

        return res.status(201).json({
            success: true,
            message: "Order placed successfully!",
            orderId: newOrder._id,
        });

      
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to place order. Please try again.',
            error: error.message
        });
    }
};



const orderSuccess = async (req,res) => {
    try {
        const userId = req.session.user;
        const orderId = req.query.orderId;

        const order = await Order.findOne({ _id: orderId }).populate("address");



console.log('is this getting',order.address);


res.render('order-successfully',{order})
    } catch (error) {
        console.log(error);
        res
    }
}


const orderDetails =async (req,res) => {
    try {
        const userId= req.session.user;
        const orderId = req.params.orderId
        console.log("order from details page ",orderId);


        const order = await Order.findOne({_id:orderId}).populate("orderIteams.product")
     console.log("order getting ",order);
     
        
        
        res.render("order-details",{order})
    } catch (error) {
        console.log('error in order veiw',error);
        
    }
}



const orderCancel= async (req,res) => {
    try {
        const userId= req.session.user;
        const orderId = req.params.orderId;
        const order = await Order.findOne({_id:orderId}).populate("orderIteams.product")

if(!order){
    return res.json({
        success:true,
        message:"order is not found"
    })
}



if (order.status === 'Pending' || order.status === 'Processing'){

order.status = "Cancelled";
await order.save();

}

for (const item of order.orderIteams) {
    const product = item.product; 


    await Product.updateOne(

        { _id: product._id, "sizeVariants.color": item.color },

        { $inc: { "sizeVariants.$.quantity": item.quantity } } 

    );
    console.log("product saved");
    
}
return res.status(200).json({
    success:true,
    message:"order Cancelled successfully" 
})


    } catch (error) {
    console.log("error in cancel order",error);
     res.status(400).json({
        success:false,
        message:"erro in order cancel"
     })
    }
}

export {
    getChekout,
    checkoutAddress,
    placeOrder,
    orderSuccess,
    orderDetails,
    orderCancel,


}