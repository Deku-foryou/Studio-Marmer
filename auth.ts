import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig, isAdminRole } from '@/auth.config';
import { prisma } from '@/lib/db/prisma';
import { authorizeAdminCredentials } from '@/lib/auth/credentials';

/**
 * The credential check itself lives in `lib/auth/credentials.ts`.
 *
 * It was moved out of this file because the callback below is only reachable
 * once Auth.js has booted - importing `auth.ts` from a unit test fails on
 * `next-auth/lib/env.js` requiring `next/server`, which left the most
 * security-critical function in the project with no automated coverage at all.
 * The extracted module takes the user lookup as an argument; this file supplies
 * the real Prisma one, so production behaviour is unchanged.
 */
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
        return authorizeAdminCredentials(credentials, {
          request: request as Request | undefined,
          findUser: async (email) =>
            prisma.user.findUnique({
              where: { email },
              select: {
                id: true,
                name: true,
                email: true,
                passwordHash: true,
                role: true,
              },
            }),
        });
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
