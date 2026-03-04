// src/app/api/config/route.ts
import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const config = await getOrCreateConfig()
    return NextResponse.json(config)
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const data = ConfigSchema.parse(body)
    const config = await getOrCreateConfig()
    const updated = await prisma.config.update({
      where: { id: config.id },
      data,
    })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
