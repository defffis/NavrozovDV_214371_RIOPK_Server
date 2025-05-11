const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const mongoose = require('mongoose');

 

// Get all tasks
// Access: All employees and admin
router.get('/',   async (req, res) => {
    try {
        // Filter tasks based on user role and ID
        let query = {};
        
        // If employee, only show tasks assigned to them or created by them
        if (req.user.role === 'employee') {
            query = {
                $or: [
                    { assignedTo: req.user.id },
                    { createdBy: req.user.id }
                ]
            };
        }

        // Managers see all tasks
        // Admin sees all tasks
        
        const tasks = await Task.find(query)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a single task by ID
router.get('/:id', checkRole(['employee', 'admin', 'manager']), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');
            
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        // If employee, check if they have access to this task
        if (req.user.role === 'employee' && 
            task.assignedTo._id.toString() !== req.user.id && 
            task.createdBy._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new task
router.post('/', checkRole(['employee', 'admin', 'manager']), async (req, res) => {
    try {
        const { title, description, assignedTo, priority, status, dueDate, tags, related } = req.body;
        
        // Validate assigned user exists and is an employee
        const assignedEmployee = await Employee.findById(assignedTo);
        if (!assignedEmployee) {
            return res.status(400).json({ message: 'Invalid assigned employee' });
        }
        
        // Create new task
        const newTask = new Task({
            title,
            description,
            assignedTo,
            createdBy: req.user.id, // Set creator to current user
            priority: priority || 'Medium',
            status: status || 'Pending',
            dueDate,
            tags: tags || [],
            related: related || { type: 'None', id: null }
        });
        
        // If task is marked as completed on creation, set completedAt
        if (status === 'Completed') {
            newTask.completedAt = new Date();
        }
        
        await newTask.save();
        
        // Populate the employee data
        await newTask.populate('assignedTo', 'name email');
        await newTask.populate('createdBy', 'name email');
        
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a task by ID
router.put('/:id', checkRole(['employee', 'admin', 'manager']), async (req, res) => {
    try {
        const { title, description, assignedTo, priority, status, dueDate, tags, related } = req.body;
        
        // Find the task
        let task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        // If employee, check if they have access to update this task
        if (req.user.role === 'employee' && 
            task.assignedTo.toString() !== req.user.id && 
            task.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Validate assigned user exists if it's being changed
        if (assignedTo && assignedTo !== task.assignedTo.toString()) {
            const assignedEmployee = await Employee.findById(assignedTo);
            if (!assignedEmployee) {
                return res.status(400).json({ message: 'Invalid assigned employee' });
            }
        }
        
        // Update task fields
        if (title) task.title = title;
        if (description) task.description = description;
        if (assignedTo) task.assignedTo = assignedTo;
        if (priority) task.priority = priority;
        if (dueDate) task.dueDate = dueDate;
        if (tags) task.tags = tags;
        if (related) task.related = related;
        
        // Handle status change
        if (status && status !== task.status) {
            task.status = status;
            if (status === 'Completed' && !task.completedAt) {
                task.completedAt = new Date();
            } else if (status !== 'Completed') {
                task.completedAt = null;
            }
        }
        
        await task.save();
        
        // Populate the employee data
        await task.populate('assignedTo', 'name email');
        await task.populate('createdBy', 'name email');
        
        res.json(task);
    } catch (error) {
        console.error('Error updating task:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Update task status only
router.patch('/:id/status', checkRole(['employee', 'admin', 'manager']), async (req, res) => {
    try {
        const { status } = req.body;
        
        // Find the task
        let task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        // If employee, check if they have access to update this task
        if (req.user.role === 'employee' && 
            task.assignedTo.toString() !== req.user.id && 
            task.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Update status
        if (status && status !== task.status) {
            task.status = status;
            if (status === 'Completed' && !task.completedAt) {
                task.completedAt = new Date();
            } else if (status !== 'Completed') {
                task.completedAt = null;
            }
        }
        
        await task.save();
        
        // Populate the employee data
        await task.populate('assignedTo', 'name email');
        await task.populate('createdBy', 'name email');
        
        res.json(task);
    } catch (error) {
        console.error('Error updating task status:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a task by ID
router.delete('/:id', checkRole(['employee', 'admin', 'manager']), async (req, res) => {
    try {
        // Find the task
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        // If employee, check if they created this task
        if (req.user.role === 'employee' && task.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied: Only task creators can delete tasks' });
        }
        
        await task.remove();
        
        res.json({ message: 'Task removed' });
    } catch (error) {
        console.error('Error deleting task:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 