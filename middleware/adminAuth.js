// Middleware to check if user has admin role
const adminAuth = (req, res, next) => {
    // Check if user exists and has a role (should be set by auth middleware)
    if (!req.user || !req.user.role) {
        return res.status(401).json({ message: 'Access denied: User not authenticated or role not found' });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }

    // If user is admin, proceed to the next middleware
    next();
};

module.exports = adminAuth; 