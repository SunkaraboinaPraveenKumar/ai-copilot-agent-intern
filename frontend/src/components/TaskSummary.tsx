import React, { useState, useEffect } from 'react';
import { Calendar, GitBranch, Clock, AlertTriangle, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { tasksAPI, TaskSummary as TaskSummaryType } from '../services/api';

export function TaskSummary() {
  const [summary, setSummary] = useState<TaskSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskSummary();
  }, []);

  const fetchTaskSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tasksAPI.getSummary();
      setSummary(response.data);
    } catch (err) {
      setError('Failed to load task summary');
      console.error('Task summary error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-200 rounded-lg h-24"></div>
          <div className="bg-gray-200 rounded-lg h-24"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 rounded-lg h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchTaskSummary}
          className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">Total Tasks</span>
          </div>
          <div className="text-2xl font-bold">{summary.total_tasks}</div>
          <div className="text-sm opacity-90">
            {summary.urgent_tasks} urgent, {summary.overdue_tasks} overdue
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-4 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Completed</span>
          </div>
          <div className="text-2xl font-bold">{summary.completed_this_week}</div>
          <div className="text-sm opacity-90">This week</div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
          <button
            onClick={fetchTaskSummary}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        
        {summary.upcoming_deadlines.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.upcoming_deadlines.map((task, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                      {task.source === 'jira' ? (
                        <GitBranch className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Calendar className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 capitalize">{task.source}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`h-4 w-4 ${getPriorityColor(task.priority)}`} />
                    <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}