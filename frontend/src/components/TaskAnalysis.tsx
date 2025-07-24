import React, { useState, useEffect } from 'react';
import { Zap, Clock, AlertTriangle, CheckCircle, Target, Calendar } from 'lucide-react';
import { tasksAPI } from '../services/api';

interface TaskAnalysisProps {
  className?: string;
}

export function TaskAnalysis({ className }: TaskAnalysisProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getAnalysis();
      setAnalysis(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load task analysis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4">
        {error}
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Priority Tasks */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Target className="h-5 w-5 text-red-500 mr-2" />
          Priority Tasks
        </h3>
        <div className="space-y-3">
          {analysis.priority_tasks.map((task: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-gray-500">{task.source}</p>
              </div>
              {task.due_date && (
                <span className="text-sm text-gray-600">
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time Blocks */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 text-blue-500 mr-2" />
          Suggested Time Blocks
        </h3>
        <div className="space-y-3">
          {analysis.time_blocks.map((block: any, index: number) => (
            <div key={index} className="p-2 hover:bg-gray-50 rounded">
              <div className="flex items-center justify-between">
                <span className="font-medium">{block.time}</span>
                <span className="text-sm text-gray-600">{block.duration}</span>
              </div>
              <p className="text-sm text-gray-500">{block.tasks.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="h-5 w-5 text-purple-500 mr-2" />
          AI Recommendations
        </h3>
        <ul className="space-y-2">
          {analysis.recommendations.map((rec: string, index: number) => (
            <li key={index} className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
