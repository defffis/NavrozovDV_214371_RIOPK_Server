/**
 * Middleware для проверки роли пользователя
 * @param {Array} allowedRoles - массив разрешенных ролей
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // Проверяем, что пользователь аутентифицирован
        if (!req.user) {
            return res.status(401).json({ message: 'Требуется аутентификация' });
        }
        
        // Проверяем, что роль пользователя входит в список разрешенных
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: 'Доступ запрещен', 
                details: `Требуется одна из ролей: ${allowedRoles.join(', ')}` 
            });
        }
        
        // Если проверка пройдена, переходим к следующему middleware
        next();
    };
};

module.exports = { checkRole }; 