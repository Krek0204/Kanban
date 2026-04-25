import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Desk } from "../home/board/desk/desk"
import { Task } from "../home/board/desk/task/task"
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from "rxjs/operators";
import { Auth } from '../services/auth'; // Добавляем импорт Auth

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private baseUrl = 'http://localhost:3000/api';
  private http = inject(HttpClient);
  private authService = inject(Auth); // Добавляем Auth сервис

  private desksSignal = signal<Desk[]>([]);
  readonly desks = this.desksSignal.asReadonly();

  // Вычисляемая статистика
  readonly taskStats = computed(() => {
    const desks = this.desksSignal();

    console.log('Recalculating stats, desks count:', desks.length);

    if (desks.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        completionPercentage: 0,
        byDesk: []
      };
    }

    let totalTasks = 0;
    let completedTasks = 0;
    const byDesk = [];

    for (const desk of desks) {
      const deskTotal = desk.tasksList.length;
      const deskCompleted = desk.tasksList.filter(task => task.isCompleted).length;

      totalTasks += deskTotal;
      completedTasks += deskCompleted;

      byDesk.push({
        deskId: desk.id,
        deskName: desk.name,
        total: deskTotal,
        completed: deskCompleted,
        percentage: deskTotal > 0 ? Math.round((deskCompleted / deskTotal) * 100) : 0
      });
    }

    const completionPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return {
      totalTasks,
      completedTasks,
      completionPercentage,
      byDesk
    };
  });

  constructor() {
    console.log('BoardService initialized');
    console.log('Auth state:', this.authService.isAuthenticated());

    effect(() => {
      const stats = this.taskStats();
      console.log('Stats updated:', stats);
    });
  }

  private handleError(error: HttpErrorResponse) {
    console.error('BoardService error:', error);

    if (error.status === 401) {
      console.error('Unauthorized - token might be invalid or expired');
      // Можно добавить автоматический логаут или редирект
      this.authService.logout();
    }

    return throwError(() => new Error(error.message || 'Server error'));
  }

  
  getDesksList(): Observable<Desk[]> {
    console.log('Fetching desks from:', `${this.baseUrl}/desks`);
    console.log('Auth token available:', !!this.authService.getToken());

    return this.http.get<Desk[]>(`${this.baseUrl}/desks`).pipe(
      map((desksList: Desk[]) => {
        console.log('Desks received from server:', desksList);
        this.desksSignal.set(desksList);
        return desksList;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Методы для досок
  createDesk(name: string): Observable<Desk> {
    console.log('Creating desk with name:', name);

    return this.http.post<Desk>(`${this.baseUrl}/desks`, { name }).pipe(
      tap(newDesk => {
        console.log('Desk created successfully:', newDesk);
        this.desksSignal.update(desks => [...desks, newDesk]);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  updateDesk(id: number, updates: Partial<Desk>): Observable<Desk> {
    return this.http.put<Desk>(`${this.baseUrl}/desks/${id}`, updates).pipe(
      tap(updatedDesk => {
        console.log('Desk updated:', updatedDesk);
        this.desksSignal.update(desks =>
          desks.map(desk => desk.id === id ? updatedDesk : desk)
        );
      }),
      catchError(this.handleError.bind(this))
    );
  }

  deleteDesk(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/desks/${id}`).pipe(
      tap(() => {
        console.log('Desk deleted:', id);
        this.desksSignal.update(desks => desks.filter(desk => desk.id !== id));
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Остальные методы остаются без изменений
  addTask(deskId: number, task: { name: string; description: string }): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/tasks/desk/${deskId}`, task).pipe(
      tap(newTask => {
        console.log('Task added:', newTask);
        this.updateDeskWithNewTask(deskId, newTask);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  updateTask(deskId: number, taskId: number, updates: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/tasks/desk/${deskId}/${taskId}`, updates).pipe(
      tap(updatedTask => {
        console.log('Task updated:', updatedTask);
        this.updateDeskWithUpdatedTask(deskId, updatedTask);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  deleteTask(deskId: number, taskId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tasks/desk/${deskId}/${taskId}`).pipe(
      tap(() => {
        console.log('Task deleted:', taskId);
        this.updateDeskWithRemovedTask(deskId, taskId);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Вспомогательные методы для обновления состояния
  private updateDeskWithNewTask(deskId: number, newTask: Task): void {
    this.desksSignal.update(desks =>
      desks.map(desk => {
        if (desk.id === deskId) {
          return {
            ...desk,
            tasksList: [...desk.tasksList, newTask]
          };
        }
        return desk;
      })
    );
  }

  private updateDeskWithUpdatedTask(deskId: number, updatedTask: Task): void {
    this.desksSignal.update(desks =>
      desks.map(desk => {
        if (desk.id === deskId) {
          return {
            ...desk,
            tasksList: desk.tasksList.map(task =>
              task.id === updatedTask.id ? updatedTask : task
            )
          };
        }
        return desk;
      })
    );
  }

  private updateDeskWithRemovedTask(deskId: number, taskId: number): void {
    this.desksSignal.update(desks =>
      desks.map(desk => {
        if (desk.id === deskId) {
          return {
            ...desk,
            tasksList: desk.tasksList.filter(task => task.id !== taskId)
          };
        }
        return desk;
      })
    );
  }
}
