const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');

const router = express.Router();


router.post('/register', async (req, res) => {
    const { role, name, contactPerson, phone, email, address, position, department, password } = req.body;
    console.log('register:::', req.body);
    
    try {
        

        let existingUser ;
        if (role === 'client') {
            existingUser  = await Client.findOne({ email });
        } else if (role === 'employee') {
            existingUser  = await Employee.findOne({ email });
        } else if (role === 'supplier') {
            existingUser  = await Supplier.findOne({ email });
        }

        if (existingUser ) {
            return res.status(400).json({ message: 'User  with this email already exists' });
        }


        const hashedPassword = await bcrypt.hash(password, 10);


        let user;
        if (role === 'client') {
            user = new Client({ name, contactPerson, phone, email, address, password: hashedPassword });
        } else if (role === 'employee') {
            user = new Employee({ name, position, department, phone, email, password: hashedPassword });
        } else if (role === 'supplier') {
            user = new Supplier({ name, contactPerson, phone, email, address, password: hashedPassword });
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }
        
        await user.save();
        

        const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.status(201).json({ message: 'User  registered successfully', token: token, userInfo: { role, name, contactPerson, phone, email, address, position, department } });
    } catch (err) {
        console.error('Error saving user:', err);
        res.status(500).json({ message: err.message });
    }
});


router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        let user;
        
        if (role === 'client') {
            user = await Client.findOne({ email });
        } else if (role === 'employee') {
            user = await Employee.findOne({ email });
        } else if (role === 'supplier') {
            user = await Supplier.findOne({ email });
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }
        let Role;
        Role = role;
        if(email=='admin@gmail.com'){
            console.log('[AUTH LOGIN] Special handling for admin@gmail.com');
            user = await Client.findOne({ email });
            Role = 'admin';
            console.log('[AUTH LOGIN] Found admin user in Client collection:', user ? user._id.toString() : 'not found');
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ 
            id: user._id, 
            role: Role 
        }, process.env.JWT_SECRET || 'default_secret_replace_in_production', { 
            expiresIn: process.env.JWT_EXPIRES_IN || '1d' 
        });

        console.log('[AUTH LOGIN] Generated token with user ID:', user._id.toString(), 'and role:', Role);

        const { password: _, createdAt, ...userData } = user.toObject(); 
        userData.role = Role;
        userData.id = user._id;

        res.json({ token: token, userInfo: userData }); 
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;