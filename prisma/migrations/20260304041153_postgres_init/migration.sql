-- CreateTable
CREATE TABLE "config" (
    "id" SERIAL NOT NULL,
    "nomEcole" TEXT NOT NULL DEFAULT '',
    "annee" TEXT NOT NULL DEFAULT '',
    "nomDirecteur" TEXT NOT NULL DEFAULT '',
    "localite" TEXT NOT NULL DEFAULT '',
    "nomMaitre" TEXT NOT NULL DEFAULT '',
    "classeActive" TEXT NOT NULL DEFAULT 'CI',
    "divActive" TEXT NOT NULL DEFAULT 'A',

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matieres" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "coef" INTEGER NOT NULL DEFAULT 1,
    "bareme" INTEGER NOT NULL DEFAULT 20,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eleves" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "div" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eleves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" SERIAL NOT NULL,
    "eleveId" INTEGER NOT NULL,
    "matiereId" INTEGER NOT NULL,
    "compo" INTEGER NOT NULL,
    "valeur" DOUBLE PRECISION,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appreciations" (
    "id" SERIAL NOT NULL,
    "eleveId" INTEGER NOT NULL,
    "compo" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,

    CONSTRAINT "appreciations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eleves_niveau_div_idx" ON "eleves"("niveau", "div");

-- CreateIndex
CREATE INDEX "notes_eleveId_compo_idx" ON "notes"("eleveId", "compo");

-- CreateIndex
CREATE UNIQUE INDEX "notes_eleveId_matiereId_compo_key" ON "notes"("eleveId", "matiereId", "compo");

-- CreateIndex
CREATE UNIQUE INDEX "appreciations_eleveId_compo_key" ON "appreciations"("eleveId", "compo");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "eleves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appreciations" ADD CONSTRAINT "appreciations_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "eleves"("id") ON DELETE CASCADE ON UPDATE CASCADE;
