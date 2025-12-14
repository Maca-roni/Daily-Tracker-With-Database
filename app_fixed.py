from flask import Flask, render_template, request, jsonify, url_for, redirect, flash, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'stardew-farm-secret-key-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost/daily_tracker'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

from datetime import datetime, date, timedelta
# ...existing code...

# ===== MOOD model & API (replace existing/misplaced mood sections) =====
class Mood(db.Model):
    __tablename__ = 'mood'
    mood_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, nullable=False, default=1)
    mood = db.Column(db.String(100), nullable=False)
    energy_level = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    log_date = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'mood_id': self.mood_id,
            'user_id': self.user_id,
            'mood': self.mood,
            'energy_level': self.energy_level,
            'notes': self.notes,
            'log_date': self.log_date.isoformat() if self.log_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

@app.route('/api/mood', methods=['GET', 'POST'])
def api_mood():
    user_id = session.get('user_id', 1)
    if request.method == 'GET':
        qdate = request.args.get('date')
        try:
            if qdate:
                d = datetime.strptime(qdate, '%Y-%m-%d').date()
                entries = Mood.query.filter_by(user_id=user_id, log_date=d).order_by(Mood.created_at.desc()).all()
                return jsonify({'success': True, 'entries': [e.to_dict() for e in entries]})
            recent = Mood.query.filter_by(user_id=user_id).order_by(Mood.log_date.desc(), Mood.created_at.desc()).limit(50).all()
            return jsonify({'success': True, 'entries': [e.to_dict() for e in recent]})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # POST -> always INSERT (append new row)
    try:
        data = request.get_json() or {}
        raw_mood = data.get('mood')
        if raw_mood is None or raw_mood == '':
            return jsonify({'error': 'mood is required'}), 400

        # parse energy if present
        energy_raw = data.get('energy_level') or data.get('energy')
        energy_level = None
        if energy_raw is not None and energy_raw != '':
            try:
                energy_level = int(energy_raw)
            except:
                try:
                    energy_level = int(float(energy_raw))
                except:
                    energy_level = None

        # accept numeric or string mood; server stores as string
        mood_label = str(raw_mood)

        entry_date = date.today()
        if data.get('log_date'):
            try:
                entry_date = datetime.strptime(data.get('log_date'), '%Y-%m-%d').date()
            except:
                pass

        now = datetime.utcnow()
        entry = Mood(
            user_id=user_id,
            mood=mood_label,
            energy_level=energy_level,
            notes=data.get('notes'),
            log_date=entry_date,
            created_at=now
        )
        db.session.add(entry)
        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/mood/recent', methods=['GET'])
def api_mood_recent():
    try:
        user_id = session.get('user_id', 1)
        limit = int(request.args.get('limit', 7))
        rows = Mood.query.filter_by(user_id=user_id).order_by(Mood.log_date.desc(), Mood.created_at.desc()).limit(limit).all()
        return jsonify({'success': True, 'recent': [r.to_dict() for r in rows]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mood/history', methods=['GET'])
def api_mood_history():
    try:
        user_id = session.get('user_id', 1)
        days = int(request.args.get('days', 30))
        cutoff = date.today() - timedelta(days=days)
        entries = Mood.query.filter(Mood.user_id==user_id, Mood.log_date >= cutoff).order_by(Mood.log_date.desc(), Mood.created_at.desc()).all()
        return jsonify({'success': True, 'entries': [e.to_dict() for e in entries]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mood/streak', methods=['GET'])
def api_mood_streak():
    try:
        user_id = session.get('user_id', 1)
        rows = Mood.query.filter_by(user_id=user_id).all()
        dates_with = set(r.log_date for r in rows if r.log_date)
        streak = 0
        cur = date.today()
        while cur in dates_with:
            streak += 1
            cur = cur - timedelta(days=1)
        return jsonify({'success': True, 'streak': streak})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# ...existing code...

class Habit(db.Model):
    __tablename__ = 'habits'
    
    # MATCH YOUR ACTUAL DATABASE COLUMNS
    habit_id = db.Column('habit_id', db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column('user_id', db.Integer, nullable=False, default=1)
    habit_name = db.Column('habit_name', db.String(100), nullable=False)  # Your actual column
    description = db.Column('description', db.Text)
    
    # Virtual properties for compatibility
    @property
    def name(self):
        """Map habit_name to name for JavaScript"""
        return self.habit_name
    
    @property
    def streak(self):
        """Calculate streak from logs"""
        try:
            logs = HabitLog.query.filter_by(
                habit_id=self.habit_id,
                completed=True
            ).order_by(HabitLog.log_date.desc()).all()
            
            if not logs:
                return 0
            
            streak = 0
            current_date = date.today()
            
            for log in logs:
                if log.log_date == current_date:
                    streak += 1
                    current_date -= timedelta(days=1)
                else:
                    break
            
            return streak
        except:
            return 0
    
    @property 
    def frequency(self):
        return 'daily'
    
    @property
    def is_active(self):
        return True
    
    @property
    def created_at(self):
        return datetime.utcnow()
    
    @property
    def updated_at(self):
        return datetime.utcnow()
    
    def to_dict(self):
        return {
            'habit_id': self.habit_id,
            'user_id': self.user_id,
            'name': self.name,  # Virtual property
            'habit_name': self.habit_name,  # Actual column
            'description': self.description,
            'streak': self.streak,  # Virtual property
            'frequency': self.frequency,  # Virtual property
            'is_active': self.is_active,  # Virtual property
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class HabitLog(db.Model):
    __tablename__ = 'habit_logs'
    
    # MATCH YOUR ACTUAL DATABASE COLUMNS
    habit_log_id = db.Column('habit_log_id', db.Integer, primary_key=True, autoincrement=True)
    habit_id = db.Column('habit_id', db.Integer, nullable=False)
    completed = db.Column('completed', db.Boolean, default=False)
    log_date = db.Column('log_date', db.Date, nullable=False, default=date.today)
    
    # Virtual properties
    @property
    def log_id(self):
        return self.habit_log_id
    
    @property
    def user_id(self):
        return 1
    
    @property
    def notes(self):
        return None
    
    def to_dict(self):
        return {
            'log_id': self.log_id,
            'habit_id': self.habit_id,
            'completed': self.completed,
            'log_date': self.log_date.isoformat() if self.log_date else None
        }
    
class Task(db.Model):
    __tablename__ = 'tasks'
    
    # MATCH YOUR ACTUAL DATABASE COLUMNS
    task_id = db.Column('task_id', db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column('user_id', db.Integer, nullable=False, default=1)
    task_name = db.Column('task_name', db.String(150), nullable=False)
    priority = db.Column('priority', db.String(20), default='Medium')
    due_date = db.Column('due_date', db.Date)
    is_completed = db.Column('is_completed', db.Boolean, default=False)
    
    # Virtual properties for compatibility with JavaScript
    @property
    def name(self):
        """Map task_name to name for JavaScript"""
        return self.task_name
    
    @name.setter
    def name(self, value):
        self.task_name = value
    
    @property
    def date(self):
        """Map due_date to date for JavaScript"""
        return self.due_date
    
    @date.setter
    def date(self, value):
        self.due_date = value
    
    @property
    def completed(self):
        """Map is_completed to completed for JavaScript"""
        return self.is_completed
    
    @completed.setter
    def completed(self, value):
        self.is_completed = value
    
    @property
    def created_at(self):
        """Default created_at for sorting"""
        return datetime.utcnow()
    
    def to_dict(self):
        return {
            'task_id': self.task_id,
            'user_id': self.user_id,
            'name': self.name,
            'task_name': self.task_name,
            'priority': self.priority,
            'date': self.date.isoformat() if self.date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed': self.completed,
            'is_completed': self.is_completed,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


@app.route('/api/habits', methods=['GET'])
def get_habits():
    try:
        user_id = session.get('user_id', 1)
        habits = Habit.query.filter_by(user_id=user_id).all()
        
        habits_data = []
        for habit in habits:
            habit_dict = habit.to_dict()
            
            # Check if completed today
            today = date.today()
            today_log = HabitLog.query.filter_by(
                habit_id=habit.habit_id,
                log_date=today,
                completed=True
            ).first()
            
            habit_dict['completed_today'] = bool(today_log)
            habits_data.append(habit_dict)
        
        return jsonify({
            'success': True,
            'habits': habits_data,
            'count': len(habits_data)
        })
        
    except Exception as e:
        print(f"Error in get_habits: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/habits', methods=['POST'])
def create_habit():
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Habit name is required'}), 400
        
        user_id = session.get('user_id', 1)
        new_habit = Habit(
            user_id=user_id,
            habit_name=data.get('name'),  # Use actual column name
            description=data.get('description', '')
        )
        
        db.session.add(new_habit)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Habit created successfully',
            'habit': new_habit.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in create_habit: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/habits/<int:habit_id>/log', methods=['POST'])
def log_habit(habit_id):
    try:
        today = date.today()
        
        # Check if habit exists
        habit = Habit.query.get(habit_id)
        if not habit:
            return jsonify({'error': 'Habit not found'}), 404
        
        # Check if already logged today
        existing_log = HabitLog.query.filter_by(
            habit_id=habit_id,
            log_date=today
        ).first()
        
        if existing_log:
            # Toggle completion
            existing_log.completed = not existing_log.completed
        else:
            # Create new log
            new_log = HabitLog(
                habit_id=habit_id,
                log_date=today,
                completed=True
            )
            db.session.add(new_log)
        
        db.session.commit()
        
        # Return updated habit
        habit_dict = habit.to_dict()
        habit_dict['completed_today'] = HabitLog.query.filter_by(
            habit_id=habit_id,
            log_date=today,
            completed=True
        ).first() is not None
        
        return jsonify({
            'success': True,
            'message': 'Habit logged successfully',
            'habit': habit_dict
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in log_habit: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/habits/stats', methods=['GET'])
def get_habits_stats():
    try:
        user_id = session.get('user_id', 1)
        habits = Habit.query.filter_by(user_id=user_id).all()

        today = date.today()
        habit_ids = [h.habit_id for h in habits]
        if habit_ids:
            today_logs = HabitLog.query.filter(HabitLog.habit_id.in_(habit_ids), HabitLog.log_date==today, HabitLog.completed==True).all()
        else:
            today_logs = []
        
        total_habits = len(habits)
        completed_today = len(today_logs)
        completion_rate = round((completed_today / total_habits * 100) if total_habits > 0 else 0, 1)
        
        best_streak = 0
        for habit in habits:
            if habit.streak > best_streak:
                best_streak = habit.streak
        
        return jsonify({
            'success': True,
            'stats': {
                'total_habits': total_habits,
                'completed_today': completed_today,
                'completion_rate': completion_rate,
                'best_streak': best_streak
            }
        })
        
    except Exception as e:
        print(f"Error in get_habits_stats: {e}")
        return jsonify({'error': str(e)}), 500


# Delete a habit and its logs
@app.route('/api/habits/<int:habit_id>', methods=['DELETE'])
def delete_habit(habit_id):
    try:
        habit = Habit.query.get(habit_id)
        if not habit:
            return jsonify({'error': 'Habit not found'}), 404

        # delete related logs first
        HabitLog.query.filter_by(habit_id=habit_id).delete()
        db.session.delete(habit)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Habit deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting habit {habit_id}: {e}")
        return jsonify({'error': str(e)}), 500
    

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks for current user"""
    try:
        user_id = session.get('user_id', 1)
        
        # Use raw SQL that matches your actual database columns
        sql = text("""
            SELECT 
                task_id,
                task_name,
                due_date,
                is_completed,
                priority,
                user_id
            FROM tasks 
            WHERE user_id = :user_id
            ORDER BY is_completed ASC, due_date ASC, task_id DESC
        """)
        
        result = db.session.execute(sql, {'user_id': user_id})
        tasks = []
        
        for row in result:
            tasks.append({
                'task_id': row.task_id,
                'name': row.task_name,  # Map task_name to name for JavaScript
                'date': row.due_date.isoformat() if row.due_date else None,  # Map due_date to date
                'completed': bool(row.is_completed),  # Map is_completed to completed
                'priority': row.priority,
                'user_id': row.user_id,
                'task_name': row.task_name,  # Keep original
                'due_date': row.due_date.isoformat() if row.due_date else None,  # Keep original
                'is_completed': bool(row.is_completed)  # Keep original
            })
        
        return jsonify({
            'success': True,
            'tasks': tasks,
            'count': len(tasks)
        })
        
    except Exception as e:
        print(f"Error in get_tasks: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Task name is required'}), 400
        
        # Parse date (default to today if not provided)
        task_date = date.today()
        if data.get('date'):
            try:
                task_date = datetime.strptime(data.get('date'), '%Y-%m-%d').date()
            except:
                task_date = date.today()
        
        # Parse due time if provided (for timer functionality)
        due_time = data.get('due_time')
        
        user_id = session.get('user_id', 1)
        new_task = Task(
            user_id=user_id,
            task_name=data.get('name'),
            due_date=task_date,
            is_completed=False
        )
        
        db.session.add(new_task)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Task created successfully',
            'task': new_task.to_dict(),
            'due_time': due_time  # Will be handled by JavaScript timer
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in create_task: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update a task"""
    try:
        data = request.get_json()
        
        # Check if task exists
        user_id = session.get('user_id', 1)
        check_sql = text("SELECT COUNT(*) as count FROM tasks WHERE task_id = :task_id AND user_id = :user_id")
        count = db.session.execute(check_sql, {'task_id': task_id, 'user_id': user_id}).scalar()
        
        if count == 0:
            return jsonify({'error': 'Task not found'}), 404
        
        # Build update query dynamically
        updates = []
        params = {'task_id': task_id}
        
        if 'name' in data:
            updates.append("task_name = :task_name")
            params['task_name'] = data['name']
        
        if 'date' in data:
            try:
                due_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
                updates.append("due_date = :due_date")
                params['due_date'] = due_date
            except:
                pass
        
        if 'completed' in data:
            updates.append("is_completed = :is_completed")
            params['is_completed'] = data['completed']
        
        if updates:
            update_sql = text(f"UPDATE tasks SET {', '.join(updates)} WHERE task_id = :task_id AND user_id = :user_id")
            params['user_id'] = user_id
            db.session.execute(update_sql, params)
            db.session.commit()
        
        # Get updated task
        get_sql = text("SELECT * FROM tasks WHERE task_id = :task_id AND user_id = :user_id")
        result = db.session.execute(get_sql, {'task_id': task_id, 'user_id': user_id})
        row = result.fetchone()
        
        task_data = {
            'task_id': row.task_id,
            'name': row.task_name,
            'date': row.due_date.isoformat() if row.due_date else None,
            'completed': bool(row.is_completed),
            'priority': row.priority,
            'user_id': row.user_id
        }
        
        return jsonify({
            'success': True,
            'message': 'Task updated successfully',
            'task': task_data
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in update_task: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    try:
        # Check if task exists
        user_id = session.get('user_id', 1)
        check_sql = text("SELECT COUNT(*) as count FROM tasks WHERE task_id = :task_id AND user_id = :user_id")
        count = db.session.execute(check_sql, {'task_id': task_id, 'user_id': user_id}).scalar()
        
        if count == 0:
            return jsonify({'error': 'Task not found'}), 404
        
        # Delete task
        delete_sql = text("DELETE FROM tasks WHERE task_id = :task_id AND user_id = :user_id")
        db.session.execute(delete_sql, {'task_id': task_id, 'user_id': user_id})
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Task deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in delete_task: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>/toggle', methods=['POST'])
def toggle_task(task_id):
    """Toggle task completion status"""
    try:
        # Check if task exists
        user_id = session.get('user_id', 1)
        check_sql = text("SELECT * FROM tasks WHERE task_id = :task_id AND user_id = :user_id")
        result = db.session.execute(check_sql, {'task_id': task_id, 'user_id': user_id})
        row = result.fetchone()
        
        if not row:
            return jsonify({'error': 'Task not found'}), 404
        
        # Toggle completion
        new_status = not bool(row.is_completed)
        
        toggle_sql = text("UPDATE tasks SET is_completed = :is_completed WHERE task_id = :task_id AND user_id = :user_id")
        db.session.execute(toggle_sql, {
            'task_id': task_id,
            'is_completed': new_status,
            'user_id': user_id
        })
        db.session.commit()
        
        # Get updated task
        result = db.session.execute(check_sql, {'task_id': task_id, 'user_id': user_id})
        row = result.fetchone()
        
        task_data = {
            'task_id': row.task_id,
            'name': row.task_name,
            'date': row.due_date.isoformat() if row.due_date else None,
            'completed': bool(row.is_completed),
            'priority': row.priority,
            'user_id': row.user_id
        }
        
        return jsonify({
            'success': True,
            'message': 'Task toggled successfully',
            'task': task_data
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in toggle_task: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/stats', methods=['GET'])
def get_tasks_stats():
    """Get task statistics"""
    try:
        # Get all tasks for current user
        user_id = session.get('user_id', 1)
        tasks = Task.query.filter_by(user_id=user_id).all()
        
        # Calculate statistics
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.completed])
        pending_tasks = total_tasks - completed_tasks
        completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
        
        # Tasks by date
        today = date.today()
        today_tasks = [t for t in tasks if t.date == today]
        overdue_tasks = [t for t in tasks if t.date and t.date < today and not t.completed]
        
        return jsonify({
            'success': True,
            'stats': {
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'pending_tasks': pending_tasks,
                'completion_rate': completion_rate,
                'today_tasks': len(today_tasks),
                'overdue_tasks': len(overdue_tasks)
            }
        })
        
    except Exception as e:
        print(f"Error in get_tasks_stats: {e}")
        return jsonify({'error': str(e)}), 500
    
class Journal(db.Model):
    __tablename__ = 'journal'
    journal_id = db.Column('journal_id', db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column('user_id', db.Integer, nullable=False, default=1)
    content = db.Column('content', db.Text, nullable=False)
    stickers = db.Column('stickers', db.Text)  # JSON string: list of sticker/image URLs
    entry_date = db.Column('entry_date', db.Date, nullable=False, default=date.today)
    created_at = db.Column('created_at', db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'journal_id': self.journal_id,
            'user_id': self.user_id,
            'content': self.content,
            'stickers': json.loads(self.stickers) if self.stickers else [],
            'entry_date': self.entry_date.isoformat() if self.entry_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Ensure uploads folder exists for images/stickers
UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT

# ===== Journal APIs =====

@app.route('/api/journal', methods=['GET'])
def get_journal_entries():
    try:
        user_id = session.get('user_id', 1)
        entries = Journal.query.filter_by(user_id=user_id).order_by(Journal.entry_date.desc(), Journal.created_at.desc()).all()
        return jsonify({'success': True, 'entries': [e.to_dict() for e in entries]})
    except Exception as e:
        print("get_journal_entries error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/journal', methods=['POST'])
def create_journal_entry():
    try:
        data = request.get_json() or {}
        content = data.get('content', '').strip()
        if not content:
            return jsonify({'error': 'Content is required'}), 400

        entry_date = date.today()
        if data.get('entry_date'):
            try:
                entry_date = datetime.strptime(data.get('entry_date'), '%Y-%m-%d').date()
            except:
                pass

        stickers = data.get('stickers', [])
        user_id = session.get('user_id', 1)
        j = Journal(user_id=user_id, content=content, stickers=json.dumps(stickers), entry_date=entry_date)
        db.session.add(j)
        db.session.commit()
        return jsonify({'success': True, 'entry': j.to_dict()})
    except Exception as e:
        db.session.rollback()
        print("create_journal_entry error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/journal/<int:journal_id>', methods=['PUT'])
def update_journal_entry(journal_id):
    try:
        data = request.get_json() or {}
        user_id = session.get('user_id', 1)
        entry = Journal.query.get(journal_id)
        if not entry:
            return jsonify({'error': 'Entry not found'}), 404

        if entry.user_id != user_id:
            return jsonify({'error': 'Entry not found'}), 404

        if 'content' in data:
            entry.content = data.get('content', entry.content)
        if 'entry_date' in data:
            try:
                entry.entry_date = datetime.strptime(data.get('entry_date'), '%Y-%m-%d').date()
            except:
                pass
        if 'stickers' in data:
            entry.stickers = json.dumps(data.get('stickers', []))

        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})
    except Exception as e:
        db.session.rollback()
        print("update_journal_entry error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/journal/<int:journal_id>', methods=['DELETE'])
def delete_journal_entry(journal_id):
    try:
        user_id = session.get('user_id', 1)
        entry = Journal.query.get(journal_id)
        if not entry or entry.user_id != user_id:
            return jsonify({'error': 'Entry not found'}), 404
        db.session.delete(entry)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        print("delete_journal_entry error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/journal/upload', methods=['POST'])
def upload_journal_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        if file and allowed_file(file.filename):
            filename = secure_filename(f"{int(datetime.utcnow().timestamp())}_{file.filename}")
            dest = os.path.join(UPLOAD_FOLDER, filename)
            file.save(dest)
            url = url_for('static', filename=f'uploads/{filename}', _external=False)
            return jsonify({'success': True, 'url': url})
        return jsonify({'error': 'Invalid file type'}), 400
    except Exception as e:
        print("upload_journal_image error:", e)
        return jsonify({'error': str(e)}), 500


# ===== Farm aggregated stats API =====
@app.route('/api/farm/stats', methods=['GET'])
def api_farm_stats():
    try:
        user_id = session.get('user_id', 1)
        total_moods = Mood.query.filter_by(user_id=user_id).count()
        recent_moods = Mood.query.filter_by(user_id=user_id).order_by(Mood.log_date.desc(), Mood.created_at.desc()).limit(7).all()

        total_habits = Habit.query.filter_by(user_id=user_id).count()
        # limit habit logs to this user's habits
        habit_ids = [h.habit_id for h in Habit.query.filter_by(user_id=user_id).all()]
        if habit_ids:
            completed_habits_today = HabitLog.query.filter(HabitLog.habit_id.in_(habit_ids), HabitLog.log_date==date.today(), HabitLog.completed==True).count()
        else:
            completed_habits_today = 0

        total_tasks = Task.query.filter_by(user_id=user_id).count()
        completed_tasks = Task.query.filter_by(user_id=user_id, is_completed=True).count()

        total_journal = Journal.query.filter_by(user_id=user_id).count()
        recent_journal = Journal.query.filter_by(user_id=user_id).order_by(Journal.entry_date.desc(), Journal.created_at.desc()).limit(5).all()

        return jsonify({
            'success': True,
            'stats': {
                'total_moods': total_moods,
                'recent_moods': [m.to_dict() for m in recent_moods],
                'total_habits': total_habits,
                'completed_habits_today': completed_habits_today,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'total_journal': total_journal,
                'recent_journal': [j.to_dict() for j in recent_journal]
            }
        })
    except Exception as e:
        print(f"Error in api_farm_stats: {e}")
        return jsonify({'error': str(e)}), 500



@app.before_request
def require_login():
    # Allow access to static files, API, and auth endpoints
    if request.path.startswith('/static') or request.path.startswith('/api'):
        return
    if request.path in ['/register', '/login', '/init-db']:
        return
    if 'user_id' not in session:
        return redirect(url_for('register'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    # If a logged-in user visits register (GET), clear session so form always shows
    if request.method == 'GET' and 'user_id' in session:
        session.pop('user_id', None)
        flash('Signed out — you can register a new account.', 'info')

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')
        if not name or not email or not password:
            flash('Please fill all fields', 'error')
            return redirect(url_for('register'))
        if password != confirm:
            flash('Passwords do not match', 'error')
            return redirect(url_for('register'))

        pw_hash = generate_password_hash(password)
        user = User(name=name, email=email, password_hash=pw_hash)
        try:
            db.session.add(user)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            flash('Email already registered', 'error')
            return redirect(url_for('register'))

        session['user_id'] = user.user_id
        flash('Account created', 'success')
        return redirect(url_for('index'))
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.user_id
            flash('Logged in', 'success')
            return redirect(url_for('index'))
        flash('Invalid credentials', 'error')
        return redirect(url_for('login'))
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('Logged out', 'success')
    return redirect(url_for('login'))


@app.route('/')
def index():
    current_user = None
    if 'user_id' in session:
        try:
            current_user = User.query.get(session.get('user_id'))
        except:
            current_user = None
    return render_template('index.html', current_user=current_user)

@app.route('/mood')
def mood():
    return render_template('mood.html')

@app.route('/habits')
def habits():
    return render_template('habits.html')

@app.route('/tasks')
def tasks():
    return render_template('tasks.html')

@app.route('/journal')
def journal():
    return render_template('journal.html')

@app.route('/stats')
def farm_statistics():
    return render_template('farm_statistics.html')

@app.route('/settings')
def farm_settings():
    return render_template('farm_settings.html')

@app.route('/health')
def health():
    try:
        mood_count = Mood.query.count()
        habit_count = Habit.query.count()
        return jsonify({
            'status': 'healthy',
            'mood_entries': mood_count,
            'habit_entries': habit_count
        })
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

@app.route('/init-db')
def init_db():
    try:
        db.create_all()
        return jsonify({'success': True, 'message': 'Database initialized'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("✅ Database tables created/verified")
    
    print("🚀 Starting Stardew Valley Well-Being Tracker...")
    print("🌐 Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)
