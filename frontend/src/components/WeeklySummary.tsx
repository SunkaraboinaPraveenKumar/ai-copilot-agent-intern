import { useState, useEffect } from 'react';
import { Calendar, Mail, GitBranch, RefreshCw } from 'lucide-react';
import { tasksAPI } from '../services/api';
import Markdown from 'react-markdown';

interface WeeklySummaryProps {
    className?: string;
}

export function WeeklySummary({ className }: WeeklySummaryProps) {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const response = await tasksAPI.getWeeklySummary();
            setSummary(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to load weekly summary');
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
            <div className="text-red-600 p-4 flex items-center justify-between">
                <span>{error}</span>
                <button
                    onClick={fetchSummary}
                    className="flex items-center text-blue-600 hover:text-blue-700"
                >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                </button>
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Weekly Activity Summary</h3>
                <p className="text-sm text-gray-500">
                    Generated on {new Date(summary.generated_at).toLocaleString()}
                </p>
            </div>

            <div className="p-4">
                <div className="prose max-w-none">
                    <Markdown>
                        {summary.summary}
                    </Markdown>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <div>
                            <p className="text-sm text-gray-500">Emails</p>
                            <p className="font-medium">{summary.data_sources.emails}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-green-500" />
                        <div>
                            <p className="text-sm text-gray-500">Events</p>
                            <p className="font-medium">{summary.data_sources.events}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <GitBranch className="h-5 w-5 text-purple-500" />
                        <div>
                            <p className="text-sm text-gray-500">Issues</p>
                            <p className="font-medium">{summary.data_sources.issues}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
