import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { ContextMenuService } from 'app/components/context-menu/context-menu.service';


@Component({
  selector: 'text-input',
  template: `<input type="text" 
  placeholder="{{placeholder}}" 
  [(ngModel)]="inputModel" 
  (ngModelChange)="inputModelChange.emit(inputModel)"
  (contextmenu)="onRightClick($event)"
  (change)="change.emit($event)"
  (input)="input.emit($event)"
  (keydown.ArrowDown)="keydownArrowDown.emit($event)"
  (keydown.ArrowUp)="keydownArrowUp.emit($event)"
  [disabled]="disabled"
  type="{{type || 'text'}}"
  />`,
})
export class TextinputComponent {

  @Input() name: string;
  @Input() placeholder: string;
  @Input() inputModel: string;
  @Input() disabled: boolean;
  @Input() type: boolean;

  @Output() inputModelChange = new EventEmitter<string>();
  @Output() change = new EventEmitter<Function>();
  @Output() input = new EventEmitter<Function>();
  @Output() keydownArrowDown = new EventEmitter<Function>();
  @Output() keydownArrowUp = new EventEmitter<Function>();

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
