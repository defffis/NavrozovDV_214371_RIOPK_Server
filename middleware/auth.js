const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');

/**
 * Authentication middleware
 * Validates JWT token and attaches user data to request
 */
const auth = async (req, res, next) => {
    try {
        // Get the token from the request header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        console.log('[AUTH DEBUG] Checking token:', token ? `${token.substring(0, 10)}...` : 'No token');
        
        // If no token found and we're in development mode, use test user
        if (!token && process.env.NODE_ENV !== 'production') {
            // In development mode, check if an override user ID was provided
            // This allows frontend to simulate different users
            const testUserId = req.header('X-Test-User-ID');
            const testUserRole = req.header('X-Test-User-Role') || 'client';
            
            if (testUserId) {
                console.log(`[AUTH] Using test user ID: ${testUserId}, role: ${testUserRole}`);
                
                // Try to find the real user based on the test ID and role
                let testUser;
                try {
                    if (testUserRole === 'client') {
                        testUser = await Client.findById(testUserId);
                    } else if (testUserRole === 'supplier') {
                        testUser = await Supplier.findById(testUserId);
                    } else if (['employee', 'manager', 'admin'].includes(testUserRole)) {
                        testUser = await Employee.findById(testUserId);
                    }
                    
                    if (testUser) {
                        req.user = testUser;
                        req.user.role = testUserRole;
                        console.log(`[AUTH] Found test user: ${testUser.name}`);
                        return next();
                    }
                } catch (findError) {
                    console.error('[AUTH] Error finding test user:', findError);
                }
            }
            
            // Create a dummy admin user for testing, only if no specific test user provided
            console.log('[AUTH] Using default admin test user');
            req.user = {
                _id: '000000000000000000000000',
                name: '[TEST ADMIN USER - NOT A CLIENT]',
                email: 'test@example.com',
                role: 'admin'
            };
            return next();
        }
        
        // Normal authentication flow for when a token is available
        if (!token) {
            return res.status(401).json({ message: 'Требуется аутентификация' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_replace_in_production');
        console.log('[AUTH DEBUG] JWT decoded:', JSON.stringify(decoded));
        
        // Get user ID from token - could be 'id' or '_id'
        const userId = decoded.id || decoded._id;
        
        if (!userId) {
            console.error('[AUTH ERROR] No user ID found in token');
            return res.status(401).json({ message: 'Invalid token - no user ID' });
        }
        
        const userRole = decoded.role || decoded.Role;
        
        if (!userRole) {
            console.error('[AUTH ERROR] No role found in token');
            return res.status(401).json({ message: 'Invalid token - no role' });
        }
        
        console.log(`[AUTH DEBUG] Looking for user with ID: ${userId}, role: ${userRole}`);
        
        let user;
        // Handle different collections based on role
        if (userRole === 'client') {
            user = await Client.findById(userId);
        } else if (userRole === 'employee' || userRole === 'manager') {
            user = await Employee.findById(userId);
        } else if (userRole === 'admin') {
            // First try to find in Employee collection (regular admins)
            user = await Employee.findById(userId);
            
            // If not found and potentially the special admin user (like admin@gmail.com)
            if (!user) {
                // Then check in Client collection for the special admin user
                user = await Client.findById(userId);
                console.log('[AUTH DEBUG] Admin not found in Employee collection, checked Client collection:', user ? 'found' : 'not found');
            }
        } else if (userRole === 'supplier') {
            user = await Supplier.findById(userId);
        }
        
        if (!user) {
            console.error(`[AUTH ERROR] User not found with ID: ${userId}, role: ${userRole}`);
            throw new Error('Пользователь не найден');
        }
        
        console.log(`[AUTH SUCCESS] User found: ${user.name}, role: ${userRole}`);
        
        req.token = token;
        req.user = user;
        req.user.role = userRole; // Ensure the role is set
        
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        res.status(401).json({ message: 'Ошибка аутентификации' });
    }
};

module.exports = auth; 