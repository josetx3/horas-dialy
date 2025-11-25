import { Injectable } from '@angular/core';
import { ParsedEntry } from "../interfaces/main.interface";

@Injectable({
  providedIn: 'root'
})
export class MainService {

  constructor() {}

  /**
   * Parse the whole text file and return array of ParsedEntry
   */
  parseText(content: string, cliente: string, proyecto: string): ParsedEntry[] {
    const lines = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const entries: ParsedEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect Task or Bug
      const headMatch = line.match(/^(Task|Bug)\s*#\s*(\d+)\s*:\s*(.+)$/i);
      if (!headMatch) continue;

      const tipoRaw = headMatch[1];
      const id = headMatch[2];
      const actividadRaw = headMatch[3].trim();

      // ---------------------------------------
      // EXTRAER NOMBRE Y FECHA
      // ---------------------------------------
      let nombre = "Unknown";
      let fecha = "";

      const lineHora = lines[i + 1] ?? "";

      // Caso 1 → línea contiene SOLO "hora registrada por"
      if (/^hora registrada por$/i.test(lineHora)) {

        const lineDatos = lines[i + 2] ?? "";

        // "Brainer Ricardo Gerena el 2025-11-24 05:16 PM"
        const datosMatch = lineDatos.match(/^(.*?)\s+el\s+(\d{4}-\d{2}-\d{2})/);

        if (datosMatch) {
          nombre = datosMatch[1].trim();
          fecha = datosMatch[2];
        }

      } else {

        // Caso 2 → formato antiguo "hora registrada por Juan el 2025-11-24 ..."
        const inlineMatch = lineHora.match(/hora registrada por\s+(.+?)\s+el\s+(\d{4}-\d{2}-\d{2})/i);

        if (inlineMatch) {
          nombre = inlineMatch[1].trim();
          fecha = inlineMatch[2];
        }
      }

      // Fallback → buscar fecha aunque no haya nombre
      if (!fecha) {
        const possibleDate = (lines[i + 1] + " " + (lines[i + 2] ?? ""))
          .match(/(\d{4}-\d{2}-\d{2})/);

        if (possibleDate) fecha = possibleDate[1];
      }

      // ---------------------------------------
      // EXTRAER HORAS
      // ---------------------------------------
      let horas = 0;
      let spentLineIdx = -1;

      for (let j = i + 1; j <= Math.min(i + 4, lines.length - 1); j++) {
        const spent = lines[j].match(/Spent time:\s*([\d.,]+)\s*(horas|hora|h)?/i);
        if (spent) {
          horas = parseFloat(spent[1].replace(',', '.'));
          if (Number.isNaN(horas)) horas = 0;
          spentLineIdx = j;
          break;
        }
      }

      // ---------------------------------------
      // CREAR ENTRY
      // ---------------------------------------
      const entry: ParsedEntry = {
        nombre,
        fecha,
        cliente,
        proyecto,
        tipo: tipoRaw.toLowerCase() === 'task'
          ? 'Task'
          : tipoRaw.toLowerCase() === 'bug'
            ? 'Bug'
            : 'Unknown',
        codigo: `${tipoRaw} #${id}`,
        actividad: actividadRaw,
        horas
      };

      entries.push(entry);

      // Saltar hasta después del spent time
      if (spentLineIdx > i) i = spentLineIdx;
    }

    return entries;
  }
}
