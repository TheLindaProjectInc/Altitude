
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { ContextMenuService } from './components/context-menu/context-menu.service';
import { TextinputComponent } from './components/textinput/textinput.component';
import { TextareaComponent } from './components/textarea/textarea.component';
import { AppBarComponent } from './components/app-bar/app-bar.component';
import { LoaderComponent } from './components/loader/loader.component';
import { TitlebarComponent } from './components/titlebar/titlebar.component';
import { PromptComponent } from './components/prompt/prompt.component';
import { PromptService } from './components/prompt/prompt.service';
import { NetworkTypeComponent } from './components/network-type/network-type.component';

export const componentDeclarations = [
    LoaderComponent,
    AppBarComponent,
    ContextMenuComponent,
    TextinputComponent,
    TextareaComponent,
    TitlebarComponent,
    PromptComponent,
    NetworkTypeComponent
]

export const componentProviders = [
    ContextMenuService,
    PromptService
]

