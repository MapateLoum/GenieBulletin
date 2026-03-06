// src/app/api/utilisateurs/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const UpdateSchema = z.object({
  nom:      z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
  niveau:   z.string().nullable().optional(),
  div:      z.string().nullable().optional(),
})

async function checkDirecteur() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'directeur') return false
  return true
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await checkDirecteur()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    if (user.role === 'directeur') return NextResponse.json({ error: 'Impossible de modifier le directeur' }, { status: 403 })

    const body = await req.json()
    const data = UpdateSchema.parse(body)

    // Vérifier email déjà utilisé par un autre
    if (data.email !== user.email) {
      const emailExiste = await prisma.user.findUnique({ where: { email: data.email } })
      if (emailExiste) return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
    }

    // Vérifier classe déjà occupée par un autre maître
    if (data.niveau && data.div) {
      const classeOccupee = await prisma.user.findFirst({
        where: { role: 'maitre', niveau: data.niveau, div: data.div, NOT: { id } },
      })
      if (classeOccupee) {
        return NextResponse.json(
          { error: `La classe ${data.niveau}${data.div} a déjà un maître (${classeOccupee.nom}).` },
          { status: 409 }
        )
      }
    }

    // Construire les données à mettre à jour
    const updateData: Record<string, unknown> = {
      nom:    data.nom,
      email:  data.email,
      niveau: data.niveau ?? null,
      div:    data.div    ?? null,
    }

    // Changer le mot de passe seulement si fourni
    if (data.password && data.password.length >= 6) {
      updateData.password = await bcrypt.hash(data.password, 12)
    }

    const updated = await prisma.user.update({
      where: { id },
      data:  updateData,
      select: { id: true, email: true, nom: true, role: true, niveau: true, div: true, createdAt: true },
    })

    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
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