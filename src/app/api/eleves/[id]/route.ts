// src/app/api/eleves/[id]/route.ts
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

    // Vérifier que l'élève appartient à la classe du maître
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