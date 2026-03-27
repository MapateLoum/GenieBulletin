// src/types/index.ts

export type Niveau = '6ème' | '5ème' | '4ème' | '3ème' | '2nde' | '1ère' | 'Tle'
export type Division = 'A' | 'B' | 'C' | 'D'
export type Sexe = 'G' | 'F'
export type NumCompo = 1 | 2 | 3

export interface Config {
  id: number
  nomEcole: string
  annee: string
  nomDirecteur: string
  localite: string
  nomMaitre: string
  classeActive: string
  divActive: string
}

export interface Matiere {
  id: number
  nom: string
  coef: number
  bareme: number
  ordre: number
  niveau: string
  div: string
  compo: number
  groupeNom: string | null
}

export interface Eleve {
  id: number
  nom: string
  sexe: Sexe
  niveau: Niveau
  div: Division
}

export interface Note {
  id: number
  eleveId: number
  matiereId: number
  compo: number
  valeur: number | null
}

export interface Appreciation {
  id: number
  eleveId: number
  compo: number
  texte: string
}

export interface EleveMoyenne extends Eleve {
  moyenne: number | null
  rang: number | null
  mention: Mention
  aMoyenne: boolean
}

export interface Mention {
  label: string
  cls: string
}

export interface SyntheseStats {
  effectif: number
  moyenneClasse: number | null
  avecMoyenne: number
  sansMoyenne: number
  maxMoyenne: number | null
  minMoyenne: number | null
}

export interface MatiereStats {
  matiere: Matiere
  moyenneClasse: number | null
  max: number | null
  min: number | null
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}