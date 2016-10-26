var mongoose = require('mongoose');

/**
 * OP Schema
 */
const OpSchema = new mongoose.Schema({
    process: Number,
    insert: Number,
    updated: Number,
    total: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports= mongoose.model('OP', OpSchema);