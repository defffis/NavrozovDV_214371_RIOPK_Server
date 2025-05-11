const mongoose = require('mongoose');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');


mongoose.connect('mongodb://127.0.0.1:27017/supplier_management');

const seedProducts = async () => {
    try {
     
        const suppliers = await Supplier.find();


        if (suppliers.length === 0) {
            console.log('No suppliers found. Please add suppliers first.');
            return;
        }


        const products = [
           
            {
                name: 'Wireless Mouse',
                description: 'Ergonomic wireless mouse with adjustable DPI.',
                price: 25.99,
                supplier: suppliers[0]._id,
            },
            {
                name: 'Mechanical Keyboard',
                description: 'RGB mechanical keyboard with customizable keys.',
                price: 79.99,
                supplier: suppliers[0]._id,
            },
            {
                name: 'HDMI Cable',
                description: 'High-speed HDMI cable for 4K video.',
                price: 15.50,
                supplier: suppliers[0]._id,
            },

          
            {
                name: 'Gaming Monitor',
                description: '24-inch gaming monitor with 144Hz refresh rate.',
                price: 199.99,
                supplier: suppliers[1]._id,
            },
            {
                name: 'USB-C Hub',
                description: 'Multi-port USB-C hub for laptop connectivity.',
                price: 39.99,
                supplier: suppliers[1]._id,
            },
            {
                name: 'Laptop Stand',
                description: 'Adjustable laptop stand for ergonomic viewing.',
                price: 29.95,
                supplier: suppliers[1]._id,
            },

         
            {
                name: 'Bluetooth Headphones',
                description: 'Noise-cancelling Bluetooth headphones with long battery life.',
                price: 89.99,
                supplier: suppliers[2]._id,
            },
            {
                name: 'Portable SSD',
                description: '1TB portable SSD with high-speed data transfer.',
                price: 129.99,
                supplier: suppliers[2]._id,
            },
            {
                name: 'Smartphone Stand',
                description: 'Adjustable stand for smartphones and tablets.',
                price: 14.99,
                supplier: suppliers[2]._id,
            },
        ];


        await Product.insertMany(products);
        console.log('Products added successfully!');

    } catch (err) {
        console.error('Error seeding products:', err);
    } finally {
  
        mongoose.connection.close();
    }
};


seedProducts();