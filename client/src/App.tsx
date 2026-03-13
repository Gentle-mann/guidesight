import { useEffect, useState } from 'react';
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
} from '@stream-io/video-react-sdk';
import type { User } from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import './index.css';
import type { TaskSummary, TaskDetail } from './types';
import { CoachingSession } from './components/CoachingSession';
import { TaskPicker } from './components/TaskPicker';
import { TaskDetail as TaskDetailScreen } from './components/TaskDetail';
import { AdminDashboard } from './components/AdminDashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { LandingPage } from './components/LandingPage';

const API_KEY = 'eu24qn67gz64';
const USER_ID = 'guidesight-user';
const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER || 'https://innocent-melbourne-forty-petroleum.trycloudflare.com';

function App() {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [callInstance, setCallInstance] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState('');
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin');
  const [isAnalytics, setIsAnalytics] = useState(window.location.hash === '#analytics');
  const [showLanding, setShowLanding] = useState(!window.location.hash);

  // Listen for hash changes
  useEffect(() => {
    const onHash = () => {
      setIsAdmin(window.location.hash === '#admin');
      setIsAnalytics(window.location.hash === '#analytics');
      if (!window.location.hash) setShowLanding(true);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [tasksError, setTasksError] = useState(false);
  const fetchTasks = () => {
    setTasksLoading(true);
    setTasksError(false);
    fetch(`${TOKEN_SERVER}/tasks`)
      .then((r) => {
        if (!r.ok) throw new Error('Server error');
        return r.json();
      })
      .then((data) => { setTasks(data); setTasksLoading(false); })
      .catch(() => { setTasksError(true); setTasksLoading(false); });
  };
  useEffect(() => { fetchTasks(); }, []);

  useEffect(() => {
    let videoClient: StreamVideoClient | null = null;

    async function init() {
      const user: User = {
        id: USER_ID,
        name: 'User',
      };

      videoClient = new StreamVideoClient({
        apiKey: API_KEY,
        user,
        tokenProvider: async () => {
          const res = await fetch(`${TOKEN_SERVER}/token/${USER_ID}`);
          const data = await res.json();
          return data.token;
        },
      });

      setClient(videoClient);
    }

    init();

    return () => {
      videoClient?.disconnectUser();
    };
  }, []);

  const handleSelectTask = async (taskId: string) => {
    try {
      const res = await fetch(`${TOKEN_SERVER}/tasks/${taskId}`);
      const task: TaskDetail = await res.json();
      setSelectedTask(task);
    } catch (err: any) {
      setError(err.message || 'Failed to load task');
    }
  };

  const handleJoinCall = async () => {
    if (!client || !selectedTask) return;
    setIsJoining(true);
    setJoinStatus('Starting AI Coach...');

    try {
      await fetch(`${TOKEN_SERVER}/task-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTask.id }),
      });

      setJoinStatus('Connecting to video...');
      let callId: string | null = null;
      for (let i = 0; i < 25; i++) {
        const callIdRes = await fetch(`${TOKEN_SERVER}/call-id`);
        const data = await callIdRes.json();
        callId = data.callId;
        if (callId) break;
        const delay = Math.min(2000 * Math.pow(1.2, i), 5000);
        if (i >= 5) setJoinStatus('Almost ready...');
        await new Promise((r) => setTimeout(r, delay));
      }
      if (!callId) {
        setIsJoining(false);
        setError('AI Coach not running yet. Start the agent first.');
        return;
      }

      setJoinStatus('Joining session...');
      const call = client.call('default', callId);
      call.updatePublishOptions({ preferredCodec: 'vp8' });
      await call.join({ create: true });
      await call.camera.enable();
      await call.microphone.enable();
      setCallInstance(call);
      setJoined(true);
      setIsJoining(false);
    } catch (err: any) {
      console.error('Failed to join call:', err);
      setIsJoining(false);
      setError(err.message || 'Failed to join call');
    }
  };

  // Admin dashboard
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Analytics dashboard
  if (isAnalytics) {
    return <AnalyticsDashboard />;
  }

  // Landing page
  if (showLanding) {
    return (
      <LandingPage
        onSelectPortal={() => { window.location.hash = '#admin'; }}
        onSelectWorker={() => setShowLanding(false)}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh px-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--error)]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setSelectedTask(null);
              setJoined(false);
              setCallInstance(null);
              setIsJoining(false);
            }}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">Initializing...</p>
        </div>
      </div>
    );
  }

  // Task picker
  if (!selectedTask) {
    return (
      <StreamVideo client={client}>
        <TaskPicker
          tasks={tasks}
          loading={tasksLoading}
          onSelect={handleSelectTask}
          error={tasksError}
          onRetry={fetchTasks}
        />
      </StreamVideo>
    );
  }

  // Task detail (pre-join)
  if (!joined) {
    return (
      <StreamVideo client={client}>
        <TaskDetailScreen
          task={selectedTask}
          onStart={handleJoinCall}
          onBack={() => setSelectedTask(null)}
          loading={isJoining}
          loadingStatus={joinStatus}
        />
      </StreamVideo>
    );
  }

  // Coaching session
  return (
    <StreamVideo client={client}>
      <StreamCall call={callInstance}>
        <CoachingSession
          task={selectedTask}
          onEndSession={() => {
            callInstance?.leave();
            setCallInstance(null);
            setJoined(false);
            setSelectedTask(null);
          }}
        />
      </StreamCall>
    </StreamVideo>
  );
}

export default App;
