// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Config par défaut
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

  // Matières par défaut (programme Sénégal primaire)
  const matiereCount = await prisma.matiere.count()
  if (matiereCount === 0) {
    await prisma.matiere.createMany({
      data: [
        { nom: "Langue et Communication",   coef: 4, bareme: 10, ordre: 1 },
        { nom: "Mathématiques",             coef: 4, bareme: 10, ordre: 2 },
        { nom: "Sciences d'Observation",    coef: 2, bareme: 10, ordre: 3 },
        { nom: "Histoire-Géographie",       coef: 2, bareme: 10, ordre: 4 },
        { nom: "Instruction Civique",       coef: 1, bareme: 10, ordre: 5 },
        { nom: "Dessin / Travaux Manuels",  coef: 1, bareme: 10, ordre: 6 },
        { nom: "Éducation Physique",        coef: 1, bareme: 10, ordre: 7 },
      ],
    })
    console.log('✅ Matières créées')
  }

  console.log('🎉 Seed terminé!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
