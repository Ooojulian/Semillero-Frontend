import { useEffect, useState } from 'react';

const BASE_URL = 'https://docs.google.com/spreadsheets/d';

async function fetchSheet(sheetId: string, sheetName: string) {
  const url = `${BASE_URL}/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substring(47, text.length - 2));
  const cols: string[] = json.table.cols.map((c: { label: string }) => c.label).filter(Boolean);
  const rows: Record<string, string>[] = json.table.rows.map((r: { c: { v: unknown }[] }) => {
    const row: Record<string, string> = {};
    r.c.forEach((cell, i) => {
      if (cols[i]) row[cols[i]] = cell?.v != null ? String(cell.v) : '';
    });
    return row;
  });
  return rows;
}

export function useGoogleSheets() {
  const [baseReclutamiento, setBaseReclutamiento] = useState<Record<string, string>[]>([]);
  const [candidatosN8n, setCandidatosN8n] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchSheet('1iXqva70GWk-3IRZe_DCiU6IqK8xDvBGTRlonfnFZuZc', 'BaseReclutamiento'),
      fetchSheet('1n7foRyk2_tVOA_0deM18IlRO8STnXvlkQlUqHXdm8cQ', 'ListadoCandidatos'),
    ])
      .then(([base, candidatos]) => {
        setBaseReclutamiento(base);
        setCandidatosN8n(candidatos);
      })
      .catch(() => setError('No se pudieron cargar las hojas. Verifica que sean públicas.'))
      .finally(() => setLoading(false));
  }, []);

  return { baseReclutamiento, candidatosN8n, loading, error };
}
