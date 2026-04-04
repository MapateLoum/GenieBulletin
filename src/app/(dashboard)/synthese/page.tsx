'use client'
// src/app/(dashboard)/synthese/page.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, SelectorBar, StatsGrid, StatCard } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import type { Niveau, Division, EleveMoyenne } from '@/types'

const COMPO_LABELS: Record<number, string> = {
  1: '1ère Composition', 2: '2ème Composition', 3: '3ème Composition'
}

type BilanAnnuel = {
  eleveId:         number
  nom:             string
  sexe:            string
  moyenneCompo1:   number | null
  moyenneCompo2:   number | null
  moyenneCompo3:   number | null
  moyenneAnnuelle: number | null
  rangAnnuel:      number | null
  decision:        string | null
}

type MatiereStat = {
  matiere: { id: number; nom: string; bareme: number; groupeNom?: string | null }
  moyenneClasse: number | null
  max: number | null
  min: number | null
  pctReussite: number | null
}

type GroupeStat = {
  nom: string
  baremeTotal: number
  moyenneClasse: number | null
  max: number | null
  min: number | null
  pctReussite: number | null
}

function buildGroupeStats(matiereStats: MatiereStat[]): { simples: MatiereStat[]; groupes: GroupeStat[] } {
  const simples: MatiereStat[] = []
  const groupeMap = new Map<string, MatiereStat[]>()

  for (const ms of matiereStats) {
    const g = ms.matiere.groupeNom
    if (g) {
      if (!groupeMap.has(g)) groupeMap.set(g, [])
      groupeMap.get(g)!.push(ms)
    } else {
      simples.push(ms)
    }
  }

  const groupes: GroupeStat[] = []
  groupeMap.forEach((membres, nom) => {
    const baremeTotal = membres.reduce((s, m) => s + m.matiere.bareme, 0)
    const avecMoy = membres.filter(m => m.moyenneClasse !== null)
    const moyenneClasse = avecMoy.length > 0
      ? Math.round(
          avecMoy.reduce((s, m) => s + (m.moyenneClasse! * m.matiere.bareme), 0) /
          avecMoy.reduce((s, m) => s + m.matiere.bareme, 0) * 100
        ) / 100
      : null
    const maxVals = membres.map(m => m.max).filter(v => v !== null) as number[]
    const minVals = membres.map(m => m.min).filter(v => v !== null) as number[]
    const avecPct = membres.filter((m: any) => m.pctReussite !== null)
    const pctReussite = avecPct.length
      ? Math.round(avecPct.reduce((s: number, m: any) => s + m.pctReussite!, 0) / avecPct.length)
      : null
    groupes.push({
      nom, baremeTotal, moyenneClasse,
      max: maxVals.length ? Math.max(...maxVals) : null,
      min: minVals.length ? Math.min(...minVals) : null,
      pctReussite,
    })
  })

  return { simples, groupes }
}

function buildEleveStats(eleves: EleveMoyenne[]) {
  const garcons = eleves.filter(e => e.sexe === 'G')
  const filles  = eleves.filter(e => e.sexe === 'F')

  const avecMoyenne = (arr: EleveMoyenne[]) => arr.filter(e => e.aMoyenne)
  const sansMoyenne = (arr: EleveMoyenne[]) => arr.filter(e => e.moyenne !== null && !e.aMoyenne)
  const taux = (arr: EleveMoyenne[]) => {
    const avecNote = arr.filter(e => e.moyenne !== null)
    if (!avecNote.length) return null
    return Math.round((avecMoyenne(arr).length / avecNote.length) * 100)
  }

  const mentionOrdre = ['Excellent', 'Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant']
  const mentionCls: Record<string, string> = {
    'Excellent': 'mention-excellent', 'Très Bien': 'mention-tbi',
    'Bien': 'mention-bi', 'Assez Bien': 'mention-ab',
    'Passable': 'mention-pc', 'Insuffisant': 'mention-insuf',
  }
  const mentionStats = mentionOrdre
    .map(label => ({
      label,
      cls: mentionCls[label],
      count: eleves.filter(e => e.mention?.label === label).length,
    }))
    .filter(m => m.count > 0)

  return { garcons, filles, avecMoyenne, sansMoyenne, taux, mentionStats }
}

function buildBilanEleveStats(eleves: BilanAnnuel[]) {
  const garcons = eleves.filter(e => e.sexe === 'G')
  const filles  = eleves.filter(e => e.sexe === 'F')

  const admis    = (arr: BilanAnnuel[]) => arr.filter(e => e.decision?.includes('Admis'))
  const redouble = (arr: BilanAnnuel[]) => arr.filter(e => e.decision === 'Redouble')
  const tauxAdmission = (arr: BilanAnnuel[]) => {
    if (!arr.length) return null
    return Math.round((admis(arr).length / arr.length) * 100)
  }

  const decisionsOrdre = ['Admis avec félicitations', 'Admis', 'Redouble']
  const decisionStats = decisionsOrdre
    .map(label => ({
      label,
      count: eleves.filter(e => e.decision === label).length,
    }))
    .filter(d => d.count > 0)

  const avecC1C2 = eleves.filter(e => e.moyenneCompo1 !== null && e.moyenneCompo2 !== null)
  const avecC2C3 = eleves.filter(e => e.moyenneCompo2 !== null && e.moyenneCompo3 !== null)
  const avecC1C3 = eleves.filter(e => e.moyenneCompo1 !== null && e.moyenneCompo3 !== null)

  const progressC1C2 = avecC1C2.filter(e => (e.moyenneCompo2 ?? 0) > (e.moyenneCompo1 ?? 0)).length
  const stableC1C2   = avecC1C2.filter(e => (e.moyenneCompo2 ?? 0) === (e.moyenneCompo1 ?? 0)).length
  const regressC1C2  = avecC1C2.filter(e => (e.moyenneCompo2 ?? 0) < (e.moyenneCompo1 ?? 0)).length

  const progressC2C3 = avecC2C3.filter(e => (e.moyenneCompo3 ?? 0) > (e.moyenneCompo2 ?? 0)).length
  const stableC2C3   = avecC2C3.filter(e => (e.moyenneCompo3 ?? 0) === (e.moyenneCompo2 ?? 0)).length
  const regressC2C3  = avecC2C3.filter(e => (e.moyenneCompo3 ?? 0) < (e.moyenneCompo2 ?? 0)).length

  const moyC1All = eleves.filter(e => e.moyenneCompo1 !== null)
  const moyC1 = moyC1All.length
    ? Math.round((moyC1All.reduce((s, e) => s + (e.moyenneCompo1 ?? 0), 0) / moyC1All.length) * 100) / 100
    : null
  const moyC2All = eleves.filter(e => e.moyenneCompo2 !== null)
  const moyC2 = moyC2All.length
    ? Math.round((moyC2All.reduce((s, e) => s + (e.moyenneCompo2 ?? 0), 0) / moyC2All.length) * 100) / 100
    : null
  const moyC3All = eleves.filter(e => e.moyenneCompo3 !== null)
  const moyC3 = moyC3All.length
    ? Math.round((moyC3All.reduce((s, e) => s + (e.moyenneCompo3 ?? 0), 0) / moyC3All.length) * 100) / 100
    : null

  return {
    garcons, filles, admis, redouble, tauxAdmission, decisionStats,
    progressC1C2, stableC1C2, regressC1C2,
    progressC2C3, stableC2C3, regressC2C3,
    avecC1C2, avecC2C3, avecC1C3,
    moyC1, moyC2, moyC3,
  }
}

export default function SynthesePage() {
  const [niveau, setNiveau] = useState<Niveau>('CI')
  const [div, setDiv] = useState<Division>('A')
  const [compo, setCompo] = useState(1)
  const [mode, setMode] = useState<'compo' | 'annuelle'>('compo')
  const [triggered, setTriggered] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['synthese', niveau, div, compo],
    queryFn: () => fetch(`/api/synthese?niveau=${niveau}&div=${div}&compo=${compo}`).then(r => r.json()),
    enabled: triggered && mode === 'compo',
    retry: false,
    staleTime: 0,
  })

  const { data: bilanAnnuel, isLoading: isLoadingAnnuel, refetch: refetchAnnuel } = useQuery<BilanAnnuel[]>({
    queryKey: ['synthese-annuelle', niveau, div],
    queryFn: async () => {
      const r = await fetch(`/api/synthese-annuelle?niveau=${niveau}&div=${div}`)
      if (!r.ok) return []
      return r.json()
    },
    enabled: triggered && mode === 'annuelle',
    retry: false,
    staleTime: 0,
  })

  function handleGenerate() {
    setTriggered(true)
    if (mode === 'compo') refetch()
    else refetchAnnuel()
  }

  function switchMode(m: 'compo' | 'annuelle') {
    setMode(m)
    setTriggered(false)
  }

  const printCSS = `
    * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { font-family:Arial,sans-serif; padding:1.5rem; color:#1a1a1a; font-size:0.85rem; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1a6b3a; padding-bottom:1rem; margin-bottom:1.2rem; }
    .titre { font-size:1.2rem; font-weight:700; color:#1a6b3a; text-align:center; }
    .sous-titre { font-size:0.82rem; color:#555; text-align:center; margin-top:3px; }
    .stats-grid { display:grid; gap:8px; margin-bottom:0.8rem; }
    .stat-box { border-radius:8px; padding:8px; text-align:center; color:#fff; }
    .stat-val { font-size:1.3rem; font-weight:700; }
    .stat-lbl { font-size:0.65rem; opacity:0.9; margin-top:2px; }
    .taux { background:#f0faf5; border:1px solid #c3e6cb; border-radius:6px; padding:8px 14px; margin-bottom:1rem; font-size:0.85rem; }
    .taux strong { color:#1a6b3a; font-size:1rem; }
    h3 { color:#1a6b3a; margin:1rem 0 0.6rem; font-size:0.9rem; border-left:4px solid #c8972a; padding-left:8px; page-break-after:avoid; }
    table { width:100%; border-collapse:collapse; font-size:0.8rem; page-break-inside:auto; }
    thead { display:table-header-group; }
    tbody { display:table-row-group; }
    tr { page-break-inside:avoid; }
    th { background:#1a6b3a !important; color:#fff !important; padding:7px 8px; text-align:left; font-size:0.72rem; text-transform:uppercase; }
    td { padding:5px 8px; border-bottom:1px solid #eee; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:0.5rem; }
    .footer { margin-top:1.5rem; display:flex; justify-content:space-between; font-size:0.78rem; color:#777; border-top:1px solid #ddd; padding-top:0.8rem; page-break-inside:avoid; }
    @media print {
      @page { margin:1cm; }
      body { padding:0; }
      table { page-break-inside:auto; }
      thead { display:table-header-group; }
      tr { page-break-inside:avoid; page-break-after:auto; }
      .footer { page-break-inside:avoid; }
    }
  `

  function handlePrint() {
    if (!data || !data.stats) return

    const sorted: EleveMoyenne[] = [...data.eleves].sort(
      (a: EleveMoyenne, b: EleveMoyenne) => (b.moyenne ?? 0) - (a.moyenne ?? 0)
    )

    const mentionColors: Record<string, string> = {
      'mention-excellent': '#c3e6cb', 'mention-tbi': '#bee5eb',
      'mention-bi': '#d4edda', 'mention-ab': '#fff3cd',
      'mention-pc': '#ffeeba', 'mention-insuf': '#f8d7da',
    }

    const avecMoyennePct = data.stats.effectif > 0
      ? Math.round((data.stats.avecMoyenne / data.stats.effectif) * 100) : 0

    const rowsHTML = sorted.map((e: EleveMoyenne) => {
      const rankBg = e.rang === 1 ? '#fffbe6' : e.rang === 2 ? '#f5f5f5' : e.rang === 3 ? '#fff5ec' : '#fff'
      const mentionBg = mentionColors[e.mention?.cls ?? ''] ?? 'transparent'
      return `<tr style="background:${rankBg}">
        <td style="font-weight:700;color:#c8972a">${e.rang ? `#${e.rang}` : '—'}</td>
        <td><strong>${e.nom}</strong></td>
        <td style="text-align:center">${e.sexe}</td>
        <td style="text-align:center"><strong>${e.moyenne !== null ? `${e.moyenne}/10` : '—'}</strong></td>
        <td style="text-align:center"><span style="background:${mentionBg};padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700">${e.mention?.label ?? '—'}</span></td>
        <td style="text-align:center">
          ${e.moyenne !== null
            ? e.aMoyenne
              ? '<span style="background:#d4edda;color:#155724;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700">✓ Oui</span>'
              : '<span style="background:#f8d7da;color:#721c24;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700">✗ Non</span>'
            : '—'}
        </td>
      </tr>`
    }).join('')

    const { simples, groupes } = buildGroupeStats(data.matiereStats)
    const groupeRowsHTML = groupes.map(g => `
      <tr style="background:#f0faf5">
        <td><strong>${g.nom}</strong></td>
        <td style="text-align:center">${g.moyenneClasse ?? '—'}</td>
        <td style="text-align:center">${g.max ?? '—'}</td>
        <td style="text-align:center">${g.min ?? '—'}</td>
        <td style="text-align:center;font-weight:700;color:${g.pctReussite !== null && g.pctReussite >= 50 ? '#1a6b3a' : '#c0392b'}">${g.pctReussite !== null ? g.pctReussite + '%' : '—'}</td>
      </tr>`).join('')
    const simpleRowsHTML = simples.map((ms: MatiereStat) => `
      <tr>
        <td><strong>${ms.matiere.nom}</strong></td>
        <td style="text-align:center">${ms.moyenneClasse ?? '—'}</td>
        <td style="text-align:center">${ms.max ?? '—'}</td>
        <td style="text-align:center">${ms.min ?? '—'}</td>
        <td style="text-align:center;font-weight:700;color:${ms.pctReussite !== null && ms.pctReussite >= 50 ? '#1a6b3a' : '#c0392b'}">${ms.pctReussite !== null ? ms.pctReussite + '%' : '—'}</td>
      </tr>`).join('')

    const g  = sorted.filter(e => e.sexe === 'G')
    const f  = sorted.filter(e => e.sexe === 'F')
    const gAvec = g.filter(e => e.aMoyenne).length
    const fAvec = f.filter(e => e.aMoyenne).length
    const gSans = g.filter(e => e.moyenne !== null && !e.aMoyenne).length
    const fSans = f.filter(e => e.moyenne !== null && !e.aMoyenne).length
    const gNote = g.filter(e => e.moyenne !== null)
    const fNote = f.filter(e => e.moyenne !== null)
    const gTaux = gNote.length ? Math.round((gAvec / gNote.length) * 100) : 0
    const fTaux = fNote.length ? Math.round((fAvec / fNote.length) * 100) : 0

    const mentionBgMap: Record<string, string> = {
      'Excellent':'#c3e6cb','Très Bien':'#bee5eb','Bien':'#d4edda',
      'Assez Bien':'#fff3cd','Passable':'#ffeeba','Insuffisant':'#f8d7da'
    }
    const mentionPrintRows = ['Excellent','Très Bien','Bien','Assez Bien','Passable','Insuffisant'].map(lbl => {
      const count = sorted.filter(e => e.mention?.label === lbl).length
      if (!count) return ''
      const bg = mentionBgMap[lbl] ?? '#eee'
      return `<tr>
        <td><span style="background:${bg};padding:2px 8px;border-radius:10px;font-size:0.78rem;font-weight:700">${lbl}</span></td>
        <td style="text-align:center;font-weight:700">${count}</td>
        <td style="text-align:center">${sorted.length > 0 ? Math.round((count / sorted.length) * 100) : 0}%</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Synthèse — Classe ${niveau}${div} — ${COMPO_LABELS[compo]}</title>
<style>${printCSS} .stats-grid { grid-template-columns:repeat(6,1fr); }</style>
</head><body>
  <div class="header">
    <div><div style="font-weight:700;color:#1a6b3a">REPUBLIQUE DU SÉNÉGAL</div><div style="font-size:0.78rem;color:#777">Un Peuple — Un But — Une Foi</div></div>
    <div><div class="titre">SYNTHÈSE DE COMPOSITION</div><div class="sous-titre">${COMPO_LABELS[compo]} — Classe <strong>${niveau}${div}</strong></div></div>
    <div style="text-align:right;font-size:0.78rem;color:#555"><div>Imprimé le ${new Date().toLocaleDateString('fr-FR')}</div><div>Effectif : <strong>${data.stats.effectif} élèves</strong></div></div>
  </div>
  <div class="stats-grid">
    <div class="stat-box" style="background:linear-gradient(135deg,#1a6b3a,#2d9a56)"><div class="stat-val">${data.stats.effectif}</div><div class="stat-lbl">Effectif total</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#c8972a,#e0a830)"><div class="stat-val">${data.stats.moyenneClasse !== null ? `${data.stats.moyenneClasse}/10` : '—'}</div><div class="stat-lbl">Moyenne de classe</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#1a6b3a,#2d9a56)"><div class="stat-val">${data.stats.avecMoyenne}</div><div class="stat-lbl">Ont la moyenne</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#c0392b,#e74c3c)"><div class="stat-val">${data.stats.sansMoyenne}</div><div class="stat-lbl">N'ont pas la moyenne</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#1a5276,#2980b9)"><div class="stat-val">${data.stats.maxMoyenne ?? '—'}</div><div class="stat-lbl">Meilleure note</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#5d4e75,#8e6ba6)"><div class="stat-val">${data.stats.minMoyenne ?? '—'}</div><div class="stat-lbl">Note la plus basse</div></div>
  </div>
  <div class="taux">Taux de réussite : <strong>${avecMoyennePct}%</strong> — ${data.stats.avecMoyenne} élève(s) sur ${data.stats.effectif} ont obtenu la moyenne</div>
  <h3>🏆 Classement des élèves</h3>
  <table>
    <thead><tr><th>Rang</th><th>Nom et Prénom</th><th style="text-align:center">Sexe</th><th style="text-align:center">Moy./10</th><th style="text-align:center">Mention</th><th style="text-align:center">A la moyenne</th></tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <h3>📚 Statistiques par matière</h3>
  <table>
    <thead><tr><th>Matière</th><th style="text-align:center">Moy. classe</th><th style="text-align:center">Max</th><th style="text-align:center">Min</th><th style="text-align:center">% Réussite</th></tr></thead>
    <tbody>${groupeRowsHTML}${simpleRowsHTML}</tbody>
  </table>
  <h3>👥 Statistiques par élève</h3>
  <div class="two-col">
    <table>
      <thead>
        <tr><th colspan="5">Répartition Garçons / Filles</th></tr>
        <tr><th>Sexe</th><th style="text-align:center">Effectif</th><th style="text-align:center">Avec moy.</th><th style="text-align:center">Sans moy.</th><th style="text-align:center">Taux</th></tr>
      </thead>
      <tbody>
        <tr><td>👦 Garçons</td><td style="text-align:center">${g.length}</td><td style="text-align:center;color:#155724;font-weight:700">${gAvec}</td><td style="text-align:center;color:#721c24;font-weight:700">${gSans}</td><td style="text-align:center;font-weight:700;color:${gTaux>=50?'#1a6b3a':'#c0392b'}">${gTaux}%</td></tr>
        <tr><td>👧 Filles</td><td style="text-align:center">${f.length}</td><td style="text-align:center;color:#155724;font-weight:700">${fAvec}</td><td style="text-align:center;color:#721c24;font-weight:700">${fSans}</td><td style="text-align:center;font-weight:700;color:${fTaux>=50?'#1a6b3a':'#c0392b'}">${fTaux}%</td></tr>
        <tr style="background:#f0faf5"><td><strong>Total</strong></td><td style="text-align:center"><strong>${sorted.length}</strong></td><td style="text-align:center;color:#155724;font-weight:700">${gAvec+fAvec}</td><td style="text-align:center;color:#721c24;font-weight:700">${gSans+fSans}</td><td style="text-align:center"></td></tr>
      </tbody>
    </table>
    <table>
      <thead>
        <tr><th colspan="3">Répartition par mention</th></tr>
        <tr><th>Mention</th><th style="text-align:center">Nb élèves</th><th style="text-align:center">%</th></tr>
      </thead>
      <tbody>${mentionPrintRows}</tbody>
    </table>
  </div>
  <div class="footer"><div>Signature du Directeur : _______________________</div><div>Signature du Maître/Maîtresse : _______________________</div></div>
</body></html>`

    const w = window.open('', '_blank')!
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400)
  }

  function handlePrintAnnuel() {
    if (!bilanAnnuel) return

    const sorted = [...bilanAnnuel].sort((a, b) => (b.moyenneAnnuelle ?? 0) - (a.moyenneAnnuelle ?? 0))
    const avecMoy = sorted.filter(e => e.moyenneAnnuelle !== null)
    const moyenneGlobale = avecMoy.length
      ? Math.round((avecMoy.reduce((s, e) => s + (e.moyenneAnnuelle ?? 0), 0) / avecMoy.length) * 100) / 100
      : null
    const admis = bilanAnnuel.filter(e => e.decision?.includes('Admis')).length
    const redouble = bilanAnnuel.filter(e => e.decision === 'Redouble').length
    const tauxReussite = bilanAnnuel.length > 0 ? Math.round((admis / bilanAnnuel.length) * 100) : 0

    const rowsHTML = sorted.map(e => {
      const decisionBg = e.decision?.includes('Admis') ? '#d4edda' : e.decision === 'Redouble' ? '#f8d7da' : '#fff'
      const decisionColor = e.decision?.includes('Admis') ? '#155724' : e.decision === 'Redouble' ? '#721c24' : '#333'
      return `<tr>
        <td style="font-weight:700;color:#c8972a">${e.rangAnnuel ? `#${e.rangAnnuel}` : '—'}</td>
        <td><strong>${e.nom}</strong></td>
        <td style="text-align:center">${e.sexe}</td>
        <td style="text-align:center">${e.moyenneCompo1 !== null ? `${e.moyenneCompo1}/10` : '—'}</td>
        <td style="text-align:center">${e.moyenneCompo2 !== null ? `${e.moyenneCompo2}/10` : '—'}</td>
        <td style="text-align:center">${e.moyenneCompo3 !== null ? `${e.moyenneCompo3}/10` : '—'}</td>
        <td style="text-align:center"><strong>${e.moyenneAnnuelle !== null ? `${e.moyenneAnnuelle}/10` : '—'}</strong></td>
        <td style="text-align:center">
          <span style="background:${decisionBg};color:${decisionColor};padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700">
            ${e.decision?.includes('Admis') ? '✅' : '🔄'} ${e.decision ?? '—'}
          </span>
        </td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bilan Annuel — Classe ${niveau}${div}</title>
<style>${printCSS} .stats-grid { grid-template-columns:repeat(5,1fr); } @media print { @page { size:A4 landscape; margin:1cm; } }</style>
</head><body>
  <div class="header">
    <div><div style="font-weight:700;color:#1a6b3a">REPUBLIQUE DU SÉNÉGAL</div><div style="font-size:0.78rem;color:#777">Un Peuple — Un But — Une Foi</div></div>
    <div><div class="titre">BILAN ANNUEL</div><div class="sous-titre">Année complète — Classe <strong>${niveau}${div}</strong></div></div>
    <div style="text-align:right;font-size:0.78rem;color:#555"><div>Imprimé le ${new Date().toLocaleDateString('fr-FR')}</div><div>Effectif : <strong>${bilanAnnuel.length} élèves</strong></div></div>
  </div>
  <div class="stats-grid">
    <div class="stat-box" style="background:linear-gradient(135deg,#1a6b3a,#2d9a56)"><div class="stat-val">${bilanAnnuel.length}</div><div class="stat-lbl">Effectif total</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#c8972a,#e0a830)"><div class="stat-val">${moyenneGlobale !== null ? `${moyenneGlobale}/10` : '—'}</div><div class="stat-lbl">Moyenne annuelle classe</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#1a6b3a,#2d9a56)"><div class="stat-val">${admis}</div><div class="stat-lbl">Admis</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#c0392b,#e74c3c)"><div class="stat-val">${redouble}</div><div class="stat-lbl">Redoublants</div></div>
    <div class="stat-box" style="background:linear-gradient(135deg,#1a5276,#2980b9)"><div class="stat-val">${tauxReussite}%</div><div class="stat-lbl">Taux de réussite</div></div>
  </div>
  <div class="taux">Taux de réussite : <strong>${tauxReussite}%</strong> — ${admis} élève(s) admis sur ${bilanAnnuel.length}</div>
  <h3>🏆 Classement annuel des élèves</h3>
  <table>
    <thead><tr>
      <th>Rang</th><th>Nom et Prénom</th><th style="text-align:center">Sexe</th>
      <th style="text-align:center">Moy. C1</th><th style="text-align:center">Moy. C2</th><th style="text-align:center">Moy. C3</th>
      <th style="text-align:center">Moy. Annuelle</th><th style="text-align:center">Décision</th>
    </tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <div class="footer"><div>Signature du Directeur : _______________________</div><div>Signature du Maître/Maîtresse : _______________________</div></div>
</body></html>`

    const w = window.open('', '_blank')!
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400)
  }

  const sorted: EleveMoyenne[] = data?.eleves
    ? [...data.eleves].sort((a: EleveMoyenne, b: EleveMoyenne) => (b.moyenne ?? 0) - (a.moyenne ?? 0))
    : []

  const sortedAnnuel = bilanAnnuel
    ? [...bilanAnnuel].sort((a, b) => (b.moyenneAnnuelle ?? 0) - (a.moyenneAnnuelle ?? 0))
    : []

  const admisCount    = bilanAnnuel?.filter(e => e.decision?.includes('Admis')).length ?? 0
  const redoubleCount = bilanAnnuel?.filter(e => e.decision === 'Redouble').length ?? 0
  const avecMoyAnnuel = sortedAnnuel.filter(e => e.moyenneAnnuelle !== null)
  const moyenneAnnuelleClasse = avecMoyAnnuel.length
    ? Math.round((avecMoyAnnuel.reduce((s, e) => s + (e.moyenneAnnuelle ?? 0), 0) / avecMoyAnnuel.length) * 100) / 100
    : null

  const { simples: simplesUI, groupes: groupesUI } = data?.matiereStats
    ? buildGroupeStats(data.matiereStats)
    : { simples: [], groupes: [] }

  const eleveStats = sorted.length > 0 ? buildEleveStats(sorted) : null

  // ── Stats bilan annuel ──
  const bilanEleveStats = bilanAnnuel && bilanAnnuel.length > 0
    ? buildBilanEleveStats(bilanAnnuel)
    : null

  return (
    <Card title="Synthèse de composition">
      <SelectorBar>
        <ClasseSelector
          niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo={mode === 'compo'}
        />

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${mode === 'compo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => switchMode('compo')}
          >
            📊 Par composition
          </button>
          <button
            className={`btn btn-sm ${mode === 'annuelle' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => switchMode('annuelle')}
          >
            📅 Bilan annuel
          </button>
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleGenerate}>
          📊 Générer
        </button>
        {data && mode === 'compo' && (
          <button className="btn btn-or btn-sm" onClick={handlePrint}>🖨️ Imprimer</button>
        )}
        {bilanAnnuel && bilanAnnuel.length > 0 && mode === 'annuelle' && (
          <button className="btn btn-or btn-sm" onClick={handlePrintAnnuel}>🖨️ Imprimer</button>
        )}
      </SelectorBar>

      {(isLoading || isLoadingAnnuel) && <p style={{ color: 'var(--txt2)' }}>Chargement...</p>}

      {/* ── Vue composition ── */}
      {mode === 'compo' && data && data.stats && !isLoading && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>
              📅 {COMPO_LABELS[compo]} — Classe {niveau}{div}
            </span>
          </div>

          <StatsGrid>
            <StatCard value={data.stats.effectif} label="Effectif total" color="vert" />
            <StatCard value={data.stats.moyenneClasse !== null ? `${data.stats.moyenneClasse}/10` : '—'} label="Moyenne de classe" color="or" />
            <StatCard value={data.stats.avecMoyenne} label="Ont la moyenne" color="vert" />
            <StatCard value={data.stats.sansMoyenne} label="N'ont pas la moyenne" color="rouge" />
            <StatCard value={data.stats.maxMoyenne ?? '—'} label="Meilleure note" color="bleu" />
            <StatCard value={data.stats.minMoyenne ?? '—'} label="Note la plus basse" color="violet" />
          </StatsGrid>

          <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--vert)', marginBottom: '1rem' }}>🏆 Classement des élèves</h3>
          <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
            <table>
              <thead>
                <tr><th>Rang</th><th>Nom et Prénom</th><th>Sexe</th><th>Moy./10</th><th>Mention</th><th>Moyenne</th></tr>
              </thead>
              <tbody>
                {sorted.map((e: EleveMoyenne) => {
                  const rankClass = e.rang === 1 ? 'rank-1' : e.rang === 2 ? 'rank-2' : e.rang === 3 ? 'rank-3' : ''
                  return (
                    <tr key={e.id} className={rankClass}>
                      <td className="rank-cell">{e.rang ? `#${e.rang}` : '—'}</td>
                      <td><strong>{e.nom}</strong></td>
                      <td>{e.sexe}</td>
                      <td><strong>{e.moyenne !== null ? `${e.moyenne}/10` : '—'}</strong></td>
                      <td>{e.mention?.label && e.mention.label !== '—' ? <span className={`mention ${e.mention.cls}`}>{e.mention.label}</span> : '—'}</td>
                      <td>
                        {e.moyenne !== null
                          ? e.aMoyenne ? <span className="badge badge-success">✓ Oui</span> : <span className="badge badge-danger">✗ Non</span>
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--vert)', marginBottom: '1rem' }}>📚 Statistiques par matière</h3>
          <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
            <table>
              <thead>
                <tr><th>Matière</th><th>Moy. classe</th><th>Max</th><th>Min</th><th>% Réussite</th></tr>
              </thead>
              <tbody>
                {groupesUI.map((g) => (
                  <tr key={`groupe-${g.nom}`} style={{ background: '#f0faf5' }}>
                    <td><strong>{g.nom}</strong> <span style={{ fontSize: '0.72rem', color: 'var(--vert)', fontWeight: 400 }}>(groupe)</span></td>
                    <td>{g.moyenneClasse ?? '—'}</td>
                    <td>{g.max ?? '—'}</td>
                    <td>{g.min ?? '—'}</td>
                    <td>{g.pctReussite !== null ? <span style={{ fontWeight: 700, color: g.pctReussite >= 50 ? 'var(--vert)' : '#c0392b' }}>{g.pctReussite}%</span> : '—'}</td>
                  </tr>
                ))}
                {simplesUI.map((ms: MatiereStat) => (
                  <tr key={ms.matiere.id}>
                    <td><strong>{ms.matiere.nom}</strong></td>
                    <td>{ms.moyenneClasse ?? '—'}</td>
                    <td>{ms.max ?? '—'}</td>
                    <td>{ms.min ?? '—'}</td>
                    <td>{ms.pctReussite !== null ? <span style={{ fontWeight: 700, color: ms.pctReussite >= 50 ? 'var(--vert)' : '#c0392b' }}>{ms.pctReussite}%</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Statistiques par élève (compo) ── */}
          {eleveStats && (
            <>
              <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--vert)', marginBottom: '1rem' }}>👥 Statistiques par élève</h3>

              <StatsGrid>
                <StatCard value={eleveStats.garcons.length} label="Garçons" color="bleu" />
                <StatCard value={eleveStats.avecMoyenne(eleveStats.garcons).length} label="Garçons avec moy." color="vert" />
                <StatCard
                  value={eleveStats.taux(eleveStats.garcons) !== null ? `${eleveStats.taux(eleveStats.garcons)}%` : '—'}
                  label="Taux réussite garçons" color="vert"
                />
                <StatCard value={eleveStats.filles.length} label="Filles" color="violet" />
                <StatCard value={eleveStats.avecMoyenne(eleveStats.filles).length} label="Filles avec moy." color="vert" />
                <StatCard
                  value={eleveStats.taux(eleveStats.filles) !== null ? `${eleveStats.taux(eleveStats.filles)}%` : '—'}
                  label="Taux réussite filles" color="vert"
                />
              </StatsGrid>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th colSpan={5}>Répartition Garçons / Filles</th></tr>
                      <tr>
                        <th>Sexe</th>
                        <th style={{ textAlign: 'center' }}>Effectif</th>
                        <th style={{ textAlign: 'center' }}>Avec moy.</th>
                        <th style={{ textAlign: 'center' }}>Sans moy.</th>
                        <th style={{ textAlign: 'center' }}>Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>👦 Garçons</strong></td>
                        <td style={{ textAlign: 'center' }}>{eleveStats.garcons.length}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success">{eleveStats.avecMoyenne(eleveStats.garcons).length}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-danger">{eleveStats.sansMoyenne(eleveStats.garcons).length}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: (eleveStats.taux(eleveStats.garcons) ?? 0) >= 50 ? 'var(--vert)' : '#c0392b' }}>
                          {eleveStats.taux(eleveStats.garcons) !== null ? `${eleveStats.taux(eleveStats.garcons)}%` : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>👧 Filles</strong></td>
                        <td style={{ textAlign: 'center' }}>{eleveStats.filles.length}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success">{eleveStats.avecMoyenne(eleveStats.filles).length}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-danger">{eleveStats.sansMoyenne(eleveStats.filles).length}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: (eleveStats.taux(eleveStats.filles) ?? 0) >= 50 ? 'var(--vert)' : '#c0392b' }}>
                          {eleveStats.taux(eleveStats.filles) !== null ? `${eleveStats.taux(eleveStats.filles)}%` : '—'}
                        </td>
                      </tr>
                      <tr style={{ background: '#f0faf5' }}>
                        <td><strong>Total</strong></td>
                        <td style={{ textAlign: 'center' }}><strong>{sorted.length}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success"><strong>{eleveStats.avecMoyenne(sorted).length}</strong></span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-danger"><strong>{eleveStats.sansMoyenne(sorted).length}</strong></span>
                        </td>
                        <td style={{ textAlign: 'center' }}>—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th colSpan={3}>Répartition par mention</th></tr>
                      <tr>
                        <th>Mention</th>
                        <th style={{ textAlign: 'center' }}>Nb élèves</th>
                        <th style={{ textAlign: 'center' }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eleveStats.mentionStats.length > 0
                        ? eleveStats.mentionStats.map(m => (
                            <tr key={m.cls}>
                              <td><span className={`mention ${m.cls}`}>{m.label}</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.count}</td>
                              <td style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                                {sorted.length > 0 ? Math.round((m.count / sorted.length) * 100) : 0}%
                              </td>
                            </tr>
                          ))
                        : (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', color: 'var(--txt2)', padding: '1rem' }}>
                              Aucune note saisie
                            </td>
                          </tr>
                        )
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Vue bilan annuel ── */}
      {mode === 'annuelle' && bilanAnnuel && bilanAnnuel.length > 0 && !isLoadingAnnuel && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>
              📅 Bilan annuel — Classe {niveau}{div}
            </span>
          </div>

          <StatsGrid>
            <StatCard value={bilanAnnuel.length} label="Effectif total" color="vert" />
            <StatCard value={moyenneAnnuelleClasse !== null ? `${moyenneAnnuelleClasse}/10` : '—'} label="Moyenne annuelle classe" color="or" />
            <StatCard value={admisCount} label="Admis" color="vert" />
            <StatCard value={redoubleCount} label="Redoublants" color="rouge" />
            <StatCard
              value={bilanAnnuel.length > 0 ? `${Math.round((admisCount / bilanAnnuel.length) * 100)}%` : '—'}
              label="Taux de réussite" color="bleu"
            />
          </StatsGrid>

          <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--vert)', marginBottom: '1rem' }}>🏆 Classement annuel</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rang</th><th>Nom et Prénom</th><th>Sexe</th>
                  <th style={{ textAlign: 'center' }}>Moy. C1</th>
                  <th style={{ textAlign: 'center' }}>Moy. C2</th>
                  <th style={{ textAlign: 'center' }}>Moy. C3</th>
                  <th style={{ textAlign: 'center' }}>Moy. Annuelle</th>
                  <th style={{ textAlign: 'center' }}>Décision</th>
                </tr>
              </thead>
              <tbody>
                {sortedAnnuel.map((e) => (
                  <tr key={e.eleveId}>
                    <td className="rank-cell" style={{ fontWeight: 700, color: 'var(--or)' }}>{e.rangAnnuel ? `#${e.rangAnnuel}` : '—'}</td>
                    <td><strong>{e.nom}</strong></td>
                    <td>{e.sexe}</td>
                    <td style={{ textAlign: 'center' }}>{e.moyenneCompo1 !== null ? `${e.moyenneCompo1}/10` : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{e.moyenneCompo2 !== null ? `${e.moyenneCompo2}/10` : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{e.moyenneCompo3 !== null ? `${e.moyenneCompo3}/10` : '—'}</td>
                    <td style={{ textAlign: 'center' }}><strong>{e.moyenneAnnuelle !== null ? `${e.moyenneAnnuelle}/10` : '—'}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      {e.decision
                        ? <span className={`badge ${e.decision.includes('Admis') ? 'badge-success' : 'badge-danger'}`}>
                            {e.decision.includes('Admis') ? '✅' : '🔄'} {e.decision}
                          </span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Statistiques par élève (annuel) ── */}
          {bilanEleveStats && (
            <>
              <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--vert)', marginBottom: '1rem', marginTop: '2rem' }}>
                👥 Statistiques par élève
              </h3>

              {/* Cards résumé */}
              <StatsGrid>
                <StatCard value={bilanEleveStats.garcons.length}                                                                                                           label="Garçons"               color="bleu"   />
                <StatCard value={bilanEleveStats.admis(bilanEleveStats.garcons).length}                                                                                    label="Garçons admis"          color="vert"   />
                <StatCard value={bilanEleveStats.tauxAdmission(bilanEleveStats.garcons) !== null ? `${bilanEleveStats.tauxAdmission(bilanEleveStats.garcons)}%` : '—'}    label="Taux admission garçons" color="vert"   />
                <StatCard value={bilanEleveStats.filles.length}                                                                                                            label="Filles"                 color="violet" />
                <StatCard value={bilanEleveStats.admis(bilanEleveStats.filles).length}                                                                                     label="Filles admises"         color="vert"   />
                <StatCard value={bilanEleveStats.tauxAdmission(bilanEleveStats.filles) !== null ? `${bilanEleveStats.tauxAdmission(bilanEleveStats.filles)}%` : '—'}      label="Taux admission filles"  color="vert"   />
              </StatsGrid>

              {/* Tableaux Garçons/Filles + Décisions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>

                {/* Tableau Garçons / Filles */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th colSpan={5}>Répartition Garçons / Filles</th></tr>
                      <tr>
                        <th>Sexe</th>
                        <th style={{ textAlign: 'center' }}>Effectif</th>
                        <th style={{ textAlign: 'center' }}>Admis</th>
                        <th style={{ textAlign: 'center' }}>Redoublants</th>
                        <th style={{ textAlign: 'center' }}>Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>👦 Garçons</strong></td>
                        <td style={{ textAlign: 'center' }}>{bilanEleveStats.garcons.length}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success">{bilanEleveStats.admis(bilanEleveStats.garcons).length}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-danger">{bilanEleveStats.redouble(bilanEleveStats.garcons).length}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: (bilanEleveStats.tauxAdmission(bilanEleveStats.garcons) ?? 0) >= 50 ? 'var(--vert)' : '#c0392b' }}>
                          {bilanEleveStats.tauxAdmission(bilanEleveStats.garcons) !== null ? `${bilanEleveStats.tauxAdmission(bilanEleveStats.garcons)}%` : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>👧 Filles</strong></td>
                        <td style={{ textAlign: 'center' }}>{bilanEleveStats.filles.length}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success">{bilanEleveStats.admis(bilanEleveStats.filles).length}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-danger">{bilanEleveStats.redouble(bilanEleveStats.filles).length}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: (bilanEleveStats.tauxAdmission(bilanEleveStats.filles) ?? 0) >= 50 ? 'var(--vert)' : '#c0392b' }}>
                          {bilanEleveStats.tauxAdmission(bilanEleveStats.filles) !== null ? `${bilanEleveStats.tauxAdmission(bilanEleveStats.filles)}%` : '—'}
                        </td>
                      </tr>
                      <tr style={{ background: '#f0faf5' }}>
                        <td><strong>Total</strong></td>
                        <td style={{ textAlign: 'center' }}><strong>{sortedAnnuel.length}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success"><strong>{bilanEleveStats.admis(sortedAnnuel).length}</strong></span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-danger"><strong>{bilanEleveStats.redouble(sortedAnnuel).length}</strong></span>
                        </td>
                        <td style={{ textAlign: 'center' }}>—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tableau Répartition par décision */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th colSpan={3}>Répartition par décision</th></tr>
                      <tr>
                        <th>Décision</th>
                        <th style={{ textAlign: 'center' }}>Nb élèves</th>
                        <th style={{ textAlign: 'center' }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bilanEleveStats.decisionStats.length > 0
                        ? bilanEleveStats.decisionStats.map(d => (
                            <tr key={d.label}>
                              <td>
                                <span className={`badge ${d.label.includes('Admis') ? 'badge-success' : 'badge-danger'}`}>
                                  {d.label.includes('Admis') ? '✅' : '🔄'} {d.label}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{d.count}</td>
                              <td style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                                {sortedAnnuel.length > 0 ? Math.round((d.count / sortedAnnuel.length) * 100) : 0}%
                              </td>
                            </tr>
                          ))
                        : (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', color: 'var(--txt2)', padding: '1rem' }}>
                              Aucune décision enregistrée
                            </td>
                          </tr>
                        )
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Progression C1 → C2 → C3 ── */}
              {(bilanEleveStats.avecC1C2.length > 0 || bilanEleveStats.avecC2C3.length > 0) && (
                <>
                  <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--vert)', marginBottom: '1rem', marginTop: '2rem' }}>
                    📈 Progression annuelle C1 → C2 → C3
                  </h3>

                  {/* Bandeau moyennes par compo */}
                  <div style={{
                    display: 'flex', gap: '1rem', alignItems: 'center',
                    background: '#f0faf5', border: '1px solid #c3e6cb',
                    borderRadius: '10px', padding: '0.8rem 1.2rem',
                    marginBottom: '1rem', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--txt2)', fontWeight: 600 }}>Moyenne de classe :</span>
                    {bilanEleveStats.moyC1 !== null && (
                      <span style={{ fontWeight: 700, color: 'var(--vert)', fontSize: '0.9rem' }}>
                        C1 : <strong>{bilanEleveStats.moyC1}/10</strong>
                      </span>
                    )}
                    {bilanEleveStats.moyC1 !== null && bilanEleveStats.moyC2 !== null && (
                      <span style={{ color: 'var(--txt2)' }}>→</span>
                    )}
                    {bilanEleveStats.moyC2 !== null && (
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: bilanEleveStats.moyC2 >= (bilanEleveStats.moyC1 ?? 0) ? 'var(--vert)' : '#c0392b' }}>
                        C2 : <strong>{bilanEleveStats.moyC2}/10</strong>
                        {bilanEleveStats.moyC1 !== null && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>
                            {bilanEleveStats.moyC2 > bilanEleveStats.moyC1 ? '▲' : bilanEleveStats.moyC2 < bilanEleveStats.moyC1 ? '▼' : '='}
                          </span>
                        )}
                      </span>
                    )}
                    {bilanEleveStats.moyC2 !== null && bilanEleveStats.moyC3 !== null && (
                      <span style={{ color: 'var(--txt2)' }}>→</span>
                    )}
                    {bilanEleveStats.moyC3 !== null && (
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: bilanEleveStats.moyC3 >= (bilanEleveStats.moyC2 ?? 0) ? 'var(--vert)' : '#c0392b' }}>
                        C3 : <strong>{bilanEleveStats.moyC3}/10</strong>
                        {bilanEleveStats.moyC2 !== null && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>
                            {bilanEleveStats.moyC3 > bilanEleveStats.moyC2 ? '▲' : bilanEleveStats.moyC3 < bilanEleveStats.moyC2 ? '▼' : '='}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                    {/* C1 → C2 */}
                    {bilanEleveStats.avecC1C2.length > 0 && (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr><th colSpan={3}>Évolution C1 → C2 ({bilanEleveStats.avecC1C2.length} élèves)</th></tr>
                            <tr>
                              <th>Tendance</th>
                              <th style={{ textAlign: 'center' }}>Nb élèves</th>
                              <th style={{ textAlign: 'center' }}>%</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td><span style={{ color: 'var(--vert)', fontWeight: 700 }}>▲ En progression</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{bilanEleveStats.progressC1C2}</td>
                              <td style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                                {Math.round((bilanEleveStats.progressC1C2 / bilanEleveStats.avecC1C2.length) * 100)}%
                              </td>
                            </tr>
                            <tr>
                              <td><span style={{ color: '#c8972a', fontWeight: 700 }}>= Stable</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{bilanEleveStats.stableC1C2}</td>
                              <td style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                                {Math.round((bilanEleveStats.stableC1C2 / bilanEleveStats.avecC1C2.length) * 100)}%
                              </td>
                            </tr>
                            <tr>
                              <td><span style={{ color: '#c0392b', fontWeight: 700 }}>▼ En régression</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{bilanEleveStats.regressC1C2}</td>
                              <td style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                                {Math.round((bilanEleveStats.regressC1C2 / bilanEleveStats.avecC1C2.length) * 100)}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* C2 → C3 */}
                    {bilanEleveStats.avecC2C3.length > 0 && (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr><th colSpan={3}>Évolution C2 → C3 ({bilanEleveStats.avecC2C3.length} élèves)</th></tr>
                            <tr>
                              <th>Tendance</th>
                              <th style={{ textAlign: 'center' }}>Nb élèves</th>
                              <th style={{ textAlign: 'center' }}>%</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td><span style={{ color: 'var(--vert)', fontWeight: 700 }}>▲ En progression</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{bilanEleveStats.progressC2C3}</td>
                              <td style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                                {Math.round((bilanEleveStats.progressC2C3 / bilanEleveStats.avecC2C3.length) * 100)}%
                              </td>
                            </tr>
                            <tr>
                              <td><span style={{ color: '#c8972a', fontWeight: 700 }}>= Stable</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{bilanEleveStats.stableC2C3}</td>
                              <td style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                                {Math.round((bilanEleveStats.stableC2C3 / bilanEleveStats.avecC2C3.length) * 100)}%
                              </td>
                            </tr>
                            <tr>
                              <td><span style={{ color: '#c0392b', fontWeight: 700 }}>▼ En régression</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{bilanEleveStats.regressC2C3}</td>
                              <td style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                                {Math.round((bilanEleveStats.regressC2C3 / bilanEleveStats.avecC2C3.length) * 100)}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* États vides */}
      {!triggered && (
        <div className="empty">
          <div className="empty-icon">📊</div>
          <p>Sélectionnez {mode === 'compo' ? 'une classe et une composition' : 'une classe'} puis cliquez sur Générer.</p>
        </div>
      )}
      {triggered && mode === 'compo' && !data && !isLoading && (
        <div className="empty"><div className="empty-icon">📊</div><p>Aucun élève dans cette classe.</p></div>
      )}
      {triggered && mode === 'annuelle' && bilanAnnuel?.length === 0 && !isLoadingAnnuel && (
        <div className="empty"><div className="empty-icon">📊</div><p>Aucun élève dans cette classe.</p></div>
      )}
    </Card>
  )
}