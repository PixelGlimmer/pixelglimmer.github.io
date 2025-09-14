import os
from collections import defaultdict
import platform
import shutil
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

class DiskCleanerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Disk Cleaner and Space Analyzer")
        self.root.geometry("800x600")
        
        # Стиль
        self.style = ttk.Style()
        self.style.configure('TFrame', background='#f0f0f0')
        self.style.configure('TLabel', background='#f0f0f0', font=('Arial', 10))
        self.style.configure('TButton', font=('Arial', 10))
        self.style.configure('Header.TLabel', font=('Arial', 12, 'bold'))
        
        self.create_widgets()
    
    def create_widgets(self):
        # Основные фреймы
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Фрейм выбора диска
        disk_frame = ttk.Frame(main_frame)
        disk_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(disk_frame, text="Выберите диск или папку:", style='Header.TLabel').pack(side=tk.LEFT)
        
        self.disk_var = tk.StringVar()
        self.disk_combobox = ttk.Combobox(disk_frame, textvariable=self.disk_var, state='readonly')
        self.disk_combobox.pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        
        browse_btn = ttk.Button(disk_frame, text="Обзор...", command=self.browse_folder)
        browse_btn.pack(side=tk.LEFT)
        
        # Фрейм информации о диске
        info_frame = ttk.Frame(main_frame)
        info_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.disk_info_label = ttk.Label(info_frame, text="Выберите диск для анализа")
        self.disk_info_label.pack(fill=tk.X)
        
        # Фрейм анализа
        analysis_frame = ttk.Frame(main_frame)
        analysis_frame.pack(fill=tk.BOTH, expand=True)
        
        # Таблица с результатами
        self.tree = ttk.Treeview(analysis_frame, columns=('size', 'percent'), selectmode='browse')
        self.tree.heading('#0', text='Файл/Папка', anchor=tk.W)
        self.tree.heading('size', text='Размер', anchor=tk.W)
        self.tree.heading('percent', text='% от общего', anchor=tk.W)
        
        self.tree.column('#0', stretch=tk.YES, minwidth=200, width=400)
        self.tree.column('size', stretch=tk.YES, minwidth=100, width=150)
        self.tree.column('percent', stretch=tk.YES, minwidth=100, width=150)
        
        scrollbar = ttk.Scrollbar(analysis_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Кнопки действий
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(10, 0))
        
        analyze_btn = ttk.Button(button_frame, text="Анализировать", command=self.analyze_disk)
        analyze_btn.pack(side=tk.LEFT, padx=5)
        
        delete_btn = ttk.Button(button_frame, text="Удалить выбранное", command=self.delete_selected)
        delete_btn.pack(side=tk.LEFT, padx=5)
        
        # Инициализация списка дисков
        self.populate_drives()
    
    def populate_drives(self):
        """Заполняет список доступных дисков"""
        if platform.system() == 'Windows':
            drives = ['%s:\\' % d for d in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' if os.path.exists('%s:' % d)]
        else:
            drives = ['/']  # Для Linux/Unix начинаем с корня
            
        self.disk_combobox['values'] = drives
        if drives:
            self.disk_var.set(drives[0])
    
    def browse_folder(self):
        """Открывает диалог выбора папки"""
        folder = filedialog.askdirectory()
        if folder:
            self.disk_var.set(folder)
    
    def analyze_disk(self):
        """Анализирует выбранный диск или папку"""
        path = self.disk_var.get()
        if not path:
            messagebox.showerror("Ошибка", "Пожалуйста, выберите диск или папку")
            return
        
        if not os.path.exists(path):
            messagebox.showerror("Ошибка", "Указанный путь не существует")
            return
        
        # Очищаем дерево
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Получаем информацию о диске
        if platform.system() == 'Windows' and len(path) == 3 and path[1:3] == ':\\':
            total, used, free = shutil.disk_usage(path)
            disk_info = f"Диск {path} | Всего: {self.format_size(total)} | Использовано: {self.format_size(used)} ({used/total*100:.1f}%) | Свободно: {self.format_size(free)}"
        else:
            total = self.get_folder_size(path)
            disk_info = f"Папка: {path} | Общий размер: {self.format_size(total)}"
        
        self.disk_info_label.config(text=disk_info)
        
        # Анализируем содержимое
        try:
            if os.path.isfile(path):
                self.tree.insert('', 'end', text=path, values=(self.format_size(os.path.getsize(path)), '100%'))
            else:
                items = []
                for item in os.listdir(path):
                    item_path = os.path.join(path, item)
                    try:
                        if os.path.islink(item_path):
                            continue
                        if os.path.isfile(item_path):
                            size = os.path.getsize(item_path)
                        else:
                            size = self.get_folder_size(item_path)
                        
                        percent = size / total * 100 if total > 0 else 0
                        items.append((item_path, size, percent))
                    except (PermissionError, OSError) as e:
                        continue
                
                # Сортируем по размеру (по убыванию)
                items.sort(key=lambda x: x[1], reverse=True)
                
                # Добавляем в дерево
                for item_path, size, percent in items:
                    name = os.path.basename(item_path)
                    self.tree.insert('', 'end', text=name, values=(
                        self.format_size(size),
                        f"{percent:.1f}%"
                    ), tags=('file' if os.path.isfile(item_path) else 'folder'))
                    self.tree.tag_configure('file', foreground='blue')
                    self.tree.tag_configure('folder', foreground='green')
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось проанализировать содержимое: {str(e)}")
    
    def get_folder_size(self, path):
        """Рекурсивно вычисляет размер папки"""
        total = 0
        for entry in os.scandir(path):
            try:
                if entry.is_symlink():
                    continue
                if entry.is_file():
                    total += entry.stat().st_size
                elif entry.is_dir():
                    total += self.get_folder_size(entry.path)
            except (PermissionError, OSError):
                continue
        return total
    
    def format_size(self, size):
        """Форматирует размер в удобочитаемый вид"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} PB"
    
    def delete_selected(self):
        """Удаляет выбранный файл или папку"""
        selected_item = self.tree.selection()
        if not selected_item:
            messagebox.showwarning("Предупреждение", "Пожалуйста, выберите файл или папку для удаления")
            return
        
        item_text = self.tree.item(selected_item, 'text')
        full_path = os.path.join(self.disk_var.get(), item_text)
        
        if not os.path.exists(full_path):
            messagebox.showerror("Ошибка", "Выбранный файл/папка больше не существует")
            return
        
        confirm = messagebox.askyesno("Подтверждение", 
                                    f"Вы уверены, что хотите удалить '{item_text}'?\nЭто действие нельзя отменить.", 
                                    icon='warning')
        if confirm:
            try:
                if os.path.isfile(full_path):
                    os.remove(full_path)
                else:
                    shutil.rmtree(full_path)
                self.tree.delete(selected_item)
                messagebox.showinfo("Успех", "Удаление выполнено успешно")
                # Обновляем анализ после удаления
                self.analyze_disk()
            except Exception as e:
                messagebox.showerror("Ошибка", f"Не удалось удалить: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = DiskCleanerApp(root)
    root.mainloop()