import { Component, ViewChild, ElementRef } from '@angular/core';
import { ContextMenuService } from './context-menu.service';

@Component({
  selector: 'context-menu',
  templateUrl: './context-menu.component.html',
  host: {
    '(document:click)': 'documentClick($event)',
  },
})
export class ContextMenuComponent {

  @ViewChild('contextMenu', { static: false }) contextMenu: ElementRef;

  menuActive = false;
  position = { left: '0px', top: '0px' };
  menuItems = [];

  constructor(
    public contextMenuService: ContextMenuService
  ) {
    contextMenuService.showContextMenu = (event) => {
      this.menuActive = true;
      let left = event.x
      if (left + 200 > window.innerWidth) left = window.innerWidth - 200;
      let top = event.y ;
      if (top + 200 > window.innerHeight) top = window.innerHeight - 200;
      this.position.left = left + "px";
      this.position.top = top + "px";
    }
    contextMenuService.hideContextMenu = () => {
      this.menuActive = false;
    }
  }

  documentClick(event) {
    this.menuActive = false
  }

}
