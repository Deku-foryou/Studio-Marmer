import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig, isAdminRole, type AdminRole } from '@/auth.config';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/db/password';

/**
 * Full Auth.js setup — the only module that performs authentication work
 * against the database. Safe to import from Server Components, Route Handlers
 * and `proxy.ts` (via the exported `auth` wrapper); it must never be imported
 * into a Client Component.
 */

/**
 * A valid scrypt hash of a throwaway value.
 *
 * When an email does not exist we still run a verification against this hash so
 * that a missing account and a wrong password take the same amount of time.
 * Without it, response timing would reveal which emails are registered.
 */
const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$1sa1swtUP5SKjELWJ2zPZQ==$UqgG+6qfbC2p51tFPQEklmHqSvdbVeUesHmeUDRmozSBSZIjzteJ4lctRpm8FGtqkKjdxrXo0bK6E5+StHYPzQ==';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      id: 'credentials',
      name: 'Admin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      /**
       * Returns the user on success, or `null` on any failure.
       *
       * Every failure path returns `null`, which Auth.js surfaces as the single
       * generic `CredentialsSignin` error. The caller therefore cannot tell
       * whether the email is unknown, the password is wrong, or the account
       * lacks an allowed role.
       *
       * Neither the password nor the stored hash is ever logged or returned.
       */
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string'
            ? credentials.email.trim().toLowerCase()
            : '';
        const password =
          typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
          },
        });

        if (!user) {
          // Equalise timing against the "wrong password" path.
          await verifyPassword(password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const passwordIsValid = await verifyPassword(
          password,
          user.passwordHash
        );

        if (!passwordIsValid) {
          return null;
        }

        // Guard the role centrally. The enum only allows ADMIN | EDITOR today,
        // but this keeps the check explicit if the model ever changes.
        if (!isAdminRole(user.role)) {
          return null;
        }

        // Only these fields are handed to Auth.js. `passwordHash` stays server
        // side and is never returned.
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role as AdminRole,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Copies the identity from the sign-in payload into the JWT on first issue,
     * then relies on the token on subsequent requests.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },

    /**
     * Projects only the safe identity fields onto `session.user`.
     * `passwordHash` and the JWT itself are never exposed.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? '';
        session.user.role = isAdminRole(token.role) ? token.role : 'ADMIN';
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
      }
      return session;
    },
  },
});
