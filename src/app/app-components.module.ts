
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { ContextMenuService } from './components/context-menu/context-menu.service';
import { TextinputComponent } from './components/textinput/textinput.component';
import { TextareaComponent } from './components/textarea/textarea.component';
import { AppBarComponent } from './components/app-bar/app-bar.component';

export const componentDeclarations = [
    AppBarComponent,
    ContextMenuComponent,
    TextinputComponent,
    TextareaComponent,
]

export const componentProviders = [
    ContextMenuService
]

