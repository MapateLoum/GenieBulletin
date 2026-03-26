// src/middleware.ts  ← nom exact obligatoire
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {  // ← nom exact obligatoire
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/configuration/:path*',
    '/eleves/:path*',
    '/notes/:path*',
    '/synthese/:path*',
    '/bulletins/:path*',
    '/utilisateurs/:path*',
  ],
}