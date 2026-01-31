import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { aiUsage, db, users, websiteUsers } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { generateToken, authMiddleware, AuthenticatedContext } from '../middleware/auth.js';
import { z } from 'zod';

const authRoute = new Hono();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRoute.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return c.json({ success: false, error: 'User already exists' }, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

    // Generate token
    const token = generateToken(user.id);

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: 'Invalid input data' }, 400);
    }
    console.error('Registration Error:', error);
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

authRoute.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = loginSchema.parse(body);

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.isActive) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Generate token
    const token = generateToken(user.id);

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: 'Invalid input data' }, 400);
    }
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

authRoute.get('/api/auth/me', authMiddleware, async (c) => {
  const authC = c as unknown as AuthenticatedContext;
  return c.json({
    success: true,
    user: authC.user,
  });
});

authRoute.delete('/api/auth/delete', authMiddleware, async (c) => {
  const authC = c as unknown as AuthenticatedContext;

  await db.delete(users).where(eq(users.id, authC.user.id));
  await db.delete(websiteUsers).where(eq(websiteUsers.userId, authC.user.id));
  await db.delete(aiUsage).where(eq(aiUsage.userId, authC.user.id));

  return c.json({
    success: true,
    user: authC.user,
  });
});

authRoute.get('/api/auth/github', async (c) => {
  if (!GITHUB_CLIENT_ID) {
    return c.json({ success: false, error: 'GitHub OAuth not configured' }, 500);
  }
  const url = new URL(c.req.url);
  const redirectParam = url.searchParams.get('redirect');
  const frontendRedirect = redirectParam || `${FRONTEND_URL}/auth/callback`;
  // Encode the desired frontend redirect inside state
  const state = Buffer.from(JSON.stringify({ r: frontendRedirect })).toString('base64url');
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI);
  authorizeUrl.searchParams.set('scope', 'read:user user:email');
  authorizeUrl.searchParams.set('state', state);
  return c.redirect(authorizeUrl.toString(), 302);
});

authRoute.get('/api/auth/github/callback', async (c) => {
  try {
    const reqUrl = new URL(c.req.url);
    const code = reqUrl.searchParams.get('code') || '';
    const stateParam = reqUrl.searchParams.get('state') || '';
    if (!code) {
      return c.json({ success: false, error: 'Missing code' }, 400);
    }
    let frontendRedirect = `${FRONTEND_URL}/auth/callback`;
    if (stateParam) {
      try {
        const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf8')) as { r?: string };
        if (decoded?.r) {
          frontendRedirect = decoded.r;
        }
      } catch {
        // ignore bad state
      }
    }
    // Exchange code for access token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });
    if (!tokenResp.ok) {
      return c.json({ success: false, error: 'Token exchange failed' }, 502);
    }
    const tokenJson = await tokenResp.json() as { access_token?: string; token_type?: string; scope?: string; error?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return c.json({ success: false, error: 'No access token from GitHub' }, 502);
    }
    // Fetch GitHub user
    const ghUserResp = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
      },
    });
    if (!ghUserResp.ok) {
      return c.json({ success: false, error: 'Failed to fetch GitHub user' }, 502);
    }
    const ghUser = await ghUserResp.json() as { id: number; login: string; name?: string | null; email?: string | null; avatar_url?: string };
    // Some users have email null -> fetch primary email
    let email = ghUser.email || '';
    if (!email) {
      const ghEmailsResp = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
        },
      });
      if (ghEmailsResp.ok) {
        const emails = await ghEmailsResp.json() as Array<{ email: string; primary: boolean; verified: boolean; visibility: string | null }>;
        const primary = emails.find(e => e.primary) || emails[0];
        if (primary?.email) email = primary.email;
      }
    }
    if (!email) {
      // Cannot proceed without email given current schema
      const failUrl = new URL(frontendRedirect);
      failUrl.searchParams.set('error', 'github_no_email');
      return c.redirect(failUrl.toString(), 302);
    }
    const displayName = ghUser.name || ghUser.login || email.split('@')[0];
    // Find or create user
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    let userId: string;
    if (existing) {
      userId = existing.id;
      // Optionally update name if blank
      if (!existing.name && displayName) {
        await db.update(users).set({ name: displayName }).where(eq(users.id, existing.id));
      }
    } else {
      const randomPassword = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      const [created] = await db.insert(users).values({
        email,
        password: hashedPassword,
        name: displayName,
      }).returning({
        id: users.id,
      });
      userId = created.id;
    }
    const jwt = generateToken(userId);
    const successUrl = new URL(frontendRedirect);
    successUrl.searchParams.set('token', jwt);
    return c.redirect(successUrl.toString(), 302);
  } catch (err) {
    return c.json({ success: false, error: 'GitHub OAuth failed' }, 500);
  }
});

export { authRoute }; 