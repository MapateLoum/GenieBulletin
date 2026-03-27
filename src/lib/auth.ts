// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    niveau: string | null
    div: string | null
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 2 * 60 * 60 }, // expire après 2h

  pages: { signIn: '/login' },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',        type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id: String(user.id),
          email: user.email,
          name: user.nom,
          role: user.role,
          niveau: user.niveau,
          div: user.div,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role   = (user as any).role
        token.niveau = (user as any).niveau
        token.div    = (user as any).div
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any
        u.role   = token.role
        u.niveau = token.niveau
        u.div    = token.div
        u.id     = token.sub
      }
      return session
    },
  },
}