var mongoose = require('mongoose');

/**
 * User Schema
 */
const RecordSchema = new mongoose.Schema({
    CustomerId: {
        type: String,
        required: true
    },
    Name: {
        type: String,
        required: true,
    },
    CheckIn: {
        type: Date,
        required: true,
    },
    CheckOut: {
        type: Date,
        required: true,
    },
    Room: {
        type: String,
        required: true,
    },
    TotalNight: {
        type: String,
        required: true,
    },
    Market: {
        type: String,
        required: true,
    },
    Sales: {
        type: String,
        required: true,
    },
    Operation: {
        type: String,
        required: true,
    },
    Nationality: {
        type: String,
        required: true,
    },
    Status: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */
RecordSchema.method({
});

/**
 * Statics
 */
RecordSchema.statics = {
};

/**
 * @typedef User
 */

module.exports= mongoose.model('Record', RecordSchema);