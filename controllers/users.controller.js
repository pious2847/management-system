const User = require('../models/user')
const bcrypt = require('bcrypt')


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
    async updateUser(req, res){
        try{
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

        }catch(error){
            console.error('Error updating user:', error);
            req.flash('message', `Error updating user: ${error.message}`);
            req.flash('status', 'danger');
            res.redirect('/dashboard/users');
        }

    },
    async deleteUser(req, res) {
        try{
            const user = await User.findByIdAndDelete(req.params.id);
            if(!user){
                req.flash('message', `user not found. Please try again`);
                req.flash('status', 'danger');
                res.redirect('/dashboard/users');
            }

            req.flash('message', `user deleted successfully`);
            req.flash('status', 'success');
            res.redirect('/dashboard/users');
        }catch(error){
            console.error('Error deleting user:', error);
            req.flash('message', `Error deleting user: ${error.message}`);
            req.flash('status', 'danger');
            res.redirect('/dashboard/users');
        }
    },
}

module.exports = userController;