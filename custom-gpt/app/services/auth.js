import connectDB from "../lib/db.js";
import { User } from "../models/user.js";
import bcrypt from "bcryptjs";
import { generateOTP, sendVerificationEmail, sendPasswordResetEmail, sendInvitationEmail } from "./mail.js";
import {  getUserFromSession } from "../lib/session.js";
import mongoose from "mongoose";

const SignupUser = async (name, email, password) => {
  await connectDB();
  try {
    if (!name || !email || !password) {
      throw new Error("All fields are required");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new Error("User already exists");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = generateOTP();
    const verificationTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      verificationToken,
      verificationTokenExpiresAt,
      isVerified: false,
      isActive: true,
    });

    // Send verification email
    await sendVerificationEmail(email, name, verificationToken);

    return {
      success: true,
      message: "Account created successfully! Please check your email for verification.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    }
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
}

const LoginUser = async (email, password) => {
  await connectDB();
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account has been deactivated');
    }

    // If user is not verified, regenerate verification token and send email
    if (!user.isVerified) {
      const verificationToken = generateOTP();
      const verificationTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      user.verificationToken = verificationToken;
      user.verificationTokenExpiresAt = verificationTokenExpiresAt;
      await user.save();

      await sendVerificationEmail(user.email, user.name, verificationToken);

      return {
        success: false,
        message: 'Please verify your email. A new verification code has been sent.',
        requireVerification: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        }
      };
    }

    return {
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
    };

  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Failed to log in');
  }
};

const verifyEmail = async ({ email, token }) => {
  await connectDB();
  try {

    if (!email || !token) {
      throw new Error("Email and token are required");
    }

    const user = await User.findOne({
      email,
      verificationToken: token,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    return {
      success: true,
      message: "Email verified successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      }
    };
  } catch (error) {
    console.error('Email verification error:', error);
    throw new Error(error.message || 'Failed to verify email');
  }
}

const requestPasswordReset = async (email) => {
  await connectDB();
  try {
    if (!email) {
      throw new Error("Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const resetToken = generateOTP();
    const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;
    await user.save();

    await sendPasswordResetEmail(user.email, user.name, resetToken);

    return {
      success: true,
      message: "Password reset email sent successfully",
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    throw new Error(error.message || 'Failed to request password reset');
  }
}

const resetPassword = async ({ email, token, newPassword }) => {
  await connectDB();
  try {
    if (!email || !token || !newPassword) {
      throw new Error("Email, token and new password are required");
    }

    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    return {
      success: true,
      message: "Password reset successfully",
    };

  } catch (error) {
    console.error('Password reset error:', error);
    throw new Error(error.message || 'Failed to reset password');
  }
}

const logoutUser = async (request) => {
  const user = await getUserFromSession(request);
  return {
    success: true,
    message: "Logged out successfully",
    session: {
      ...user,
      userId: null,
    }
  };
}

const requiredAuth = async (request, env) => {
  const user = await getUserFromSession(request, env);
  const userId = user?._id || user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  try {
    const dbUser = await User.findById(userId);
    if (!dbUser) {
      throw new Error("User not found");
    }

    return {
      success: true,
      message: "User authenticated successfully",
      user: dbUser,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error(error.message || 'Failed to authenticate user');
  }
}

const requiredVerification = async (request, env) => {
  try {
    const authResult = await requiredAuth(request, env);

    if (!authResult.user.isVerified) {
      throw new Error("Email not verified");
    }

    return {
      success: true,
      message: "User verified successfully",
      user: authResult.user,
    };
  } catch (error) {
    console.error('Verification error:', error);
    throw new Error(error.message || 'Failed to verify user');
  }
}

export const getAllUsers = async () => {
  await connectDB();

  try {
    const users = await User.find({
      isActive: { $ne: false } // This will include users where isActive is true or undefined
    }).select('-password').sort({ createdAt: -1 });

    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

export const getUserById = async (userId) => {
  await connectDB();

  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const user = await User.findOne({
      _id: userId,
      isActive: { $ne: false } // Only get active users
    }).select('-password -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt');

    if (!user) {
      return null; // Return null instead of throwing error for better handling
    }

    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null; // Return null on error instead of throwing
  }
};

// Create invitation model if it doesn't exist
const InvitationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, default: 'user' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

const Invitation = mongoose.model('Invitation', InvitationSchema);

const inviteTeamMember = async (email, role, invitedBy) => {
  await connectDB();

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if invitation already exists and is still valid
    const existingInvitation = await Invitation.findOne({
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      throw new Error('An active invitation already exists for this email');
    }

    // Create invitation token
    const token = generateOTP() + Date.now().toString().slice(-6);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Save invitation to database
    const invitation = await Invitation.create({
      email,
      role,
      invitedBy,
      token,
      expiresAt
    });

    // Get inviter name
    const inviter = await User.findById(invitedBy);
    const inviterName = inviter ? inviter.name : 'Team Admin';

    // Create invitation link
    const invitationLink = `${process.env.APP_URL || 'http://localhost:5173'}/accept-invitation?token=${token}&email=${encodeURIComponent(email)}`;

    // Send invitation email
    const emailResult = await sendInvitationEmail(email, inviterName, invitationLink, role);

    if (!emailResult.success) {
      // Delete the invitation if email failed
      await Invitation.findByIdAndDelete(invitation._id);
      throw new Error('Failed to send invitation email');
    }

    return {
      success: true,
      message: 'Invitation sent successfully',
      invitationId: invitation._id
    };

  } catch (error) {
    console.error('Invitation error:', error);
    throw new Error(error.message || 'Failed to send invitation');
  }
};

const acceptInvitation = async (token, email, userData) => {
  await connectDB();

  try {
    // Find valid invitation
    const invitation = await Invitation.findOne({
      email,
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Create user account
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const newUser = await User.create({
      name: userData.name,
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role,
      isVerified: true, // Auto-verify invited users
      isActive: true
    });

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    return {
      success: true,
      message: 'Account created successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified
      }
    };

  } catch (error) {
    console.error('Accept invitation error:', error);
    throw new Error(error.message || 'Failed to accept invitation');
  }
};

const updateUserPermissions = async (userId, updates) => {  
  await connectDB();

  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...updates,
        updatedAt: new Date()
      },
      { new: true }
    );

    return {
      success: true,
      message: 'Permissions updated successfully',
      user: updatedUser
    };

  } catch (error) {
    console.error('Update permissions error:', error);
    throw new Error(error.message || 'Failed to update permissions');
  }
};

const removeTeamMember = async (userId) => {
  await connectDB();

  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Store email before deletion for invitation cleanup
    const userEmail = user.email;

    await User.findByIdAndDelete(userId);

    await Invitation.deleteMany({ email: userEmail });

    return {
      success: true,
      message: 'Member removed successfully'
    };

  } catch (error) {
    console.error('Remove member error:', error);
    throw new Error(error.message || 'Failed to remove member');
  }
};

const saveApiKeys = async (userId, apiKeys) => {
  await connectDB();

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (!apiKeys || Object.keys(apiKeys).length === 0) {
      throw new Error("API keys are required and must be an object with at least one key");
    }
    if (user.role !== "admin") {
      throw new Error("You are not authorized to save API keys");
    }

    // Encrypt each API key individually
    const encryptedApiKeys = {};
    const salt = await bcrypt.genSalt(10);
    
    for (const [provider, key] of Object.entries(apiKeys)) {
      if (key && key.trim() !== '') {
        encryptedApiKeys[provider] = await bcrypt.hash(key, salt);
      }
    }

    // Update or create apiKeys
    user.apiKeys = encryptedApiKeys;
    await user.save();

    return {
      success: true,
      message: 'API keys saved successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasApiKeys: Object.keys(encryptedApiKeys).length > 0
      }
    };
  } catch (error) {
    console.error('Save API keys error:', error);
    throw new Error(error.message || 'Failed to save API keys');
  }
};

const getApiKeys = async (userId) => {
  await connectDB();

  try{
    const user = await User.findById(userId);
    if(!user){
      throw new Error("User not found");
    }
    if(user.role !== "admin"){
      throw new Error("You are not authorized to get API keys");
    }
    
    if(!user.apiKeys || typeof user.apiKeys !== 'object' || Object.keys(user.apiKeys).length === 0){
      return {
        success: true,
        apiKeys: {
          openai: '',
          claude: '',
          gemini: '',
          llama: ''
        }
      };
    }

    // Return masked API keys for display (we can't decrypt bcrypt hashes)
    const maskedApiKeys = {};
    for (const [provider, hashedKey] of Object.entries(user.apiKeys)) {
      maskedApiKeys[provider] = hashedKey ? '••••••••••••••••' : '';
    }

    return {
      success: true,
      apiKeys: {
        openai: maskedApiKeys.openai || '',
        claude: maskedApiKeys.claude || '',
        gemini: maskedApiKeys.gemini || '',
        llama: maskedApiKeys.llama || ''
      }
    };
  } catch (error) {
    console.error('Get API keys error:', error);
    throw new Error(error.message || 'Failed to get API keys');
  }
}

const updateApiKeys = async (userId, apiKeys) => {
  await connectDB();

  try{
    const user = await User.findById(userId);
    if(!user){
      throw new Error("User not found");
    }
    if(user.role !== "admin"){
      throw new Error("You are not authorized to update API keys");
    }
    if(!apiKeys || typeof apiKeys !== 'object'){
      throw new Error("API keys are required and must be an object");
    }

    // Encrypt each API key individually
    const encryptedApiKeys = user.apiKeys || {};
    const salt = await bcrypt.genSalt(10);
    
    for (const [provider, key] of Object.entries(apiKeys)) {
      if (key && key.trim() !== '' && key !== '••••••••••••••••') {
        // Only update if it's a new key (not the masked placeholder)
        encryptedApiKeys[provider] = await bcrypt.hash(key, salt);
      } else if (key === '') {
        // Remove the key if empty string is provided
        delete encryptedApiKeys[provider];
      }
    }

    user.apiKeys = encryptedApiKeys;
    await user.save();

    return {
      success: true,
      message: 'API keys updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasApiKeys: Object.keys(encryptedApiKeys).length > 0
      }
    };
  } catch (error) {
    console.error('Update API keys error:', error);
    throw new Error(error.message || 'Failed to update API keys');
  }
}

export const updateUserProfile = async (userId, profileData) => {
  await connectDB();
  
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { name, email } = profileData;

    if (!name || !email) {
      throw new Error("Name and email are required");
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        throw new Error("Email is already taken");
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        name, 
        email, 
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  } catch (error) {
    throw error;
  }
};

export const updateUserPassword = async (userId, currentPassword, newPassword) => {
  await connectDB();
  
  try {
    if (!userId || !currentPassword || !newPassword) {
      throw new Error("All password fields are required");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const uploadProfilePicture = async (userId, imageFile) => {
  await connectDB();
  
  try {
    if (!userId || !imageFile) {
      throw new Error("User ID and image file are required");
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      throw new Error("File must be an image");
    }

    // Validate file size (5MB limit)
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error("Image file size must not exceed 5MB");
    }

    // Here you would typically upload the file to a cloud storage service
    // like AWS S3, Cloudinary, etc. For demonstration, we'll create a simple file save
    
    // Convert file to buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = imageFile.name.split('.').pop();
    const filename = `profile_${userId}_${timestamp}.${fileExtension}`;
    
    // In a real application, you would upload to cloud storage
    // For now, we'll just create a placeholder URL
    const profilePicUrl = `/uploads/profiles/${filename}`;
    
    // Update user with new profile picture URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        profilePic: profilePicUrl,
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  } catch (error) {
    throw error;
  }
};

export {
  SignupUser,
  LoginUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  logoutUser,
  requiredAuth,
  requiredVerification,
  getAllUsers,
  getUserById,
  inviteTeamMember,
  acceptInvitation,
  updateUserPermissions,
  removeTeamMember,
  saveApiKeys,
  getApiKeys,
  updateApiKeys
};