import { Injectable } from '@angular/core';

@Injectable()
export class ContextMenuService {

    public menuItems = [];
    public showContextMenu
    public hideContextMenu;

    constructor(
    ) {
    }

    public show(event, menuItems) {
        this.menuItems = menuItems;
        this.showContextMenu(event)
    }

    public hide() {
        this.menuItems = [];
        this.hideContextMenu()
    }

}


