// server/routes/adminRoutes.js
const express = require('express');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const Contract = require('../models/Contract');
const Settings = require('../models/Settings');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { checkRole } = require('../middleware/checkRole');

const router = express.Router();



router.get('/dashboard', async (req, res) => {
    try {
        const [products, suppliers, clients, employees, contracts] = await Promise.all([
            Product.find(),
            Supplier.find(),
            Client.find(),
            Employee.find(),
            Contract.find()
        ]);

        const supplierProductStatuses = suppliers.map(supplier => {
            const supplierProducts = products.filter(p => p.supplier?.toString() === supplier._id.toString());
            const statuses = supplierProducts.reduce((acc, product) => {
                acc[product.status] = (acc[product.status] || 0) + 1;
                return acc;
            }, {});

            return {
                _id: supplier._id,
                email: supplier.email,
                statuses
            };
        });

        res.json({
            productsCount: products.length,
            suppliersCount: suppliers.length,
            clientsCount: clients.length,
            employeesCount: employees.length,
            contractsCount: contracts.length,
            suppliersWithProducts: suppliers.map(supplier => ({
                _id: supplier._id,
                email: supplier.email,
                productsCount: products.filter(p => p.supplier?.toString() === supplier._id.toString()).length
            })),
            supplierProductStatuses
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// User Management Routes

// GET all suppliers
router.get('/users/suppliers', async (req, res) => {
    try {
        const suppliers = await Supplier.find()
            .select('-password') // Exclude password from response
            .sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Server error while fetching suppliers' });
    }
});

// GET all clients
router.get('/users/clients', async (req, res) => {
    try {
        const clients = await Client.find()
            .select('-password') // Exclude password from response
            .sort({ createdAt: -1 });
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Server error while fetching clients' });
    }
});

// GET all employees
router.get('/users/employees', async (req, res) => {
    try {
        const employees = await Employee.find()
            .select('-password') // Exclude password from response
            .sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Server error while fetching employees' });
    }
});

// CREATE supplier
router.post('/users/suppliers', async (req, res) => {
    try {
        const { name, email, password, contactPerson, phone, address } = req.body;
        
        // Check if supplier already exists
        let supplier = await Supplier.findOne({ email });
        if (supplier) {
            return res.status(400).json({ message: 'Supplier with this email already exists' });
        }

        // Create new supplier
        supplier = new Supplier({
            name,
            email,
            password,
            contactPerson,
            phone,
            address
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        supplier.password = await bcrypt.hash(password, salt);

        await supplier.save();
        
        // Return supplier without password
        const result = supplier.toObject();
        delete result.password;
        
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ message: 'Server error while creating supplier' });
    }
});

// CREATE client
router.post('/users/clients', async (req, res) => {
    try {
        const { name, email, password, contactPerson, phone, address } = req.body;
        
        // Check if client already exists
        let client = await Client.findOne({ email });
        if (client) {
            return res.status(400).json({ message: 'Client with this email already exists' });
        }

        // Create new client
        client = new Client({
            name,
            email,
            password,
            contactPerson,
            phone,
            address
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        client.password = await bcrypt.hash(password, salt);

        await client.save();
        
        // Return client without password
        const result = client.toObject();
        delete result.password;
        
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ message: 'Server error while creating client' });
    }
});

// CREATE employee
router.post('/users/employees', async (req, res) => {
    try {
        const { name, email, password, position, department, phone } = req.body;
        
        // Check if employee already exists
        let employee = await Employee.findOne({ email });
        if (employee) {
            return res.status(400).json({ message: 'Employee with this email already exists' });
        }

        // Create new employee
        employee = new Employee({
            name,
            email,
            password,
            position,
            department,
            phone
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        employee.password = await bcrypt.hash(password, salt);

        await employee.save();
        
        // Return employee without password
        const result = employee.toObject();
        delete result.password;
        
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ message: 'Server error while creating employee' });
    }
});

// UPDATE supplier
router.put('/users/suppliers/:id', async (req, res) => {
    try {
        const { name, email, password, contactPerson, phone, address, status } = req.body;
        const supplierId = req.params.id;
        
        // Find supplier
        let supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        // Update fields
        supplier.name = name || supplier.name;
        supplier.email = email || supplier.email;
        supplier.contactPerson = contactPerson || supplier.contactPerson;
        supplier.phone = phone || supplier.phone;
        supplier.address = address || supplier.address;
        supplier.status = status || supplier.status;
        
        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            supplier.password = await bcrypt.hash(password, salt);
        }

        await supplier.save();
        
        // Return supplier without password
        const result = supplier.toObject();
        delete result.password;
        
        res.json(result);
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ message: 'Server error while updating supplier' });
    }
});

// UPDATE client
router.put('/users/clients/:id', async (req, res) => {
    try {
        const { name, email, password, contactPerson, phone, address, status } = req.body;
        const clientId = req.params.id;
        
        // Find client
        let client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        // Update fields
        client.name = name || client.name;
        client.email = email || client.email;
        client.contactPerson = contactPerson || client.contactPerson;
        client.phone = phone || client.phone;
        client.address = address || client.address;
        client.status = status || client.status;
        
        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            client.password = await bcrypt.hash(password, salt);
        }

        await client.save();
        
        // Return client without password
        const result = client.toObject();
        delete result.password;
        
        res.json(result);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Server error while updating client' });
    }
});

// UPDATE employee
router.put('/users/employees/:id', async (req, res) => {
    try {
        const { name, email, password, position, department, phone, status } = req.body;
        const employeeId = req.params.id;
        
        // Find employee
        let employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Update fields
        employee.name = name || employee.name;
        employee.email = email || employee.email;
        employee.position = position || employee.position;
        employee.department = department || employee.department;
        employee.phone = phone || employee.phone;
        employee.status = status || employee.status;
        
        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            employee.password = await bcrypt.hash(password, salt);
        }

        await employee.save();
        
        // Return employee without password
        const result = employee.toObject();
        delete result.password;
        
        res.json(result);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ message: 'Server error while updating employee' });
    }
});

// DELETE supplier
router.delete('/users/suppliers/:id', async (req, res) => {
    try {
        const supplierId = req.params.id;
        
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        await Supplier.findByIdAndDelete(supplierId);
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ message: 'Server error while deleting supplier' });
    }
});

// DELETE client
router.delete('/users/clients/:id', async (req, res) => {
    try {
        const clientId = req.params.id;
        
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        await Client.findByIdAndDelete(clientId);
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Server error while deleting client' });
    }
});

// DELETE employee
router.delete('/users/employees/:id', async (req, res) => {
    try {
        const employeeId = req.params.id;
        
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        await Employee.findByIdAndDelete(employeeId);
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Server error while deleting employee' });
    }
});

// Settings Management Routes

// GET system settings
router.get('/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        
        // If no settings exist, create default settings
        if (!settings) {
            settings = new Settings({
                general: {
                    siteName: 'SupplyBI',
                    siteDescription: 'Supply Chain Management System',
                    maintenanceMode: false,
                    allowRegistration: true,
                    maxUploadSize: 10,
                    defaultCurrency: 'RUB'
                },
                email: {
                    smtpServer: '',
                    smtpPort: 587,
                    smtpUsername: '',
                    smtpPassword: '',
                    senderEmail: 'noreply@example.com',
                    senderName: 'SupplyBI System'
                },
                security: {
                    sessionTimeout: 60,
                    maxLoginAttempts: 5,
                    passwordResetExpiry: 24,
                    requireEmailVerification: false,
                    twoFactorAuth: false
                },
                notifications: {
                    emailNotifications: true,
                    smsNotifications: false,
                    orderStatusChanges: true,
                    newOrderNotification: true,
                    paymentNotification: true,
                    systemAlerts: true
                }
            });
            await settings.save();
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Ошибка при получении настроек' });
    }
});

// UPDATE system settings
router.put('/settings', async (req, res) => {
    try {
        const updatedSettings = await Settings.findOneAndUpdate({}, req.body, { 
            new: true, 
            upsert: true 
        });
        
        res.json(updatedSettings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Ошибка при обновлении настроек' });
    }
});

module.exports = router;