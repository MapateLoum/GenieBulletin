// src/app/api/matieres/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    if (session.user.role === 'maitre') {
      const mat = await prisma.matiere.findUnique({ where: { id } })
      if (!mat || mat.niveau !== session.user.niveau || mat.div !== session.user.div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    await prisma.matiere.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id: rawId } = await params
    const id = parseInt(rawId)

    if (session.user.role === 'maitre') {
      const mat = await prisma.matiere.findUnique({ where: { id } })
      if (!mat || mat.niveau !== session.user.niveau || mat.div !== session.user.div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    const body = await req.json()

    const updateData: Record<string, any> = {}
    if (body.nom    !== undefined) updateData.nom    = body.nom
    if (body.bareme !== undefined) updateData.bareme = body.bareme

    const matiere = await prisma.matiere.update({ where: { id }, data: updateData })
    return NextResponse.json(matiere)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}