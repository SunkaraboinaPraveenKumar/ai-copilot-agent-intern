import { useEffect, useState } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, Flag, User, ChevronDown, ChevronUp } from 'lucide-react';
import { tasksAPI } from '../services/api';
import { TaskAnalysis } from './TaskAnalysis';
import { WeeklySummary } from './WeeklySummary';

// Define a Task type for better type safety (adjust fields as needed)
type Task = {
  id: string;
  title: string;
  description?: string;
  type?: string;
  urgent?: boolean;
  source?: string;
  start?: string;
  end?: string;
  due_date?: string;
  priority?: string;
  status?: string;
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tasksAPI.getAllTasks();
      setTasks(response.data.tasks || []);
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string | undefined) => {
    return type === 'event' ? Calendar : CheckCircle;
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeRange = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return '';
    const startTime = new Date(start).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    });
    const endTime = new Date(end).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${startTime} - ${endTime}`;
  };

  const isUpcoming = (dateString: string | undefined) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    return date > now;
  };

  const isToday = (dateString: string | undefined) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <span>Task Analysis</span>
              {showAnalysis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowWeeklySummary(!showWeeklySummary)}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
            >
              <span>Weekly Summary</span>
              {showWeeklySummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Task Analysis Section */}
        {showAnalysis && (
          <TaskAnalysis className="mb-6" />
        )}

        {/* Weekly Summary Section */}
        {showWeeklySummary && (
          <WeeklySummary className="mb-6" />
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tasks & Events</h2>
        <p className="text-gray-600">Manage your schedule and track your progress</p>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const TypeIcon = getTypeIcon(task.type);
          const isEventToday = isToday(task.start || task.due_date);
          const isEventUpcoming = isUpcoming(task.start || task.due_date);

          return (
            <div
              key={task.id}
              className={`bg-white rounded-lg shadow-sm border-l-4 hover:shadow-md transition-shadow duration-200 ${task.urgent ? 'border-l-red-500' : 'border-l-blue-500'
                }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-full ${task.type === 'event' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                      <TypeIcon className={`h-5 w-5 ${task.type === 'event' ? 'text-blue-600' : 'text-green-600'
                        }`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {task.title}
                        </h3>
                        {task.urgent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgent
                          </span>
                        )}
                        {isEventToday && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Today
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-gray-600 mb-3">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span className="capitalize">{task.source}</span>
                        </div>

                        {task.start && task.end && (
                          <div className="flex items-center space-x-1 min-w-0">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{formatTimeRange(task.start, task.end)}</span>
                          </div>
                        )}

                        {task.due_date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {formatDateTime(task.due_date)}</span>
                          </div>
                        )}

                        {task.priority && (
                          <div className="flex items-center space-x-1">
                            <Flag className={`h-4 w-4 ${getPriorityColor(task.priority)}`} />
                            <span className={`capitalize ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        )}

                        {(task.start || task.due_date) && (
                          <div className="text-xs text-gray-500 text-right">
                            {task.start ? formatDateTime(task.start) : formatDateTime(task.due_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    {task.status && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    )}

                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks or events</h3>
          <p className="text-gray-600">Your schedule is clear for now!</p>
        </div>
      )}
    </div>
  );
}