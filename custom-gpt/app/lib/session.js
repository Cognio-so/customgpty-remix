import { createCookieSessionStorage } from '@remix-run/cloudflare';
import connectDB from './db.js';
import { User } from '../models/user.js';

if(!process.env.SESSION_SECRET){
  throw new Error('SESSION_SECRET is not set');
}

export function createSessionStorage(env) {
  return createCookieSessionStorage({
    cookie: {
      name: '__session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secrets: [process.env.SESSION_SECRET],
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 5, // 5 days
    },
  });
}

export async function getUserFromSession(request, env) {
  const sessionStorage = createSessionStorage(env);
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  const userRole = session.get('userRole');
  
  if (!userId) {
    return null;
  }

  // Actually verify the user exists in the database
  await connectDB();
  
  try {
    const user = await User.findOne({ 
      _id: userId,
      isActive: { $ne: false } // Only get active users
    }).select('-password -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt');
    
    if (!user) {
      // User no longer exists or is inactive, return null
      return null;
    }
    
    return {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      isActive: user.isActive,
    };
  } catch (error) {
    console.error('Error fetching user from session:', error);
    return null;
  }
}

export async function createUserSession(userId, userRole, redirectTo, env) {
  const sessionStorage = createSessionStorage(env);
  const session = await sessionStorage.getSession();
  session.set('userId', userId);
  session.set('userRole', userRole);
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request, env) {
  const sessionStorage = createSessionStorage(env);
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}