import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  templateUrl: './splash.component.html',
  styleUrl: './splash.component.scss',
})
export class SplashComponent implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);

  ngOnInit() {
    if (this.auth.getRefreshToken()) {
      this.auth.refreshToken().subscribe({
        next: () => this.router.navigate(['/']),
        error: () => this.router.navigate(['/login'])
      });
    } else {
      setTimeout(() => this.router.navigate(['/login']), 1000);
    }
  }
}
