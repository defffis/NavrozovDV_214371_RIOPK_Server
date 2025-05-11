/**
 * Role checking middleware factory
 * Returns middleware that checks if user has required role(s)
 * @param {string|string[]} roles - Single role or array of roles required for access
 */
exports.checkRole = (roles) => {
    return (req, res, next) => {
        // If NODE_ENV is not production, bypass role checking for testing
        if (process.env.NODE_ENV !== 'production') {
            return next();
        }
        
        // Ensure user exists and has a role
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'Требуется аутентификация' });
        }
        
        // Convert single role to array for consistent handling
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        // Special case: admin role has access to everything
        if (req.user.role === 'admin') {
            return next();
        }
        
        // Check if user's role is in the allowed roles
        if (allowedRoles.includes(req.user.role)) {
            return next();
        }
        
        res.status(403).json({ 
            message: 'Доступ запрещен',
            details: `Требуется роль: ${allowedRoles.join(' или ')}`
        });
    };
}; 