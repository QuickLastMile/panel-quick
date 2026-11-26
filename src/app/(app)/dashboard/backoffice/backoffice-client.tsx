'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Rows3, Columns3, UserRound, Upload, Trash2, Sigma } from 'lucide-react';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
import BarTrendChart from '@/components/charts/bar-trend-chart';
import StatCard from '@/components/stat-card';
import { formatBogotaDateTime } from '@/lib/date-filter';
import { MAX_COLUMNAS, MAX_FILAS, type CargaDetalle, type CargaResumen, type Celda } from '@/lib/backoffice-types';
import { subirCarga, anular } from './actions';

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]';
const labelCls = 'mb-1 block text-xs font-semibold text-[var(--text-secondary)]';
const btnGold =
  'flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60';
const btnGhost =
  'flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-60';
const thCls =
  'border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide whitespace-nowrap text-[var(--text-muted)]';
const tdCls = 'whitespace-nowrap px-4 py-2 text-[var(--text-secondary)]';

const fmtNum = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 2 });

// ───────────────────────── Lectura del Excel ─────────────────────────

type HojaLeida = { nombre: string; matriz: Celda[][] };

const pad = (n: number) => String(n).padStart(2, '0');

// exceljs devuelve las fechas como Date en UTC con la hora "de pared" de la
// celda — se leen con getUTC* para no correrlas un día por la zona horaria.
function fechaATexto(d: Date): string {
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return d.getUTCHours() || d.getUTCMinutes() ? `${base} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : base;
}

function celdaExcel(v: unknown): Celda {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  // "$ -" es el cero del formato contable de Excel cuando la celda quedó
  // como texto (pasa en los consolidados de ajustes).
  if (typeof v === 'string') return /^\s*\$?\s*-\s*$/.test(v) ? 0 : v.trim() || null;
  if (typeof v === 'boolean') return v ? 'SI' : 'NO';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : fechaATexto(v);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('result' in o) return celdaExcel(o.result);
    if (Array.isArray(o.richText)) return celdaExcel(o.richText.map((t: { text?: string }) => t.text || '').join(''));
    if ('text' in o) return celdaExcel(o.text);
    if ('error' in o) return null;
  }
  return String(v);
}

// CSV simple: separador "," o ";" (Excel en español suele exportar con ";"),
// con soporte de comillas.
function leerCsv(texto: string): Celda[][] {
  const primera = texto.split(/\r?\n/, 1)[0] || '';
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  const filas: Celda[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      filas.push(fila.map((s) => s.trim() || null));
      fila = [];
      campo = '';
    } else campo += c;
  }
  if (campo || fila.length) {
    fila.push(campo);
    filas.push(fila.map((s) => s.trim() || null));
  }
  return filas;
}

async function leerArchivo(file: File): Promise<HojaLeida[]> {
  if (/\.csv$/i.test(file.name)) {
    return [{ nombre: 'CSV', matriz: leerCsv(await file.text()) }];
  }
  // Igual que export-servicios.ts: exceljs se carga solo al usarlo (~1 MB).
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const hojas: HojaLeida[] = [];
  wb.eachSheet((ws) => {
    const matriz: Celda[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const valores = Array.isArray(row.values) ? row.values.slice(1) : [];
      matriz[n - 1] = valores.map(celdaExcel);
    });
    for (let i = 0; i < matriz.length; i++) if (!matriz[i]) matriz[i] = [];
    hojas.push({ nombre: ws.name, matriz });
  });
  return hojas;
}

const noVacias = (fila: Celda[] | undefined) => (fila || []).filter((v) => v !== null && v !== '').length;

// Encabezado por defecto: la primera fila que tenga tantas celdas llenas
// como la más llena de las primeras 10 (se salta títulos o notas sueltas
// arriba de la tabla).
function filaEncabezadoAuto(matriz: Celda[][]): number {
  const primeras = matriz.slice(0, 10);
  const max = Math.max(0, ...primeras.map(noVacias));
  const i = primeras.findIndex((f) => noVacias(f) >= max && max > 0);
  return i < 0 ? 0 : i;
}

function armarTabla(matriz: Celda[][], filaEnc: number): { columnas: string[]; filas: Celda[][] } {
  const enc = matriz[filaEnc] || [];
  const datos = matriz.slice(filaEnc + 1).filter((f) => noVacias(f) > 0);
  const ancho = Math.max(enc.length, ...datos.map((f) => f.length));
  // Se descartan columnas sin encabezado y sin ningún dato (bordes vacíos
  // del Excel); las que tienen datos pero no título quedan como "Columna N".
  const usadas: number[] = [];
  for (let c = 0; c < ancho; c++) {
    if ((enc[c] !== null && enc[c] !== undefined && enc[c] !== '') || datos.some((f) => f[c] !== null && f[c] !== undefined)) usadas.push(c);
  }
  const vistos = new Map<string, number>();
  const columnas = usadas.map((c) => {
    const base = enc[c] !== null && enc[c] !== undefined ? String(enc[c]).trim() : `Columna ${c + 1}`;
    const n = (vistos.get(base) || 0) + 1;
    vistos.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });
  const filas = datos.map((f) => usadas.map((c) => (f[c] === undefined ? null : f[c])));
  return { columnas, filas };
}

// ───────────────────────── Análisis de columnas ─────────────────────────

type TipoColumna = 'numero' | 'fecha' | 'texto';
type InfoColumna = { nombre: string; idx: number; tipo: TipoColumna; esCodigo: boolean; distintos: number; llenas: number };

// "AAAA-MM-DD..." (como se guardan las fechas leídas del Excel) o
// "D/M/AAAA" (texto, como viene de Quick) -> "AAAA-MM-DD".
function claveFecha(v: Celda): string | null {
  if (typeof v !== 'string') return null;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  return null;
}

function analizarColumnas(columnas: string[], filas: Celda[][]): InfoColumna[] {
  return columnas.map((nombre, idx) => {
    let llenas = 0;
    let numeros = 0;
    let fechas = 0;
    const distintos = new Set<string>();
    for (const f of filas) {
      const v = f[idx];
      if (v === null || v === '') continue;
      llenas++;
      if (typeof v === 'number') numeros++;
      else if (claveFecha(v)) fechas++;
      if (distintos.size <= 5000) distintos.add(String(v));
    }
    // Columnas numéricas que en realidad son códigos (ID de servicio, PIN de
    // ajuste, cédula…): sumarlas no tiene sentido, se tratan como texto para
    // poder agrupar por ellas.
    const esCodigo = /\b(id|pin|c[oó]d(igo)?|nit|c[eé]dula|documento)\b/i.test(nombre);
    const tipo: TipoColumna =
      llenas && numeros / llenas >= 0.9 && !esCodigo ? 'numero' : llenas && fechas / llenas >= 0.9 ? 'fecha' : 'texto';
    return { nombre, idx, tipo, esCodigo, distintos: distintos.size, llenas };
  });
}

const etiquetaCategoria = (v: Celda) => (v === null || v === '' ? '(vacío)' : String(v));

function agrupar(filas: Celda[][], colIdx: number, medidaIdx: number | null, top = 15) {
  const acc = new Map<string, number>();
  for (const f of filas) {
    const k = etiquetaCategoria(f[colIdx]);
    const v = medidaIdx === null ? 1 : typeof f[medidaIdx] === 'number' ? (f[medidaIdx] as number) : 0;
    acc.set(k, (acc.get(k) || 0) + v);
  }
  const items = Array.from(acc.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
  if (items.length <= top) return items;
  const resto = items.slice(top - 1).reduce((s, i) => s + i.count, 0);
  return [...items.slice(0, top - 1), { key: `Otros (${items.length - top + 1})`, count: resto }];
}

// ───────────────────────── Cortes por día / semana / mes ─────────────────────────

type Periodo = 'dia' | 'semana' | 'mes';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const fechaUTC = (k: string) => new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10))));
const claveDe = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
// 0 = lunes … 6 = domingo.
const diaSemana = (k: string) => (fechaUTC(k).getUTCDay() + 6) % 7;

// Semanas de lunes a domingo — igual que los cortes del BackOffice
// (ej. "Corte 1 del 16 al 22 de noviembre" = lunes a domingo).
function lunesDe(k: string): string {
  const d = fechaUTC(k);
  d.setUTCDate(d.getUTCDate() - diaSemana(k));
  return claveDe(d);
}

function clavePeriodo(dia: string, p: Periodo): string {
  return p === 'dia' ? dia : p === 'semana' ? lunesDe(dia) : dia.slice(0, 7);
}

const mesCorto = (k: string) => MESES[Number(k.slice(5, 7)) - 1].slice(0, 3);

function etiquetaPeriodo(clave: string, p: Periodo): string {
  if (p === 'mes') return `${MESES[Number(clave.slice(5, 7)) - 1]} ${clave.slice(0, 4)}`;
  if (p === 'dia') return `${DIAS_SEMANA[diaSemana(clave)]} ${Number(clave.slice(8, 10))} ${mesCorto(clave)} ${clave.slice(0, 4)}`;
  const fin = fechaUTC(clave);
  fin.setUTCDate(fin.getUTCDate() + 6);
  const k2 = claveDe(fin);
  const ini = clave.slice(5, 7) === k2.slice(5, 7) ? String(Number(clave.slice(8, 10))) : `${Number(clave.slice(8, 10))} ${mesCorto(clave)}`;
  return `${ini} al ${Number(k2.slice(8, 10))} ${mesCorto(k2)} ${k2.slice(0, 4)}`;
}

function etiquetaCortaPeriodo(clave: string, p: Periodo, muchos: boolean): string {
  if (p === 'mes') return `${mesCorto(clave)} ${clave.slice(2, 4)}`;
  if (p === 'semana') return `${Number(clave.slice(8, 10))} ${mesCorto(clave)}`;
  return muchos ? clave.slice(8, 10) : `${clave.slice(8, 10)}/${clave.slice(5, 7)}`;
}

const valorMedida = (f: Celda[], medidaIdx: number | null) =>
  medidaIdx === null ? 1 : typeof f[medidaIdx] === 'number' ? (f[medidaIdx] as number) : 0;

function tendencia(filas: Celda[][], fechaIdx: number, medidaIdx: number | null, periodo: Periodo) {
  const acc = new Map<string, number>();
  for (const f of filas) {
    const k = claveFecha(f[fechaIdx]);
    if (!k) continue;
    const p = clavePeriodo(k, periodo);
    acc.set(p, (acc.get(p) || 0) + valorMedida(f, medidaIdx));
  }
  const claves = Array.from(acc.keys()).sort();
  return claves.map((k) => ({ label: etiquetaCortaPeriodo(k, periodo, claves.length > 15), value: acc.get(k)! }));
}

// Lunes a domingo en orden fijo (no por tamaño) — se lee como calendario.
function porDiaSemana(filas: Celda[][], fechaIdx: number, medidaIdx: number | null) {
  const acc = DIAS_SEMANA.map(() => 0);
  for (const f of filas) {
    const k = claveFecha(f[fechaIdx]);
    if (k) acc[diaSemana(k)] += valorMedida(f, medidaIdx);
  }
  return DIAS_SEMANA.map((key, i) => ({ key, count: acc[i] }));
}

// ───────────────────────── Componente ─────────────────────────

export default function BackofficeClient({
  cargas,
  carga,
  canUpload,
  isAdmin,
  currentEmail,
}: {
  cargas: CargaResumen[];
  carga: CargaDetalle | null;
  canUpload: boolean;
  isAdmin: boolean;
  currentEmail: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      {canUpload && <Cargador onSubido={(id) => router.push(`/dashboard/backoffice?carga=${id}`)} />}

      {!cargas.length ? (
        <div className="panel-card rounded-xl p-10 text-center text-sm text-[var(--text-muted)]">
          Todavía no hay archivos cargados.{canUpload ? ' Sube el primero arriba.' : ''}
        </div>
      ) : (
        <>
          <SelectorCarga
            cargas={cargas}
            actual={carga}
            puedeAnular={!!carga && (isAdmin || (canUpload && carga.subidoPor === currentEmail))}
            onCambiar={(id) => router.push(`/dashboard/backoffice?carga=${id}`)}
            onAnulada={() => router.push('/dashboard/backoffice')}
          />
          {carga && <Tablero key={carga.id} carga={carga} />}
        </>
      )}
    </div>
  );
}

function Cargador({ onSubido }: { onSubido: (id: string) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [hojas, setHojas] = useState<HojaLeida[]>([]);
  const [hojaIdx, setHojaIdx] = useState(0);
  const [filaEnc, setFilaEnc] = useState(0);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState('');
  const [guardando, startGuardar] = useTransition();
  const [arrastrando, setArrastrando] = useState(false);

  const hoja = hojas[hojaIdx];
  const tabla = useMemo(() => (hoja ? armarTabla(hoja.matriz, filaEnc) : null), [hoja, filaEnc]);

  async function elegir(file: File | undefined) {
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setError('El archivo debe ser Excel (.xlsx) o CSV. Si es .xls viejo, ábrelo y guárdalo como .xlsx.');
      return;
    }
    setError('');
    setLeyendo(true);
    try {
      const leidas = (await leerArchivo(file)).filter((h) => h.matriz.some((f) => noVacias(f) > 0));
      if (!leidas.length) throw new Error('El archivo está vacío.');
      setArchivo(file);
      setHojas(leidas);
      setHojaIdx(0);
      setFilaEnc(filaEncabezadoAuto(leidas[0].matriz));
    } catch (e) {
      setError(e instanceof Error ? `No se pudo leer el archivo: ${e.message}` : 'No se pudo leer el archivo.');
      setArchivo(null);
      setHojas([]);
    } finally {
      setLeyendo(false);
    }
  }

  function cambiarHoja(i: number) {
    setHojaIdx(i);
    setFilaEnc(filaEncabezadoAuto(hojas[i].matriz));
  }

  function cancelar() {
    setArchivo(null);
    setHojas([]);
    setError('');
  }

  function guardar() {
    if (!archivo || !hoja || !tabla) return;
    if (tabla.filas.length > MAX_FILAS) return setError(`Máximo ${MAX_FILAS.toLocaleString('es-CO')} filas por carga.`);
    if (tabla.columnas.length > MAX_COLUMNAS) return setError(`Máximo ${MAX_COLUMNAS} columnas por carga.`);
    setError('');
    startGuardar(async () => {
      const res = await subirCarga({ archivo: archivo.name, hoja: hoja.nombre, columnas: tabla.columnas, filas: tabla.filas });
      if (res.error || !res.id) return setError(res.error || 'No se pudo guardar la carga.');
      cancelar();
      onSubido(res.id);
    });
  }

  return (
    <div className="panel-card rounded-xl p-5">
      <h2 className="text-sm font-bold text-[var(--text)]">Subir archivo de ajustes</h2>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Excel (.xlsx) o CSV. Revisa la vista previa antes de guardar; las gráficas se arman solas con las columnas del archivo.
      </p>

      {!archivo ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            elegir(e.dataTransfer.files[0]);
          }}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
            arrastrando ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
          }`}
        >
          <Upload size={22} className="text-[var(--accent-bright)]" />
          <span className="text-sm font-semibold text-[var(--text)]">{leyendo ? 'Leyendo archivo…' : 'Arrastra el archivo aquí o haz clic para elegirlo'}</span>
          <span className="text-xs text-[var(--text-muted)]">
            Hasta {MAX_FILAS.toLocaleString('es-CO')} filas y {MAX_COLUMNAS} columnas
          </span>
          <input
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            disabled={leyendo}
            onChange={(e) => {
              elegir(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      ) : (
        tabla && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <FileSpreadsheet size={16} className="flex-none text-[var(--accent-bright)]" />
                <span className="truncate">{archivo.name}</span>
              </div>
              {hojas.length > 1 && (
                <div className="w-44">
                  <label className={labelCls}>Hoja</label>
                  <select value={hojaIdx} onChange={(e) => cambiarHoja(Number(e.target.value))} className={inputCls}>
                    {hojas.map((h, i) => (
                      <option key={h.nombre} value={i}>
                        {h.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="w-44">
                <label className={labelCls}>Fila de encabezados</label>
                <select value={filaEnc} onChange={(e) => setFilaEnc(Number(e.target.value))} className={inputCls}>
                  {hoja.matriz.slice(0, 15).map((_, i) => (
                    <option key={i} value={i}>
                      Fila {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <span className="pb-2 text-xs text-[var(--text-muted)]">
                {tabla.filas.length.toLocaleString('es-CO')} filas · {tabla.columnas.length} columnas
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {tabla.columnas.map((c) => (
                      <th key={c} className={thCls}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabla.filas.slice(0, 8).map((f, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                      {f.map((v, j) => (
                        <td key={j} className={tdCls}>
                          {v === null ? '' : typeof v === 'number' ? fmtNum(v) : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tabla.filas.length > 8 && (
              <p className="text-xs text-[var(--text-muted)]">Vista previa de las primeras 8 filas.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={guardar} disabled={guardando || !tabla.filas.length} className={btnGold}>
                <Upload size={15} />
                {guardando ? 'Guardando…' : 'Guardar carga'}
              </button>
              <button type="button" onClick={cancelar} disabled={guardando} className={btnGhost}>
                Cancelar
              </button>
            </div>
          </div>
        )
      )}

      {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}

function SelectorCarga({
  cargas,
  actual,
  puedeAnular,
  onCambiar,
  onAnulada,
}: {
  cargas: CargaResumen[];
  actual: CargaDetalle | null;
  puedeAnular: boolean;
  onCambiar: (id: string) => void;
  onAnulada: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const [anulando, startAnular] = useTransition();

  function confirmarAnular() {
    if (!actual) return;
    startAnular(async () => {
      const res = await anular(actual.id);
      if (res.error) return setError(res.error);
      setConfirmando(false);
      onAnulada();
    });
  }

  return (
    <div className="panel-card flex flex-wrap items-end gap-3 rounded-xl p-4">
      <div className="min-w-0 flex-1 sm:max-w-xl">
        <label className={labelCls}>Archivo cargado</label>
        <select
          value={actual?.id || ''}
          onChange={(e) => {
            setConfirmando(false);
            setError('');
            onCambiar(e.target.value);
          }}
          className={inputCls}
        >
          {cargas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.archivo} · {formatBogotaDateTime(c.subidoEn)} · {c.totalFilas.toLocaleString('es-CO')} filas
            </option>
          ))}
        </select>
      </div>
      {puedeAnular &&
        (confirmando ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">¿Anular esta carga?</span>
            <button type="button" onClick={confirmarAnular} disabled={anulando} className={`${btnGhost} border-red-500/50 text-red-400`}>
              {anulando ? 'Anulando…' : 'Sí, anular'}
            </button>
            <button type="button" onClick={() => setConfirmando(false)} disabled={anulando} className={btnGhost}>
              No
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className={btnGhost} title="La carga deja de verse; queda en el historial">
            <Trash2 size={13} />
            Anular carga
          </button>
        ))}
      {error && <p className="w-full text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}

function Tablero({ carga }: { carga: CargaDetalle }) {
  const info = useMemo(() => analizarColumnas(carga.columnas, carga.filas), [carga]);
  const textos = info.filter((c) => c.tipo === 'texto' && c.distintos >= 2);
  const numeros = info.filter((c) => c.tipo === 'numero');
  const fechas = info.filter((c) => c.tipo === 'fecha');

  // Agrupación por defecto: la primera columna de texto "de verdad" (no un
  // código) con pocas categorías (2-50) — lo que más se parece a "proyecto",
  // "tipo de ajuste", etc.
  const defGrupo =
    (textos.find((c) => !c.esCodigo && c.distintos <= 50) || textos.find((c) => c.distintos <= 50) || textos[0])?.idx ?? -1;
  // Fecha por defecto: la que se llame solo "Fecha" (la del servicio — es la
  // que define el corte: "Corte 1 del 16 al 22" = FECHA de lunes a domingo;
  // F AJUSTE suele caer el lunes siguiente), si no la del ajuste, si no la
  // primera.
  const defFecha = (fechas.find((c) => /^fecha$/i.test(c.nombre.trim())) || fechas.find((c) => /ajuste/i.test(c.nombre)) || fechas[0])?.idx ?? -1;
  const [grupoIdx, setGrupoIdx] = useState(defGrupo);
  const [medidaIdx, setMedidaIdx] = useState<number | null>(null);
  const [fechaIdx, setFechaIdx] = useState(defFecha);
  const [corte, setCorte] = useState<Periodo | 'todo'>('todo');
  const [corteValor, setCorteValor] = useState('');
  const [verPor, setVerPor] = useState<Periodo | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Cortes disponibles según la fecha de referencia (más reciente primero).
  const opcionesCorte = useMemo(() => {
    if (corte === 'todo' || fechaIdx < 0) return [];
    const set = new Set<string>();
    carga.filas.forEach((f) => {
      const k = claveFecha(f[fechaIdx]);
      if (k) set.add(clavePeriodo(k, corte));
    });
    return Array.from(set).sort().reverse();
  }, [carga, fechaIdx, corte]);
  const corteActual = opcionesCorte.includes(corteValor) ? corteValor : opcionesCorte[0] || '';

  // Todo el tablero (tarjetas, gráficas y detalle) trabaja sobre las filas
  // del corte elegido.
  const filas = useMemo(() => {
    if (corte === 'todo' || fechaIdx < 0 || !corteActual) return carga.filas;
    return carga.filas.filter((f) => {
      const k = claveFecha(f[fechaIdx]);
      return !!k && clavePeriodo(k, corte) === corteActual;
    });
  }, [carga, fechaIdx, corte, corteActual]);

  // Tendencia: por defecto, un nivel más fino que el corte (mes -> días,
  // todo -> semanas o días según cuántos haya).
  const periodoTendencia: Periodo = useMemo(() => {
    if (verPor) return verPor;
    if (corte === 'mes' || corte === 'semana' || corte === 'dia') return 'dia';
    if (fechaIdx < 0) return 'dia';
    const dias = new Set(carga.filas.map((f) => claveFecha(f[fechaIdx])).filter(Boolean));
    return dias.size > 120 ? 'mes' : dias.size > 31 ? 'semana' : 'dia';
  }, [verPor, corte, carga, fechaIdx]);

  const medidaNombre = medidaIdx === null ? 'Cantidad de filas' : `Suma de ${carga.columnas[medidaIdx]}`;
  const ranking = useMemo(() => (grupoIdx >= 0 ? agrupar(filas, grupoIdx, medidaIdx) : []), [filas, grupoIdx, medidaIdx]);
  const trend = useMemo(
    () => (fechaIdx >= 0 && corte !== 'dia' ? tendencia(filas, fechaIdx, medidaIdx, periodoTendencia) : null),
    [filas, fechaIdx, medidaIdx, periodoTendencia, corte]
  );
  const semana = useMemo(
    () => (fechaIdx >= 0 && corte !== 'dia' ? porDiaSemana(filas, fechaIdx, medidaIdx) : null),
    [filas, fechaIdx, medidaIdx, corte]
  );
  const totalMedida = useMemo(
    () => (medidaIdx === null ? null : filas.reduce((s, f) => s + valorMedida(f, medidaIdx), 0)),
    [filas, medidaIdx]
  );

  // Gráficas pequeñas automáticas: otras columnas con pocas categorías.
  const extras = textos.filter((c) => c.idx !== grupoIdx && c.distintos <= 25).slice(0, 4);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) => f.some((v) => v !== null && String(v).toLowerCase().includes(q)));
  }, [filas, busqueda]);

  const etiquetaCorte = corte !== 'todo' && corteActual ? etiquetaPeriodo(corteActual, corte) : '';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={etiquetaCorte ? 'Filas del corte' : 'Filas'}
          value={filas.length.toLocaleString('es-CO')}
          icon={Rows3}
          sub={etiquetaCorte ? `de ${carga.totalFilas.toLocaleString('es-CO')} en el archivo` : carga.hoja ? `Hoja: ${carga.hoja}` : undefined}
        />
        <StatCard label="Columnas" value={String(carga.columnas.length)} icon={Columns3} sub={`${numeros.length} numéricas · ${fechas.length} de fecha`} />
        {totalMedida !== null ? (
          <StatCard label={medidaNombre} value={fmtNum(totalMedida)} icon={Sigma} iconColor="#4fb3f3" sub={etiquetaCorte || 'Todo el archivo'} />
        ) : (
          <StatCard label="Archivo" value={carga.archivo.replace(/\.(xlsx|csv)$/i, '')} icon={FileSpreadsheet} iconColor="#4fb3f3" />
        )}
        <StatCard
          label="Subido por"
          value={carga.subidoPorNombre || carga.subidoPor.split('@')[0]}
          sub={formatBogotaDateTime(carga.subidoEn)}
          icon={UserRound}
          iconColor="#7bd389"
        />
      </div>

      {fechaIdx >= 0 && (
        <div className="panel-card flex flex-wrap items-end gap-3 rounded-xl p-4">
          <div className="w-full sm:w-auto">
            <label className={labelCls}>Corte</label>
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-0.5">
              {(
                [
                  ['todo', 'Todo'],
                  ['dia', 'Día'],
                  ['semana', 'Semana'],
                  ['mes', 'Mes'],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setCorte(v);
                    setCorteValor('');
                  }}
                  className={`flex-1 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    corte === v ? 'bg-gradient-gold text-[#141008]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {corte !== 'todo' && (
            <div className="w-full sm:w-64">
              <label className={labelCls}>{corte === 'dia' ? 'Día' : corte === 'semana' ? 'Semana (lunes a domingo)' : 'Mes'}</label>
              <select value={corteActual} onChange={(e) => setCorteValor(e.target.value)} className={inputCls}>
                {opcionesCorte.map((k) => (
                  <option key={k} value={k}>
                    {etiquetaPeriodo(k, corte)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {fechas.length > 1 && (
            <div className="w-full sm:w-52">
              <label className={labelCls}>Según la fecha</label>
              <select value={fechaIdx} onChange={(e) => setFechaIdx(Number(e.target.value))} className={inputCls}>
                {fechas.map((c) => (
                  <option key={c.idx} value={c.idx}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="panel-card flex flex-wrap items-end gap-3 rounded-xl p-4">
        <div className="w-full sm:w-60">
          <label className={labelCls}>Agrupar por</label>
          <select value={grupoIdx} onChange={(e) => setGrupoIdx(Number(e.target.value))} className={inputCls} disabled={!textos.length}>
            {!textos.length && <option value={-1}>(sin columnas de texto)</option>}
            {textos.map((c) => (
              <option key={c.idx} value={c.idx}>
                {c.nombre} ({c.distintos.toLocaleString('es-CO')})
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-60">
          <label className={labelCls}>Medir</label>
          <select
            value={medidaIdx === null ? '' : medidaIdx}
            onChange={(e) => setMedidaIdx(e.target.value === '' ? null : Number(e.target.value))}
            className={inputCls}
          >
            <option value="">Cantidad de filas</option>
            {numeros.map((c) => (
              <option key={c.idx} value={c.idx}>
                Suma de {c.nombre}
              </option>
            ))}
          </select>
        </div>
        {trend && (
          <div className="w-full sm:w-44">
            <label className={labelCls}>Ver tendencia por</label>
            <select value={periodoTendencia} onChange={(e) => setVerPor(e.target.value as Periodo)} className={inputCls}>
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
          </div>
        )}
      </div>

      {!filas.length ? (
        <div className="panel-card rounded-xl p-10 text-center text-sm text-[var(--text-muted)]">No hay filas en este corte.</div>
      ) : (
        <>
          <div className={`grid gap-5 ${trend ? 'xl:grid-cols-2' : ''}`}>
            {grupoIdx >= 0 && (
              <ChartCard
                title={`${medidaNombre} por ${carga.columnas[grupoIdx]}`}
                description={`${etiquetaCorte || 'Todo el archivo'} · las 15 categorías más grandes; el resto se suma en «Otros».`}
              >
                <RankingBarList items={ranking} formatValue={fmtNum} showPercent />
              </ChartCard>
            )}
            {trend && (
              <ChartCard
                title={`${medidaNombre} por ${periodoTendencia === 'dia' ? 'día' : periodoTendencia}`}
                description={`${etiquetaCorte || 'Todo el archivo'} · según «${carga.columnas[fechaIdx]}».`}
              >
                <BarTrendChart points={trend} valueFormatter={fmtNum} />
              </ChartCard>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {semana && (
              <ChartCard
                title={`${medidaNombre} por día de la semana`}
                description={`${etiquetaCorte || 'Todo el archivo'} · según «${carga.columnas[fechaIdx]}».`}
              >
                <RankingBarList items={semana} formatValue={fmtNum} showPercent />
              </ChartCard>
            )}
            {extras.map((c) => (
              <ChartCard key={c.idx} title={`${medidaNombre} por ${c.nombre}`} description={etiquetaCorte || 'Todo el archivo'}>
                <RankingBarList items={agrupar(filas, c.idx, medidaIdx, 10)} formatValue={fmtNum} showPercent />
              </ChartCard>
            ))}
          </div>
        </>
      )}

      <div className="panel-card rounded-xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[var(--text)]">Detalle</h2>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el archivo…"
            className={`${inputCls} sm:max-w-xs`}
          />
        </div>
        <div className="max-h-[480px] overflow-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr>
                {carga.columnas.map((c) => (
                  <th key={c} className={thCls}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.slice(0, 200).map((f, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]">
                  {f.map((v, j) => (
                    <td key={j} className={`${tdCls} ${typeof v === 'number' ? 'text-right tabular-nums' : ''}`}>
                      {v === null ? '' : typeof v === 'number' ? fmtNum(v) : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {filtradas.length > 200
            ? `Mostrando 200 de ${filtradas.length.toLocaleString('es-CO')} filas — usa la búsqueda para encontrar una en particular.`
            : `${filtradas.length.toLocaleString('es-CO')} filas.`}
        </p>
      </div>
    </div>
  );
}
