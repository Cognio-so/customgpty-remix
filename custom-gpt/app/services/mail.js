import nodemailer from 'nodemailer';

// Configure transporter based on environment
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Generate a random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
export const sendVerificationEmail = async (email, username, token) => {
  const mailOptions = {
    from: `"MyGpt.work" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your Email - MyGpt.work',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; background: linear-gradient(to right, #0a0a0a, #151515); color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/vaanipro.png" alt="MyGpt.work Logo" style="width: 120px;" />
          <h1 style="margin: 10px 0; background: linear-gradient(to right, #cc2b5e, #753a88); -webkit-background-clip: text; color: transparent; display: inline-block;">Email Verification</h1>
        </div>
        <p style="margin-bottom: 15px;">Hello ${username},</p>
        <p style="margin-bottom: 20px;">Thank you for signing up with MyGpt.work. Please verify your email by entering the following verification code:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 15px 30px; background: linear-gradient(to right, #cc2b5e, #753a88); color: white; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">${token}</div>
        </div>
        <p style="margin-bottom: 20px;">This code will expire in 30 minutes. If you didn't request this verification, please ignore this email.</p>
        <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">© ${new Date().getFullYear()} MyGpt.work. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  
  const mailOptions = {
    from: `"MyGpt.work" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password - MyGpt.work',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; background: linear-gradient(to right, #0a0a0a, #151515); color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/vaanipro.png" alt="MyGpt.work Logo" style="width: 120px;" />
          <h1 style="margin: 10px 0; background: linear-gradient(to right, #cc2b5e, #753a88); -webkit-background-clip: text; color: transparent; display: inline-block;">Password Reset</h1>
        </div>
        <p style="margin-bottom: 15px;">Hello ${username},</p>
        <p style="margin-bottom: 20px;">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 25px; background: linear-gradient(to right, #cc2b5e, #753a88); color: white; text-decoration: none; font-weight: bold; border-radius: 5px; text-transform: uppercase;">Reset Password</a>
        </div>
        <p style="margin-bottom: 20px;">This link will expire in 30 minutes. If you didn't request a password reset, please ignore this email.</p>
        <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">© ${new Date().getFullYear()} MyGpt.work. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error };
  }
};

// Send team invitation email
export const sendInvitationEmail = async (email, inviterName, invitationLink, role) => {
  const mailOptions = {
    from: `"MyGpt.work" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Team Invitation - MyGpt.work',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; background: linear-gradient(to right, #0a0a0a, #151515); color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/vaanipro.png" alt="MyGpt.work Logo" style="width: 120px;" />
          <h1 style="margin: 10px 0; background: linear-gradient(to right, #cc2b5e, #753a88); -webkit-background-clip: text; color: transparent; display: inline-block;">Team Invitation</h1>
        </div>
        <p style="margin-bottom: 15px;">Hello,</p>
        <p style="margin-bottom: 20px;">${inviterName} has invited you to join their team on MyGpt.work as a <strong>${role}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(to right, #cc2b5e, #753a88); color: white; text-decoration: none; font-weight: bold; border-radius: 8px; text-transform: uppercase;">Accept Invitation</a>
        </div>
        <p style="margin-bottom: 20px;">This invitation will expire in 7 days. If you didn't expect this invitation, please ignore this email.</p>
        <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">© ${new Date().getFullYear()} MyGpt.work. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error };
  }
}; 