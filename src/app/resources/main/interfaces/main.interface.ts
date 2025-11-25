export interface ParsedEntry {
  nombre: string;
  fecha: string;         // YYYY-MM-DD
  cliente: string;
  proyecto: string;
  tipo: 'Task' | 'Bug' | 'Unknown';
  codigo: string;        // e.g. "Task #54056"
  actividad: string;
  horas: number;         // decimal
}
