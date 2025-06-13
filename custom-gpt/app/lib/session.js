import { createCookieSessionStorage } from '@remix-run/cloudflare';
import { dbUtils } from './db.js';
import { ObjectId } from 'mongodb';

export function createSessionStorage(env) {
  // Get SESSION_SECRET with fallback for development
  const sessionSecret = env.SESSION_SECRET;
  
  if (!sessionSecret) {
    if (env.NODE_ENV === 'development') {
      console.warn('⚠️  SESSION_SECRET not found, using development fallback');
      const fallbackSecret = 'dev-secret-key-minimum-32-characters-long-for-development-only';
      return createCookieSessionStorage({
        cookie: {
          name: '__session',
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secrets: [fallbackSecret],
          secure: false,
          maxAge: 60 * 60 * 24 * 5, // 5 days
        },
      });
    }
    throw new Error('SESSION_SECRET environment variable is required');
  }
  
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }

  return createCookieSessionStorage({
    cookie: {
      name: '__session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secrets: [sessionSecret],
      secure: env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 5, // 5 days
    },
  });
}

export async function getUserFromSession(request, env) {
  try {
    const sessionStorage = createSessionStorage(env);
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));
    const userId = session.get('userId');
    
    if (!userId) {
      return null;
    }

    // Check if we have a valid database connection
    if (!env.MONGODB_URI) {
      console.warn('⚠️  No database connection available');
      return null;
    }

    const user = await dbUtils.findOne(env, 'users', { 
      _id: new ObjectId(userId),
      isActive: { $ne: false }
    });
    
    if (!user) {
      return null;
    }
    
    return {
      id: user._id.toString(),
      _id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      isActive: user.isActive,
      profilePic: user.profilePic || '',
    };
  } catch (error) {
    console.error('Error fetching user from session:', error);
    return null;
  }
}

export async function createUserSession(userId, userRole, redirectTo, env) {
  const sessionStorage = createSessionStorage(env);
  const session = await sessionStorage.getSession();
  session.set('userId', userId.toString());
  session.set('userRole', userRole);
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export async function destroySession(request, env) {
  const sessionStorage = createSessionStorage(env);
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}

// Add the missing logout function
export async function logout(request, env) {
  return destroySession(request, env);
}