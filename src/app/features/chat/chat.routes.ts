import { Routes } from '@angular/router';

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./conversation-list/conversation-list.component').then(m => m.ConversationListComponent),
  },
  {
    path: 'conversations/:id',
    loadComponent: () => import('./conversation-room/conversation-room.component').then(m => m.ConversationRoomComponent),
  },
];
