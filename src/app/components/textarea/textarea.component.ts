import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ElectronService } from '../../providers/electron.service';
import { ContextMenuService } from '../context-menu/context-menu.service';


@Component({
  selector: 'text-area',
  template: `<textarea 
  placeholder="{{placeholder}}" 
  (contextmenu)="onRightClick($event)"
  [(ngModel)]="inputModel"
  (ngModelChange)="inputModelChange.emit(inputModel)"
  [disabled]="disabled"
  ></textarea>`,
})
export class TextareaComponent {

  @Input() placeholder: string;
  @Input() inputModel: string;
  @Input() disabled: boolean;

  @Output() inputModelChange = new EventEmitter<string>();

  constructor(
    private electron: ElectronService,
    private contextMenu: ContextMenuService
  ) {

  }

  onRightClick(e) {
    e.target.select();
    const items = [
      {
        name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUCUT',
        func: () => {
          this.electron.clipboard.writeText(this.inputModel);
          this.inputModel = '';
          this.inputModelChange.emit(this.inputModel);
          e.target.focus();
        }
      },
      {
        name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUCOPY',
        func: () => {
          this.electron.clipboard.writeText(this.inputModel);
          this.inputModelChange.emit(this.inputModel);
          e.target.focus();
        }
      },
      {
        name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUPASTE',
        func: () => {
          this.inputModel = this.electron.clipboard.readText();
          this.inputModelChange.emit(this.inputModel);
          e.target.focus();
        }
      }
    ]
    this.contextMenu.show(e, items);
  }


}
