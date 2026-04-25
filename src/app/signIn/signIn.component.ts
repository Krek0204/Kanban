import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-sign-in', // Изменил селектор для ясности
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './signIn.component.html',
  styleUrl: './signIn.component.css'
})
export class SignInComponent {
  signInForm = new FormGroup({
    login: new FormControl("", [Validators.required]),
    password: new FormControl("", [Validators.required])
  });

  authService: Auth = inject(Auth);
  isLoading = false;
  errorMessage = '';

  constructor(private router: Router) {}

  navigateToSignUpPage() {
    this.router.navigate(['signUp']);
  }

  //Берём данную функцию для оценки
  signInApplication() {
    if (this.signInForm.invalid) {
      // Помечаем все поля как touched для отображения ошибок
      this.signInForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { login, password } = this.signInForm.value;

    this.authService.signInApplication(login ?? '', password ?? '').subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['home']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.status === 401
          ? 'Неверный логин или пароль'
          : 'Произошла ошибка. Попробуйте позже';
      }
    });
  }
}
