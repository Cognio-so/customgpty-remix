import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    gptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CustomGpt",
        required: true
    },
    gptName: {
        type: String,
        required: true
    },
    messages: [messageSchema],
    lastMessage: {
        type: String,
        default: ""
    },
    model: {
        type: String,
        default: "openrouter/auto"
    },
    summary: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient queries
conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, isActive: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema); 