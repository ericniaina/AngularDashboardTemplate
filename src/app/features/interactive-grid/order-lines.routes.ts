import type { Routes } from '@angular/router';
import { OrderLinesPageComponent } from './order-lines-page.component';
import { unsavedChangesGuard } from './unsaved-changes.guard';

export const ORDER_LINES_ROUTES: Routes = [
  { path: '', component: OrderLinesPageComponent, canDeactivate: [unsavedChangesGuard] },
];
