import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig, isAdminRole, type AdminRole } from '@/auth.config';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/db/password';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
} from '@/lib/auth/rate-limiter';

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

      async authorize(credentials, request) {
        const email =
          typeof credentials?.email === 'string'
            ? credentials.email.trim().toLowerCase()
            : '';
        const password =
          typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !password) {
          return null;
        }

        const req = request as Request | undefined;

        if (req) {
          const rateLimit = checkRateLimit(req, email);

          if (!rateLimit.allowed) {
            return null;
          }
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
          await verifyPassword(password, DUMMY_PASSWORD_HASH);
          if (req) recordFailedAttempt(req, email);
          return null;
        }

        const passwordIsValid = await verifyPassword(
          password,
          user.passwordHash
        );

        if (!passwordIsValid) {
          if (req) recordFailedAttempt(req, email);
          return null;
        }

        if (!isAdminRole(user.role)) {
          if (req) recordFailedAttempt(req, email);
          return null;
        }

        if (req) resetAttempts(req, email);

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? '';
        if (isAdminRole(token.role)) {
          session.user.role = token.role;
        }
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
      }
      return session;
    },
  },
});
