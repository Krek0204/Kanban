import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { TaskComponent } from './task/task.component';
import { Task } from "./task/task"
import { Desk } from "./desk";
import { BoardService } from '../../../services/board-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: "desk",
  templateUrl: "./desk.component.html",
  styleUrls: ['./desk.component.css'],
  standalone: true,
  imports: [TaskComponent, CommonModule, FormsModule],
})
export class deskComponent {
  @Input() desk!: Desk;
  @Output() deskDeleted = new EventEmitter<void>();
  @Output() deskUpdated = new EventEmitter<void>();

  boardService: BoardService = inject(BoardService);

  isEditing = false;
  editedName = '';
  isAddingTask = false;
  newTask = {
    name: '',
    description: ''
  };

  startEditing() {
    this.isEditing = true;
    this.editedName = this.desk.name;
  }

  saveEdit() {
    if (this.editedName.trim()) {
      this.boardService.updateDesk(this.desk.id, { name: this.editedName.trim() }).subscribe({
        next: () => {
          this.isEditing = false;
          this.deskUpdated.emit();
        },
        error: (error) => {
          console.error('Error updating desk:', error);
        }
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.editedName = '';
  }

  //Берём данную функцию для оценки
  deleteDesk() {
    if (confirm('Вы уверены, что хотите удалить эту доску? Все задачи также будут удалены.')) {
      this.boardService.deleteDesk(this.desk.id).subscribe({
        next: () => {
          this.deskDeleted.emit();
        },
        error: (error) => {
          console.error('Error deleting desk:', error);
        }
      });
    }
  }

  startAddingTask() {
    this.isAddingTask = true;
    this.newTask = { name: '', description: '' };
  }

  addTask() {
    if (this.newTask.name.trim()) {
      this.boardService.addTask(this.desk.id, {
        name: this.newTask.name.trim(),
        description: this.newTask.description.trim()
      }).subscribe({
        next: (newTask) => {
          // State will be updated automatically via BoardService
          this.isAddingTask = false;
          this.newTask = { name: '', description: '' };
        },
        error: (error) => {
          console.error('Error adding task:', error);
        }
      });
    }
  }

  //Берём данную функцию для оценки 
  onTaskUpdated(updatedTask: Task): void {
    // Обновляем задачу в локальном списке
    const index = this.desk.tasksList.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      this.desk.tasksList[index] = updatedTask;
    }
    // Можно также вызвать обновление на сервере через сервис
    this.deskUpdated.emit();
  }

  onTaskDeleted(taskId: number): void {
    // Удаляем задачу из локального списка
    this.desk.tasksList = this.desk.tasksList.filter(t => t.id !== taskId);
    this.deskUpdated.emit();
  }

  cancelAddingTask() {
    this.isAddingTask = false;
    this.newTask = { name: '', description: '' };
  }
}
