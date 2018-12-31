
import { PromptComponent } from './components/prompt/prompt.component';
import { PromptService } from './components/prompt/prompt.service';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { ContextMenuService } from './components/context-menu/context-menu.service';
import { TitlebarComponent } from './components/titlebar/titlebar.component';
import { ClientStatusComponent } from './components/client-status/client-status.component';
import { AddressBookComponent } from './components/address-book/address-book.component';
import { AddressBookService } from './components/address-book/address-book.service';
import { SyncStatusComponent } from './components/sync-status/sync-status.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';

export const componentDeclarations = [
    PromptComponent,
    TitlebarComponent,
    ClientStatusComponent,
    AddressBookComponent,
    ContextMenuComponent,
    SyncStatusComponent,
    SideBarComponent
]

export const componentProviders = [
    PromptService,
    AddressBookService,
    ContextMenuService
]

