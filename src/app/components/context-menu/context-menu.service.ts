import { Injectable } from '@angular/core';

export interface ContextMenuItem {
    name: string;
    func: () => void;
}

@Injectable()
export class ContextMenuService {

    public menuItems: ContextMenuItem[] = [];
    public showContextMenu
    public hideContextMenu;

    constructor(
    ) {
    }

    public show(event, menuItems: ContextMenuItem[]) {
        this.menuItems = menuItems;
        this.showContextMenu(event)
    }

    public hide() {
        this.menuItems = [];
        this.hideContextMenu()
    }

}


