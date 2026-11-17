import { Component, ElementRef, Input, OnChanges, OnDestroy, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface Item { raw: any; value: any; label: string; detail: string; search: string; disabled: boolean; }

const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Selector con búsqueda: al escribir ("amox") filtra al instante las opciones que coinciden
 * (sin importar mayúsculas ni tildes, y por nombre, principio activo, laboratorio, etc.).
 * Si no se escribe nada, la lista completa sigue disponible con scroll, como un select normal.
 * Se usa con [(ngModel)] igual que un <select>.
 */
@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelectComponent), multi: true }],
  styles: [`
    :host { display: block; position: relative; margin-top: 7px; }
    .ss { position: relative; }
    .ss input { display: block; width: 100%; margin: 0; padding: 10px 56px 10px 10px; background: var(--panel2, #091521); border: 1px solid var(--line, #1d3042); border-radius: 8px; color: var(--text, #d8e4eb); outline: 0; font: inherit; font-size: 13px; text-overflow: ellipsis; }
    .ss input:focus { border-color: var(--cyan, #328eb1); }
    .ss input:disabled { opacity: .5; cursor: not-allowed; }
    .ss input::placeholder { color: var(--muted, #7f94a7); }
    .ss-clear { position: absolute; right: 26px; top: 50%; transform: translateY(-50%); border: 0; background: none; color: var(--muted, #7f94a7); font-size: 17px; line-height: 1; padding: 2px 5px; border-radius: 6px; }
    .ss-clear:hover { color: var(--text, #fff); }
    .ss-caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--muted, #7f94a7); font-size: 11px; pointer-events: none; }
    .ss-list { position: fixed; z-index: 9999; margin: 0; padding: 4px; list-style: none; overflow-y: auto; background: var(--panel, #0d1825); border: 1px solid var(--line, #284055); border-radius: 10px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
    .ss-list li { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 8px 10px; border-radius: 7px; cursor: pointer; color: var(--text, #d8e4eb); font-size: 12px; font-weight: 600; }
    .ss-list li.active { background: color-mix(in srgb, var(--cyan, #3dd7c4) 16%, transparent); }
    .ss-list li.selected .ss-label::before { content: '✓ '; color: var(--cyan, #3dd7c4); }
    .ss-list li.disabled { opacity: .45; cursor: not-allowed; }
    .ss-list li.empty-opt { color: var(--muted, #7f94a7); font-weight: 500; }
    .ss-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .ss-label mark { background: none; color: var(--cyan, #3dd7c4); font-weight: 800; }
    .ss-detail { color: var(--muted, #7f94a7); font-size: 10px; font-weight: 500; white-space: nowrap; }
    .ss-none { padding: 12px; text-align: center; color: var(--muted, #7f94a7); font-size: 11px; cursor: default !important; justify-content: center !important; }
    .ss-count { padding: 6px 10px 4px; color: var(--muted, #7f94a7); font-size: 9px; letter-spacing: .08em; cursor: default !important; }
  `],
  template: `
    <div class="ss">
      <input #inp type="text" autocomplete="off" spellcheck="false" role="combobox"
        [attr.aria-expanded]="open" [placeholder]="placeholder" [disabled]="disabled"
        [value]="open ? query : selectedLabel"
        (focus)="openList()" (click)="openList()" (input)="onInput($any($event.target).value)"
        (keydown)="onKey($event)" (blur)="onBlur()">
      <button type="button" class="ss-clear" *ngIf="!disabled && hasValue" tabindex="-1" aria-label="Quitar selección"
        (mousedown)="$event.preventDefault()" (click)="clear()">×</button>
      <span class="ss-caret">▾</span>
      <ul class="ss-list" role="listbox" *ngIf="open" [style.top.px]="pos.top" [style.bottom.px]="pos.bottom"
        [style.left.px]="pos.left" [style.width.px]="pos.width" [style.max-height.px]="pos.maxHeight"
        (mousedown)="$event.preventDefault()">
        <li class="ss-count" *ngIf="typed && filtered.length">{{filtered.length}} {{filtered.length===1?'COINCIDENCIA':'COINCIDENCIAS'}}</li>
        <li class="empty-opt" *ngIf="emptyLabel && !typed" [class.active]="active===-1" (mouseenter)="active=-1" (click)="clear()">{{emptyLabel}}</li>
        <li *ngFor="let it of filtered; let i = index" role="option" [class.active]="i===active" [class.selected]="isSelected(it)"
          [class.disabled]="it.disabled" (mouseenter)="active=i" (click)="pick(it)">
          <span class="ss-label" [innerHTML]="highlight(it.label)"></span>
          <span class="ss-detail" *ngIf="it.detail">{{it.detail}}</span>
        </li>
        <li class="ss-none" *ngIf="!filtered.length">Sin resultados para «{{query}}»</li>
      </ul>
    </div>
  `
})
export class SearchSelectComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() placeholder = 'Escribe para buscar…';
  @Input() valueKey = 'id';
  @Input() labelKey = 'nombre_comercial';
  /** Texto principal de cada opción (por defecto, labelKey). */
  @Input() labelFn?: (o: any) => string;
  /** Texto secundario a la derecha (precio, stock, etc.). */
  @Input() detailFn?: (o: any) => string;
  /** Campos extra donde también se busca (principio_activo, laboratorio…). */
  @Input() searchKeys: string[] = [];
  @Input() disabledFn?: (o: any) => boolean;
  /** Valor que representa "sin selección" (0, null o ''). */
  @Input() emptyValue: any = null;
  /** Si se define, aparece como primera opción (ej. "Todos"). */
  @Input() emptyLabel = '';
  @Input() set options(v: any[] | null | undefined) { this._options = v || []; this.build(); }

  private _options: any[] = [];
  items: Item[] = [];
  value: any = null;
  disabled = false;
  open = false;
  query = '';
  typed = false;
  active = 0;
  pos: { top: number | null; bottom: number | null; left: number; width: number; maxHeight: number } = { top: 0, bottom: null, left: 0, width: 0, maxHeight: 260 };

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};
  private scrollHandler = (e: Event) => {
    if ((e.target as HTMLElement)?.closest?.('.ss-list')) return;
    this.place();
  };

  ngOnChanges() { this.build(); }

  private build() {
    this.items = this._options.map(o => {
      const label = this.labelFn ? this.labelFn(o) : String(o?.[this.labelKey] ?? '');
      const extra = this.searchKeys.map(k => o?.[k]).join(' ');
      return { raw: o, value: o?.[this.valueKey], label, detail: this.detailFn ? this.detailFn(o) : '', search: norm(label + ' ' + extra), disabled: this.disabledFn ? this.disabledFn(o) : false };
    });
  }

  get hasValue() { return this.value !== null && this.value !== undefined && this.value !== '' && String(this.value) !== String(this.emptyValue); }
  get selectedItem() { return this.hasValue ? this.items.find(i => String(i.value) === String(this.value)) : undefined; }
  get selectedLabel() { return this.selectedItem?.label ?? ''; }
  isSelected(it: Item) { return this.hasValue && String(it.value) === String(this.value); }

  get filtered(): Item[] {
    const tokens = norm(this.query).split(/\s+/).filter(Boolean);
    if (!this.typed || !tokens.length) return this.items;
    const rank = (it: Item) => { const l = norm(it.label); return l.startsWith(tokens[0]) ? 0 : l.includes(tokens[0]) ? 1 : 2; };
    return this.items.filter(it => tokens.every(t => it.search.includes(t))).sort((a, b) => rank(a) - rank(b));
  }

  highlight(label: string) {
    const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
    const tokens = norm(this.query).split(/\s+/).filter(Boolean);
    if (!this.typed || !tokens.length) return esc(label);
    // norm() puede cambiar la longitud con ciertos caracteres; solo resaltamos si coincide 1:1.
    const n = norm(label);
    if (n.length !== label.length) return esc(label);
    const mark = new Array(label.length).fill(false);
    for (const t of tokens) { let i = n.indexOf(t); while (i !== -1) { for (let k = i; k < i + t.length; k++) mark[k] = true; i = n.indexOf(t, i + t.length); } }
    let out = '', inMark = false;
    for (let i = 0; i < label.length; i++) {
      if (mark[i] && !inMark) { out += '<mark>'; inMark = true; }
      if (!mark[i] && inMark) { out += '</mark>'; inMark = false; }
      out += esc(label[i]);
    }
    return out + (inMark ? '</mark>' : '');
  }

  openList() {
    if (this.disabled || this.open) return;
    this.open = true; this.typed = false; this.query = this.selectedLabel;
    const idx = this.items.findIndex(i => this.isSelected(i));
    this.active = idx >= 0 ? idx : 0;
    this.place();
    document.addEventListener('scroll', this.scrollHandler, true);
    window.addEventListener('resize', this.scrollHandler);
    setTimeout(() => {
      const input = this.host.nativeElement.querySelector('input'); input?.select();
      this.host.nativeElement.querySelector('li.selected')?.scrollIntoView({ block: 'nearest' });
    });
  }

  private closeList() {
    this.open = false;
    document.removeEventListener('scroll', this.scrollHandler, true);
    window.removeEventListener('resize', this.scrollHandler);
  }

  /** Posiciona la lista con position:fixed para que no la recorten modales ni paneles con overflow. */
  private place() {
    const r = this.host.nativeElement.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
    const up = below < 200 && above > below;
    this.pos = up
      ? { top: null, bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width, maxHeight: Math.min(280, above) }
      : { top: r.bottom + 4, bottom: null, left: r.left, width: r.width, maxHeight: Math.min(280, below) };
  }

  onInput(v: string) { this.query = v; this.typed = true; this.active = 0; if (!this.open) this.openList(); }

  onKey(e: KeyboardEvent) {
    if (!this.open) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); this.openList(); } return; }
    const list = this.filtered, last = list.length - 1, min = this.emptyLabel && !this.typed ? -1 : 0;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.active = Math.min(last, this.active + 1); this.scrollActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.active = Math.max(min, this.active - 1); this.scrollActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (this.active === -1) this.clear(); else if (list[this.active]) this.pick(list[this.active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.closeList(); }
    else if (e.key === 'Tab') { this.closeList(); }
  }

  private scrollActive() {
    setTimeout(() => this.host.nativeElement.querySelector('li.active')?.scrollIntoView({ block: 'nearest' }));
  }

  pick(it: Item) {
    if (it.disabled) return;
    this.value = it.value; this.onChange(it.value); this.closeList();
    (this.host.nativeElement.querySelector('input') as HTMLInputElement)?.blur();
  }

  clear() {
    this.value = this.emptyValue; this.onChange(this.emptyValue); this.query = ''; this.typed = false;
    if (this.open) this.closeList();
  }

  onBlur() { this.closeList(); this.onTouched(); }

  writeValue(v: any) { this.value = v; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
  ngOnDestroy() { this.closeList(); }
}
