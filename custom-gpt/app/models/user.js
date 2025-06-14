// User model schema definition for Cloudflare Workers
export const userSchemaDefinition = {
    name: {
        type: "string",
        required: true,
        minLength: 2,
        maxLength: 100
    },
    email: {
        type: "string",
        required: true,
        unique: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
        type: "string",
        required: true,
        minLength: 6
    },
    role: {
        type: "string",
        enum: ["admin", "user"],
        default: "user"
    },
    isActive: {
        type: "boolean",
        default: true
    },
    apiKeys: {
        type: "object",
        default: {}
    },
    isVerified: {
        type: "boolean",
        default: false
    },
    resetPasswordToken: {
        type: "string",
        optional: true
    },
    resetPasswordExpiresAt: {
        type: "date",
        optional: true
    },
    verificationToken: {
        type: "string",
        optional: true
    },
    verificationTokenExpiresAt: {
        type: "date",
        optional: true
    },
    profilePic: {
        type: "string",
        default: ""
    },
    createdAt: {
        type: "date",
        default: () => new Date()
    },
    updatedAt: {
        type: "date",
        default: () => new Date()
    }
};

// Validation function
export const validateUser = (userData) => {
    const errors = [];

    if (!userData.name || userData.name.length < 2) {
        errors.push("Name must be at least 2 characters long");
    }

    if (!userData.email || !userSchemaDefinition.email.pattern.test(userData.email)) {
        errors.push("Please provide a valid email address");
    }

    if (!userData.password || userData.password.length < 6) {
        errors.push("Password must be at least 6 characters long");
    }

    if (userData.role && !userSchemaDefinition.role.enum.includes(userData.role)) {
        errors.push("Invalid user role");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Create user document
export const createUserDocument = (userData) => {
    return {
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: userData.password,
        role: userData.role || userSchemaDefinition.role.default,
        isActive: userData.isActive !== undefined ? userData.isActive : userSchemaDefinition.isActive.default,
        apiKeys: userData.apiKeys || userSchemaDefinition.apiKeys.default,
        isVerified: userData.isVerified !== undefined ? userData.isVerified : userSchemaDefinition.isVerified.default,
        profilePic: userData.profilePic || userSchemaDefinition.profilePic.default,
        resetPasswordToken: userData.resetPasswordToken,
        resetPasswordExpiresAt: userData.resetPasswordExpiresAt,
        verificationToken: userData.verificationToken,
        verificationTokenExpiresAt: userData.verificationTokenExpiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
    };
};

// Collection name constant
export const USER_COLLECTION = 'users'; 