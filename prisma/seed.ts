// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Config par défaut ─────────────────────────────────────
  const configCount = await prisma.config.count()
  if (configCount === 0) {
    await prisma.config.create({
      data: {
        nomEcole: '',
        annee: '2025 - 2026',
        nomDirecteur: '',
        localite: '',
        nomMaitre: '',
        classeActive: 'CI',
        divActive: 'A',
      },
    })
    console.log('✅ Config créée')
  }

  // ── Compte directeur ──────────────────────────────────────
  const directeurExiste = await prisma.user.findUnique({
    where: { email: 'directeur@geniebulletin.sn' }
  })

  if (!directeurExiste) {
    const hash = await bcrypt.hash('directeur123', 12)
    await prisma.user.create({
      data: {
        email: 'directeur@geniebulletin.sn',
        password: hash,
        nom: 'Directeur',
        role: 'directeur',
        niveau: null,
        div: null,
      }
    })
    console.log('✅ Compte directeur créé')
    console.log('📧 Email    : directeur@geniebulletin.sn')
    console.log('🔑 Password : directeur123')
    console.log('⚠️  Changez le mot de passe après la première connexion !')
  } else {
    console.log('✅ Directeur existe déjà')
  }

  console.log('🎉 Seed terminé !')
  console.log('ℹ️  Les matières sont maintenant créées par chaque maître dans sa classe.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })