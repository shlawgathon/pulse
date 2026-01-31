import { Hono } from 'hono';
import { AuthenticatedContext, authMiddleware } from '../middleware/auth.js';
import { db, userPreferences, users } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const userRoute = new Hono();

userRoute.get('/api/user/preferences', authMiddleware, async (c) => {
  const authC = c as unknown as AuthenticatedContext;

  try {
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, authC.user.id),
      columns: {
        displayName: true,
        traits: true,
        notes: true,
      },
    });

    if (prefs) {
      return c.json({ success: true, preferences: prefs });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, authC.user.id),
      columns: { name: true },
    });

    return c.json({
      success: true,
      preferences: {
        displayName: user?.name || '',
        traits: [],
        notes: '',
      },
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'Failed to load preferences' }, 500);
  }
});

userRoute.put('/api/user/preferences', authMiddleware, async (c) => {
  const authC = c as unknown as AuthenticatedContext;

  try {
    const body = await c.req.json();
    let { displayName, traits, notes } = body as {
      displayName?: string;
      traits?: string[] | string | null;
      notes?: string;
    };

    if (typeof displayName !== 'string') displayName = undefined;
    if (typeof notes !== 'string') notes = undefined;

    let normalizedTraits: string[] | null = null;
    if (Array.isArray(traits)) {
      normalizedTraits = traits
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t) => t.length > 0)
        .slice(0, 20);
    } else if (typeof traits === 'string') {
      normalizedTraits = traits
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .slice(0, 20);
    }

    const existing = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, authC.user.id),
    });

    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({
          displayName: displayName ?? existing.displayName,
          traits: normalizedTraits ?? existing.traits,
          notes: notes ?? existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, authC.user.id))
        .returning({ displayName: userPreferences.displayName, traits: userPreferences.traits, notes: userPreferences.notes });

      return c.json({ success: true, preferences: updated });
    }

    const [created] = await db
      .insert(userPreferences)
      .values({
        userId: authC.user.id,
        displayName: displayName || null,
        traits: normalizedTraits,
        notes: notes || null,
      })
      .returning({ displayName: userPreferences.displayName, traits: userPreferences.traits, notes: userPreferences.notes });

    return c.json({ success: true, preferences: created });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'Failed to save preferences' }, 400);
  }
});

export { userRoute as default };


