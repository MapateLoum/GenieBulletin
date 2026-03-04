// src/app/api/utilisateurs/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function checkDirecteur() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'directeur') return false
  return true
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await checkDirecteur()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    // Empêcher la suppression du directeur
    const user = await prisma.user.findUnique({ where: { id } })
    if (user?.role === 'directeur') {
      return NextResponse.json({ error: 'Impossible de supprimer le directeur' }, { status: 403 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}