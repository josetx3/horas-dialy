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
    const headers = ['Nombre', 'Fecha', 'Cliente', 'Proyecto', 'Tipo', 'Codigo', 'Actividad', 'Total horas'];
    // Construimos filas como objetos, no como strings → Excel los interpreta como celdas reales
    const rows = this.parsed.map(p => ({
      Nombre: p.nombre,
      Fecha: p.fecha,
      Cliente: p.cliente,
      Proyecto: p.proyecto,
      Tipo: p.tipo,
      Codigo: p.codigo,
      Actividad: p.actividad,
      "Total horas": p.horas
    }));

    // Crear la hoja
    const worksheet = XLSX.utils.json_to_sheet(rows, {header: headers});

    // Ajusta automáticamente el ancho de las columnas
    const colWidths = headers.map(h => ({wch: Math.max(h.length, 15)}));
    worksheet['!cols'] = colWidths;

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');

    // Exportar como archivo .xlsx real
    const excelBuffer = XLSX.write(workbook, {bookType: 'xlsx', type: 'array'});

    const fileName = `parsed_${this.lastFileName || 'export'}.xlsx`;
    const blob = new Blob([excelBuffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});

    saveAs(blob, fileName);
  }

  csvSafe(value: string) {
    if (!value) return '';
    return `"${value.replace(/"/g, '""')}"`;
  }


}
