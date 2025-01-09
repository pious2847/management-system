const User = require('../models/user')
const bcrypt = require('bcrypt');
const { generateSessionToken } = require('../utils/codesGen');


const userController = {
    async createUser(req, res) {
        try {
            const { username, role, email, password } = req.body;

            const user = await User.find({ email });
            if (user) {
                req.flash('message', `User already exist with same email`);
                req.flash('status', 'danger');
                res.redirect('/dashboard/users');
            }
            const hashedPassword = await bcrypt.hash(password, 12);

            const newuser = new User({
                username,
                role,
                email,
                password: hashedPassword
            })
            await newuser.save();

            req.flash('message', 'User Added successfully');
            req.flash('status', 'success');
            res.redirect('/dashboard/users');
        } catch (error) {
            console.error('Error saving user:', error);
            req.flash('message', `Error saving user: ${error.message}`);
            req.flash('status', 'danger');
            res.redirect('/dashboard/users');
        }
    },
    async getUserById(req, res) {
        try {
            const user = await User.findById(req.params.userId)
            if (!user) {
                req.flash('message', `User Not Found. Please try again`);
                req.flash('status', 'danger');
                res.redirect('/dashboard/users');
            }
            res.status(200).json(user);
        } catch (error) {
            console.error('Error getting user:', error);
            req.flash('message', `Error getting user: ${error.message}`);
            req.flash('status', 'danger');
            res.redirect('/dashboard/users');
        }

    },
    async updateUser(req, res) {
        try {
            const { username, role, email, password } = req.body;

            const user = await User.find({ email });
            if (!user) {
                req.flash('message', `User Not found with these email`);
                req.flash('status', 'danger');
                res.redirect('/dashboard/users');
            }
            const hashedPassword = await bcrypt.hash(password, 12);

            const userpassword = password ? hashedPassword : user.password;

            const updatedUser = await User.findByIdAndUpdate(
                req.params.id,
                {
                    username,
                    role,
                    password: userpassword,
                    email
                },
                { new: true, runValidators: true }
            )
            if (!updatedUser) {
                req.flash('message', `User not found`);
                req.flash('status', 'danger');
                return res.redirect('/dashboard/users');
            }

            req.flash('message', 'User updated successfully');
            req.flash('status', 'success');
            res.redirect('/dashboard/users');

        } catch (error) {
            console.error('Error updating user:', error);
            req.flash('message', `Error updating user: ${error.message}`);
            req.flash('status', 'danger');
            res.redirect('/dashboard/users');
        }

    },
    async deleteUser(req, res) {
        try {
            const user = await User.findByIdAndDelete(req.params.id);
            if (!user) {
                req.flash('message', `user not found. Please try again`);
                req.flash('status', 'danger');
                res.redirect('/dashboard/users');
            }

            req.flash('message', `user deleted successfully`);
            req.flash('status', 'success');
            res.redirect('/dashboard/users');
        } catch (error) {
            console.error('Error deleting user:', error);
            req.flash('message', `Error deleting user: ${error.message}`);
            req.flash('status', 'danger');
            res.redirect('/dashboard/users');
        }
    },
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await User.findOne({ email });

            if (!user) {
                req.flash('message', `Invalid Email and Password`);
                req.flash('status', 'danger');
                return res.redirect('/');
            }

            // Compare passwords
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                req.flash('message', `Invalid password Entered`);
                req.flash('status', 'danger');
                return res.redirect('/');
            }

            // Generate a session token (you can use a library like jsonwebtoken for this)
            const sessionToken = generateSessionToken(user._id);

            // Set session variables
            req.session.userId = user._id;
            req.session.isLoggedIn = true;
            req.session.token = sessionToken;

            req.flash('message', `${user.username} logged in successfully`);
            req.flash('status', 'success');
            return res.redirect('/dashboard');

        } catch (error) {
            console.log(error);
            req.flash('message', `An unexpected error occurred. Please try again later.`);
            req.flash('status', 'danger');
            return res.redirect('/');
        }
    },
    async logout(req, res) {
        try {
            // Set flash message before destroying the session
            req.flash('message', `Logged out successfully`);
            req.flash('status', 'success');

            // Destroy session
            req.session.destroy(err => {
                if (err) {
                    console.error('Error destroying session:', err);
                    req.flash('message', `An unexpected error occurred. Please try again later.`);
                    req.flash('status', 'danger');
                    return res.redirect('/');
                }

                // Redirect after session is destroyed
                return res.redirect('/');
            });
        } catch (error) {
            console.error('Error logging out:', error);
            req.flash('message', `An unexpected error occurred. Please try again later.`);
            req.flash('status', 'danger');
            return res.redirect('/dashboard');
        }
    }

}

module.exports = userController;