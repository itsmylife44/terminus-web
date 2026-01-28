'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Clock, User, MessageSquare, CheckCircle2 } from 'lucide-react';
import { openCodeClient, type OpenCodeSessionDetail, type OpenCodeTodo } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<OpenCodeSessionDetail | null>(null);
  const [todos, setTodos] = useState<OpenCodeTodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [sessionData, todosData] = await Promise.all([
          openCodeClient.getSession(sessionId),
          openCodeClient.getSessionTodos(sessionId).catch(() => []),
        ]);

        setSession(sessionData);
        setTodos(todosData);
      } catch (err) {
        console.error('Failed to fetch session details:', err);
        setError('Failed to load session details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-red-400">{error || 'Session not found'}</p>
          <p className="text-gray-500">The session may have been deleted or is inaccessible</p>
        </div>
        <Button
          onClick={() => router.push('/sessions')}
          variant="outline"
          className="border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Button>
      </div>
    );
  }

  const statusColor =
    session.status === 'active' || session.state === 'running'
      ? 'text-green-400 bg-green-400/10 border-green-400/30'
      : 'text-gray-400 bg-gray-400/10 border-gray-400/30';

  const messages = session.messages || [];
  const hasTodos = todos.length > 0;

  return (
    <div className="min-h-full space-y-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      <div className="relative">
        <Button
          onClick={() => router.push('/sessions')}
          variant="ghost"
          className="mb-6 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Button>

        <div className="border border-cyan-500/20 rounded-2xl p-8 bg-gray-900/50 backdrop-blur-sm shadow-2xl shadow-cyan-500/10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black tracking-tighter mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Session Details
              </h1>
              <p className="text-gray-500 font-mono text-sm tracking-wider">{sessionId}</p>
            </div>
            <span
              className={`px-5 py-2 rounded-full text-sm font-bold border ${statusColor} uppercase tracking-wider`}
            >
              {session.status || session.state || 'unknown'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {session.created && (
              <div className="flex items-center space-x-4 p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
                <Clock className="h-8 w-8 text-cyan-400" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Created</p>
                  <p className="text-base font-bold text-gray-200">
                    {new Date(session.created).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {session.agent && (
              <div className="flex items-center space-x-4 p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                <User className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Agent</p>
                  <p className="text-base font-bold text-gray-200">{session.agent}</p>
                </div>
              </div>
            )}
            {session.messageCount !== undefined && (
              <div className="flex items-center space-x-4 p-5 rounded-xl bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/20">
                <MessageSquare className="h-8 w-8 text-pink-400" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Messages</p>
                  <p className="text-base font-bold text-gray-200">{session.messageCount}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasTodos && (
        <div className="relative border border-purple-500/20 rounded-2xl p-8 bg-gray-900/50 backdrop-blur-sm shadow-2xl shadow-purple-500/10">
          <h2 className="text-2xl font-black tracking-tighter mb-6 flex items-center">
            <CheckCircle2 className="mr-3 h-7 w-7 text-purple-400" />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Todos
            </span>
          </h2>
          <div className="space-y-3">
            {todos.map((todo) => {
              const statusConfigMap = {
                completed: {
                  bg: 'bg-green-500/20',
                  border: 'border-green-500/30',
                  text: 'text-green-400',
                  icon: '✓',
                },
                in_progress: {
                  bg: 'bg-cyan-500/20',
                  border: 'border-cyan-500/30',
                  text: 'text-cyan-400',
                  icon: '→',
                },
                pending: {
                  bg: 'bg-gray-500/20',
                  border: 'border-gray-500/30',
                  text: 'text-gray-400',
                  icon: '○',
                },
                cancelled: {
                  bg: 'bg-red-500/20',
                  border: 'border-red-500/30',
                  text: 'text-red-400',
                  icon: '✗',
                },
              };
              const statusConfig =
                statusConfigMap[todo.status as keyof typeof statusConfigMap] ||
                statusConfigMap.pending;

              const priorityConfig = {
                high: 'text-red-400',
                medium: 'text-yellow-400',
                low: 'text-blue-400',
              }[todo.priority || 'medium'];

              return (
                <div
                  key={todo.id}
                  className={`flex items-center justify-between p-5 rounded-xl border ${statusConfig.border} ${statusConfig.bg} transition-all hover:scale-[1.01] hover:shadow-lg`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <span className={`text-2xl font-bold ${statusConfig.text}`}>
                      {statusConfig.icon}
                    </span>
                    <div className="flex-1">
                      <p className={`text-base font-semibold ${statusConfig.text}`}>
                        {todo.content}
                      </p>
                    </div>
                  </div>
                  {todo.priority && (
                    <span
                      className={`text-xs font-bold uppercase tracking-widest ${priorityConfig} ml-4`}
                    >
                      {todo.priority}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="relative border border-cyan-500/20 rounded-2xl p-8 bg-gray-900/50 backdrop-blur-sm shadow-2xl shadow-cyan-500/10">
          <h2 className="text-2xl font-black tracking-tighter mb-6 flex items-center">
            <MessageSquare className="mr-3 h-7 w-7 text-cyan-400" />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Message History
            </span>
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent pr-2">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const isSystem = message.role === 'system';

              const roleConfig = isUser
                ? {
                    bg: 'bg-cyan-500/10',
                    border: 'border-cyan-500/30',
                    text: 'text-cyan-400',
                    label: 'User',
                  }
                : isSystem
                  ? {
                      bg: 'bg-yellow-500/10',
                      border: 'border-yellow-500/30',
                      text: 'text-yellow-400',
                      label: 'System',
                    }
                  : {
                      bg: 'bg-purple-500/10',
                      border: 'border-purple-500/30',
                      text: 'text-purple-400',
                      label: 'Assistant',
                    };

              return (
                <div
                  key={message.id || index}
                  className={`p-6 rounded-xl border ${roleConfig.border} ${roleConfig.bg} transition-all hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-black uppercase tracking-widest ${roleConfig.text}`}
                    >
                      {roleConfig.label}
                    </span>
                    {message.timestamp && (
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-200 leading-relaxed whitespace-pre-wrap font-light">
                    {message.content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {messages.length === 0 && !hasTodos && (
        <div className="relative border border-gray-500/20 rounded-2xl p-12 bg-gray-900/50 backdrop-blur-sm text-center">
          <p className="text-gray-500 text-lg">No messages or todos available for this session</p>
        </div>
      )}
    </div>
  );
}
