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

export default function SynthesePage() {
  const [niveau, setNiveau] = useState<Niveau>('CI')
  const [div, setDiv] = useState<Division>('A')
  const [compo, setCompo] = useState(1)
  const [triggered, setTriggered] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['synthese', niveau, div, compo],
    queryFn: () => fetch(`/api/synthese?niveau=${niveau}&div=${div}&compo=${compo}`).then(r => r.json()),
    enabled: triggered,
  })

  function handleGenerate() {
    setTriggered(true)
    refetch()
  }

  function handlePrint() {
    if (!data) return

    const sorted: EleveMoyenne[] = [...data.eleves].sort(
      (a: EleveMoyenne, b: EleveMoyenne) => (b.moyenne ?? 0) - (a.moyenne ?? 0)
    )

    const mentionColors: Record<string, string> = {
      'mention-excellent': '#c3e6cb',
      'mention-tbi': '#bee5eb',
      'mention-bi': '#d4edda',
      'mention-ab': '#fff3cd',
      'mention-pc': '#ffeeba',
      'mention-insuf': '#f8d7da',
    }

    const avecMoyennePct = data.stats.effectif > 0
      ? Math.round((data.stats.avecMoyenne / data.stats.effectif) * 100)
      : 0

    const rowsHTML = sorted.map((e: EleveMoyenne) => {
      const rankBg = e.rang === 1 ? '#fffbe6' : e.rang === 2 ? '#f5f5f5' : e.rang === 3 ? '#fff5ec' : '#fff'
      const mentionBg = mentionColors[e.mention?.cls ?? ''] ?? 'transparent'
      return `<tr style="background:${rankBg}">
        <td style="font-weight:700;color:#c8972a;padding:8px 10px;border-bottom:1px solid #eee">${e.rang ? `#${e.rang}` : '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee"><strong>${e.nom}</strong></td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${e.sexe}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center"><strong>${e.moyenne !== null ? `${e.moyenne}/10` : '—'}</strong></td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">
          <span style="background:${mentionBg};padding:2px 8px;border-radius:12px;font-size:0.78rem;font-weight:700">${e.mention?.label ?? '—'}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">
          ${e.moyenne !== null
            ? e.aMoyenne
              ? '<span style="background:#d4edda;color:#155724;padding:2px 8px;border-radius:12px;font-size:0.78rem;font-weight:700">✓ Oui</span>'
              : '<span style="background:#f8d7da;color:#721c24;padding:2px 8px;border-radius:12px;font-size:0.78rem;font-weight:700">✗ Non</span>'
            : '—'}
        </td>
      </tr>`
    }).join('')

    const matiereRowsHTML = data.matiereStats.map((ms: any) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee"><strong>${ms.matiere.nom}</strong></td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">×${ms.matiere.coef}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">/${ms.matiere.bareme}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${ms.moyenneClasse ?? '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${ms.max ?? '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${ms.min ?? '—'}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Synthèse — Classe ${niveau}${div} — ${COMPO_LABELS[compo]}</title>
  <style>
* { box-sizing: border-box; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }    body { font-family: Arial, sans-serif; padding: 2rem; color: #1a1a1a; font-size: 0.9rem; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a6b3a; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    .titre { font-size: 1.3rem; font-weight: 700; color: #1a6b3a; text-align: center; }
    .sous-titre { font-size: 0.85rem; color: #555; text-align: center; margin-top: 3px; }
    .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 1rem; }
    .stat-box { border-radius: 10px; padding: 10px; text-align: center; color: #fff; }
    .stat-val { font-size: 1.5rem; font-weight: 700; }
    .stat-lbl { font-size: 0.68rem; opacity: 0.9; margin-top: 2px; }
    .taux { background: #f0faf5; border: 1px solid #c3e6cb; border-radius: 8px; padding: 10px 16px; margin-bottom: 1.5rem; font-size: 0.88rem; }
    .taux strong { color: #1a6b3a; font-size: 1.1rem; }
    h3 { color: #1a6b3a; margin: 1.2rem 0 0.8rem; font-size: 0.95rem; border-left: 4px solid #c8972a; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.85rem; }
    th { background: #1a6b3a; color: #fff; padding: 9px 10px; text-align: left; font-size: 0.78rem; text-transform: uppercase; }
    .footer { margin-top: 2rem; display: flex; justify-content: space-between; font-size: 0.8rem; color: #777; border-top: 1px solid #ddd; padding-top: 1rem; }
@media print {
  body { padding: 1rem; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { margin: 1cm; }
}  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-weight:700;color:#1a6b3a">REPUBLIQUE DU SÉNÉGAL</div>
      <div style="font-size:0.8rem;color:#777">Un Peuple — Un But — Une Foi</div>
    </div>
    <div>
      <div class="titre">SYNTHÈSE DE COMPOSITION</div>
      <div class="sous-titre">${COMPO_LABELS[compo]} — Classe <strong>${niveau}${div}</strong></div>
    </div>
    <div style="text-align:right;font-size:0.82rem;color:#555">
      <div>Imprimé le ${new Date().toLocaleDateString('fr-FR')}</div>
      <div>Effectif : <strong>${data.stats.effectif} élèves</strong></div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-box" style="background:linear-gradient(135deg,#1a6b3a,#2d9a56)">
      <div class="stat-val">${data.stats.effectif}</div><div class="stat-lbl">Effectif total</div>
    </div>
    <div class="stat-box" style="background:linear-gradient(135deg,#c8972a,#e0a830)">
      <div class="stat-val">${data.stats.moyenneClasse !== null ? `${data.stats.moyenneClasse}/10` : '—'}</div><div class="stat-lbl">Moyenne de classe</div>
    </div>
    <div class="stat-box" style="background:linear-gradient(135deg,#1a6b3a,#2d9a56)">
      <div class="stat-val">${data.stats.avecMoyenne}</div><div class="stat-lbl">Ont la moyenne</div>
    </div>
    <div class="stat-box" style="background:linear-gradient(135deg,#c0392b,#e74c3c)">
      <div class="stat-val">${data.stats.sansMoyenne}</div><div class="stat-lbl">N'ont pas la moyenne</div>
    </div>
    <div class="stat-box" style="background:linear-gradient(135deg,#1a5276,#2980b9)">
      <div class="stat-val">${data.stats.maxMoyenne ?? '—'}</div><div class="stat-lbl">Meilleure note</div>
    </div>
    <div class="stat-box" style="background:linear-gradient(135deg,#5d4e75,#8e6ba6)">
      <div class="stat-val">${data.stats.minMoyenne ?? '—'}</div><div class="stat-lbl">Note la plus basse</div>
    </div>
  </div>

  <div class="taux">
    Taux de réussite : <strong>${avecMoyennePct}%</strong>
    — ${data.stats.avecMoyenne} élève(s) sur ${data.stats.effectif} ont obtenu la moyenne
  </div>

  <h3>🏆 Classement des élèves</h3>
  <table>
    <thead><tr>
      <th>Rang</th><th>Nom et Prénom</th><th style="text-align:center">Sexe</th>
      <th style="text-align:center">Moy./10</th><th style="text-align:center">Mention</th>
      <th style="text-align:center">A la moyenne</th>
    </tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>

  <h3>📚 Statistiques par matière</h3>
  <table>
    <thead><tr>
      <th>Matière</th><th style="text-align:center">Coef</th><th style="text-align:center">Barème</th>
      <th style="text-align:center">Moy. classe</th><th style="text-align:center">Max</th><th style="text-align:center">Min</th>
    </tr></thead>
    <tbody>${matiereRowsHTML}</tbody>
  </table>

  <div class="footer">
    <div>Signature du Directeur : _______________________</div>
    <div>Signature du Maître/Maîtresse : _______________________</div>
  </div>
</body>
</html>`

    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  const sorted: EleveMoyenne[] = data?.eleves
    ? [...data.eleves].sort((a: EleveMoyenne, b: EleveMoyenne) => (b.moyenne ?? 0) - (a.moyenne ?? 0))
    : []

  return (
    <Card title="Synthèse de composition">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
        <button className="btn btn-primary btn-sm" onClick={handleGenerate}>
          📊 Générer
        </button>
        {data && (
          <button className="btn btn-or btn-sm" onClick={handlePrint}>
            🖨️ Imprimer la synthèse
          </button>
        )}
      </SelectorBar>

      {isLoading && <p style={{ color: 'var(--txt2)' }}>Chargement...</p>}

      {data && !isLoading && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>
              📅 Composition {compo} — Classe {niveau}{div}
            </span>
          </div>

          {/* Stats globales */}
          <StatsGrid>
            <StatCard value={data.stats.effectif} label="Effectif total" color="vert" />
            <StatCard value={data.stats.moyenneClasse !== null ? `${data.stats.moyenneClasse}/10` : '—'} label="Moyenne de classe" color="or" />
            <StatCard value={data.stats.avecMoyenne} label="Ont la moyenne" color="vert" />
            <StatCard value={data.stats.sansMoyenne} label="N'ont pas la moyenne" color="rouge" />
            <StatCard value={data.stats.maxMoyenne ?? '—'} label="Meilleure note" color="bleu" />
            <StatCard value={data.stats.minMoyenne ?? '—'} label="Note la plus basse" color="violet" />
          </StatsGrid>

          {/* Classement */}
          <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--vert)', marginBottom: '1rem' }}>
            🏆 Classement des élèves
          </h3>
          <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Nom et Prénom</th>
                  <th>Sexe</th>
                  <th>Moy./10</th>
                  <th>Mention</th>
                  <th>Moyenne</th>
                </tr>
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
                      <td>
                        {e.mention?.label && e.mention.label !== '—'
                          ? <span className={`mention ${e.mention.cls}`}>{e.mention.label}</span>
                          : '—'}
                      </td>
                      <td>
                        {e.moyenne !== null
                          ? e.aMoyenne
                            ? <span className="badge badge-success">✓ Oui</span>
                            : <span className="badge badge-danger">✗ Non</span>
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Stats par matière */}
          <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--vert)', marginBottom: '1rem' }}>
            📚 Statistiques par matière
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Coef</th>
                  <th>Barème</th>
                  <th>Moy. classe</th>
                  <th>Max</th>
                  <th>Min</th>
                </tr>
              </thead>
              <tbody>
                {data.matiereStats.map((ms: any) => (
                  <tr key={ms.matiere.id}>
                    <td><strong>{ms.matiere.nom}</strong></td>
                    <td>×{ms.matiere.coef}</td>
                    <td>/{ms.matiere.bareme}</td>
                    <td>{ms.moyenneClasse ?? '—'}</td>
                    <td>{ms.max ?? '—'}</td>
                    <td>{ms.min ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!data && !isLoading && triggered && (
        <div className="empty">
          <div className="empty-icon">📊</div>
          <p>Aucun élève dans cette classe.</p>
        </div>
      )}

      {!triggered && (
        <div className="empty">
          <div className="empty-icon">📊</div>
          <p>Sélectionnez une classe et cliquez sur Générer.</p>
        </div>
      )}
    </Card>
  )
}