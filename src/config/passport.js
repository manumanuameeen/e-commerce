import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import User from "../models/userSchema.js";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    console.log("now passport configuration going on");

    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            if (user.isBlocked) {
                return done(null, false, { 
                    message: 'Your account has been blocked by admin' 
                });
            }
            return done(null, user);
        }

        user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
        });
        
        await user.save();
        console.log("new user created");
        return done(null, user);

    } catch (error) {
        return done(error, null);
    }
}));
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
       
        if (user && user.isBlocked) {
            return done(null, false, { message: 'Your account has been blocked by admin.' });
        }
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;