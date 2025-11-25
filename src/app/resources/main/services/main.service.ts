import {Injectable} from '@angular/core';
import {ParsedEntry} from "../interfaces/main.interface";

@Injectable({
  providedIn: 'root'
})
export class MainService {

  constructor() {
  }

  /**
   * Parse the whole text file and return array of ParsedEntry
   */
  parseText(content: string, cliente: string, proyecto: string): ParsedEntry[] {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const entries: ParsedEntry[] = [];

    // We'll iterate lines and try to pick blocks where:
    // 1) starts with "Task #" or "Bug #"
    // 2) next line contains "hora registrada por ... el YYYY-MM-DD ..."
    // 3) next lines contain "Spent time: X ..."

    // We'll use index cursor
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match Task or Bug line: e.g. "Task #54056: QA-9220_REPORTE..."
      const headMatch = line.match(/^(Task|Bug)\s*#\s*(\d+)\s*:\s*(.+)$/i);
      if (!headMatch) {
        // try a slightly different pattern with no colon but with activity on same line
        // or skip
        continue;
      }

      const tipoRaw = headMatch[1];
      const id = headMatch[2];
      const actividadRaw = headMatch[3].trim();

      // Next line should have "hora registrada por {nombre} el {fecha} ..." (time optional)
      const nextLine = lines[i + 1] ?? '';
      const horaMatch = nextLine.match(/hora registrada por\s+(.+?)\s+el\s+(\d{4}-\d{2}-\d{2})(?:\s+([\d:APMapm\s]+))?/i);

      // Fallback: maybe "hora registrada por Name el 2025-11-24 05:16 PM"
      let nombre = 'Unknown';
      let fecha = '';
      if (horaMatch) {
        nombre = horaMatch[1].trim();
        fecha = horaMatch[2];
      } else {
        // If pattern not found, try to search the line for date
        const dateSearch = nextLine.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateSearch) fecha = dateSearch[1];
        // try to extract a name if possible (text between "por" and "el")
        const nameSearch = nextLine.match(/por\s+(.+?)\s+el\s+\d{4}-\d{2}-\d{2}/i);
        if (nameSearch) nombre = nameSearch[1].trim();
      }

      // Then find the "Spent time" line somewhere after (within next 3 lines typically)
      let horas = 0;
      let spentLineIdx = -1;
      for (let j = i + 1; j <= Math.min(i + 4, lines.length - 1); j++) {
        const spent = lines[j].match(/Spent time:\s*([\d.,]+)\s*(horas|hora|h)?/i);
        if (spent) {
          let val = spent[1].replace(',', '.'); // support comma decimal
          horas = parseFloat(val);
          if (Number.isNaN(horas)) horas = 0;
          spentLineIdx = j;
          break;
        }
      }

      // Build entry
      const entry = {
        nombre,
        fecha: fecha || '', // may be empty if not parsed
        cliente,
        proyecto,
        tipo: (tipoRaw.toLowerCase() === 'task') ? 'Task' : (tipoRaw.toLowerCase() === 'bug') ? 'Bug' : 'Unknown',
        codigo: `${tipoRaw} #${id}`,
        actividad: actividadRaw,
        horas
      } as ParsedEntry;

      entries.push(entry);

      // Move cursor forward to after spentLineIdx if found, otherwise continue
      if (spentLineIdx > i) i = spentLineIdx;
    }

    return entries;
  }
}
