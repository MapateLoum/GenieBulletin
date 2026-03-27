// src/app/api/eleves/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  nom:  z.string().min(1).max(150),
  sexe: z.enum(['G', 'F']),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const eleve = await prisma.eleve.findUnique({ where: { id } })
    if (!eleve) return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })

    if (session.user.role === 'maitre') {
      if (eleve.niveau !== session.user.niveau || eleve.div !== session.user.div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    const body = await req.json()
    const data = UpdateSchema.parse(body)

    const updated = await prisma.eleve.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const eleve = await prisma.eleve.findUnique({ where: { id } })
    if (!eleve) return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })

    if (session.user.role === 'maitre') {
      if (eleve.niveau !== session.user.niveau || eleve.div !== session.user.div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    await prisma.eleve.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}