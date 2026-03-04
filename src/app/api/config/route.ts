// src/app/api/config/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ConfigSchema = z.object({
  nomEcole:     z.string().max(200).optional(),
  annee:        z.string().max(20).optional(),
  nomDirecteur: z.string().max(100).optional(),
  localite:     z.string().max(100).optional(),
  nomMaitre:    z.string().max(100).optional(),
  classeActive: z.string().max(5).optional(),
  divActive:    z.string().max(2).optional(),
})

async function getOrCreateConfig() {
  let config = await prisma.config.findFirst()
  if (!config) {
    config = await prisma.config.create({
      data: { nomEcole: '', annee: '2025 - 2026', nomDirecteur: '', localite: '', nomMaitre: '', classeActive: 'CI', divActive: 'A' },
    })
  }
  return config
}

// Tout le monde peut lire la config (nom école, année, etc.)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const config = await getOrCreateConfig()
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Seul le directeur peut modifier la config
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.role !== 'directeur') {
      return NextResponse.json({ error: 'Seul le directeur peut modifier la configuration' }, { status: 403 })
    }

    const body = await req.json()
    const data = ConfigSchema.parse(body)
    const config = await getOrCreateConfig()
    const updated = await prisma.config.update({ where: { id: config.id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}