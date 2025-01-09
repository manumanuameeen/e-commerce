import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import User from "../models/userSchema.js";




passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
},

async (accessToken,refreshToken,profile,done) => {
    

    console.log("now passport configeration going on");

        try {

            let user = await User.findOne({googleId:profile.id})
            console.log("user exist:",user);
            
            if (user){
                return done(null,user);
            }else{
                user = new User({
                    name:profile.displayName,
                    email:profile.emails[0].value,
                    googleId:profile.id,
                });
               
                
                await user.save();
                console.log("yes user not exist so created");

                return done(null,user);
            }


        } catch (error) {

            return done(error,null)

        }


}

));

passport.serializeUser((user,done)=>{
done(null,user.id)
})




passport.deserializeUser(async (id,done) => {
    
        try {
            const user = await User.findById(id)
            done(null,user);
        } catch (error) {
            done(error,null)
        }


})



export default passport;