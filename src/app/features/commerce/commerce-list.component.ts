import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-commerce-list',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-8"><h1 class="text-3xl font-bold">Commerces</h1><p class="text-gray-500 mt-4">Coming soon...</p></div>`
})
export class CommerceListComponent {}
