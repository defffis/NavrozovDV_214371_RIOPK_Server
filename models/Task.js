const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    dueDate: {
        type: Date,
        required: true
    },
    completedAt: {
        type: Date
    },
    related: {
        type: {
            type: String,
            enum: ['Order', 'Product', 'Contract', 'None'],
            default: 'None'
        },
        id: {
            type: Schema.Types.ObjectId,
            default: null
        }
    },
    tags: [String],
    attachments: [{
        name: String,
        path: String,
        uploaded: Date
    }]
}, { timestamps: true });

// Virtual for assignedTo employee name
TaskSchema.virtual('assignedToName').get(function() {
    return this.assignedTo ? this.assignedTo.name : null;
});

// Set toJSON and toObject options to include virtuals
TaskSchema.set('toJSON', { virtuals: true });
TaskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Task', TaskSchema); 