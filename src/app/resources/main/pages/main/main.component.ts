import * as XLSX from 'xlsx';
import {saveAs} from 'file-saver';
import {Component} from '@angular/core';
import {ParsedEntry} from "../../interfaces/main.interface";
import {MainService} from "../../services/main.service";
import {FormsModule} from "@angular/forms";
import {CommonModule, NgForOf, NgIf} from "@angular/common";

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    FormsModule,
    NgForOf
  ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent {
  cliente = '';
  proyecto = '';
  parsed: ParsedEntry[] = [];
  lastFileName = '';
  // UI state
  error = '';
  info = '';
  // Por usuario | tiempo total
  summary: { nombre: string, dia: string, tiempo: number }[] = [];

  constructor(private parser: MainService) {
  }

  onFileSelected(ev: Event) {
    this.error = '';
    this.info = '';
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.error = 'No se seleccionó ningún archivo.';
      return;
    }
    const file = input.files[0];
    this.lastFileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      // Validate cliente/proyecto exist (you said these are inputs on the page)
      if (!this.cliente || !this.proyecto) {
        this.error = 'Por favor completa Cliente y Proyecto antes de subir el archivo.';
        return;
      }
      this.parsed = this.parser.parseText(text, this.cliente, this.proyecto);
      if (this.parsed.length === 0) {
        this.info = 'No se encontraron registros compatibles en el archivo.';
      } else {
        this.info = `${this.parsed.length} registros importados correctamente.`;
        this.generateSummaryByUser();
      }
    };
    reader.onerror = () => {
      this.error = 'Error leyendo el archivo.';
    };
    reader.readAsText(file, 'UTF-8');
  }

  // Utility: total hours for all parsed
  totalHours(): number {
    return this.parsed.reduce((s, e) => s + (e.horas || 0), 0);
  }

  exportExcel() {
    if (!this.parsed.length) return;

    // -----------------------------------
    // HOJA 1 → REGISTROS
    // -----------------------------------
    const headers1 = ['Nombre', 'Fecha', 'Cliente', 'Proyecto', 'Codigo', 'Actividad', 'Total horas'];

    const rows1 = this.parsed.map(p => ({
      Nombre: p.nombre,
      Fecha: p.fecha,
      Cliente: p.cliente,
      Proyecto: p.proyecto,
      Codigo: p.codigo,
      Actividad: p.actividad,
      "Total horas": p.horas
    }));

    const sheetRegistros = XLSX.utils.json_to_sheet(rows1, {header: headers1});
    sheetRegistros['!cols'] = headers1.map(h => ({wch: Math.max(h.length, 15)}));

    // -----------------------------------
    // HOJA 2 → RESUMEN POR USUARIO
    // -----------------------------------
    this.generateSummaryByUser();

    const headers2 = ['Nombre', 'Día', 'Tiempo total'];

    const rows2 = this.summary.map(s => ({
      Nombre: s.nombre,
      Día: s.dia,
      "Tiempo total": s.tiempo
    }));

    const sheetResumen = XLSX.utils.json_to_sheet(rows2, {header: headers2});
    sheetResumen['!cols'] = headers2.map(h => ({wch: Math.max(h.length, 15)}));

    // -----------------------------------
    // CREAR WORKBOOK CON DOS HOJAS
    // -----------------------------------
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, sheetRegistros, 'Registros');
    XLSX.utils.book_append_sheet(workbook, sheetResumen, 'Resumen por usuario');

    // Exportar archivo real Excel
    const excelBuffer = XLSX.write(workbook, {bookType: 'xlsx', type: 'array'});

    const fileName = this.proyecto + `_${this.lastFileName || 'export'}.xlsx`;
    const blob = new Blob(
      [excelBuffer],
      {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
    );

    saveAs(blob, fileName);
  }

  generateSummaryByUser() {
    const summaryMap = new Map<string, { nombre: string, dia: string, tiempo: number }>();

    this.parsed.forEach(item => {
      const key = `${item.nombre}-${item.fecha}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          nombre: item.nombre,
          dia: item.fecha,
          tiempo: 0
        });
      }

      summaryMap.get(key)!.tiempo += Number(item.horas);
    });

    this.summary = Array.from(summaryMap.values());
  }


}
