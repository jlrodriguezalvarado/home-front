import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-commerce-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './commerce-list.component.html',
  styleUrl: './commerce-list.component.scss',
})
export class CommerceListComponent {
  i18n = inject(I18nService);
}
