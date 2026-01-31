import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import { API_BASE } from '../utils/config';
import Layout from '../components/Layout';
import { SessionPlayer } from '../components/SessionPlayer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDesktop,
    faMobileAlt,
    faExclamationTriangle,
    faSearch,
    faQuestion
} from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { faApple, faChrome, faEdge, faFirefox, faLinux, faSafari, faWindows } from '@fortawesome/free-brands-svg-icons';

interface Session {
    sessionId: string;
    startedAt: string;
    duration?: number;
    visitorId: string;
    city?: string;
    country?: string;
    device?: string;
    os?: string;
    browser?: string;
    pageViews?: number;
    userId?: string;
    websiteId?: string;
}

export const SessionReplay = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const playerContainer = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [relatedSessions, setRelatedSessions] = useState<Session[]>([]);
    const playerInstance = useRef<any>(null);

    // Fetch current session and events
    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);

        const fetchRecording = async () => {
            try {
                // Determine API URL based on config - assuming API_BASE might need /api prefix or not
                // Backend route is /recordings/:sessionId (no /api prefix in the file I read)
                const res = await fetch(`${API_BASE}/recordings/${sessionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to fetch recording');
                const data = await res.json();

                if (!data.success || !data.events) {
                    throw new Error('Recording not found or incomplete');
                }

                setCurrentSession(data.session);

                // Sort events by timestamp
                const sortedEvents = data.events.sort((a: any, b: any) => a.timestamp - b.timestamp);
                setEvents(sortedEvents);

            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRecording();
    }, [sessionId, token]);

    // Initialize Player
    useEffect(() => {
        if (loading || !events.length || !playerContainer.current) return;

        // Cleanup previous instance
        playerContainer.current.innerHTML = '';

        try {
            // Calculate dimensions based on available space or use default
            const width = playerContainer.current.clientWidth;
            const height = (width * 9) / 16; // 16:9 aspect ratio

            playerInstance.current = new rrwebPlayer({
                target: playerContainer.current,
                props: {
                    events: events,
                    width: width,
                    height: height, // dynamic height
                    autoPlay: true,
                    showController: true,
                    skipInactive: true,
                },
            });

            // Handle resize
            const handleResize = () => {
                if (playerInstance.current && playerContainer.current) {
                    const w = playerContainer.current.clientWidth;
                    const h = (w * 9) / 16;
                    playerInstance.current.$set({ width: w, height: h });
                    playerInstance.current.triggerResize();
                }
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);

        } catch (e) {
            console.error("Failed to initialize player:", e);
        }
    }, [loading, events]);

    // Fetch related sessions for the sidebar
    useEffect(() => {
        if (!currentSession?.websiteId && !currentSession) return;
        // Need websiteId. currentSession has it (it's in the DB schema as websiteId)
        // Wait, the interface above didn't include websiteId. Let's add it.
        // Assuming the backend returns the raw session row which has websiteId.

        const websiteId = (currentSession as any).websiteId;
        if (!websiteId) return;

        const fetchRelated = async () => {
            setSessionLoading(true);
            try {
                const res = await fetch(`${API_BASE}/recordings?websiteId=${websiteId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setRelatedSessions(data.recordings);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setSessionLoading(false);
            }
        };

        fetchRelated();
    }, [currentSession, token]);

    const getDeviceIcon = (device?: string) => {
        if (device?.toLowerCase().includes('mobile')) return faMobileAlt;
        return faDesktop;
    };

    const getOSIcon = (os?: string) => {
        console.log(os);
        if (os?.toLowerCase().includes('windows')) return faWindows;
        if (os?.toLowerCase().includes('mac')) return faApple;
        if (os?.toLowerCase().includes('linux')) return faLinux;
        return faQuestion;
    };

    const getBrowserIcon = (browser?: string) => {
        if (browser?.toLowerCase().includes('chrome')) return faChrome;
        if (browser?.toLowerCase().includes('firefox')) return faFirefox;
        if (browser?.toLowerCase().includes('safari')) return faSafari;
        if (browser?.toLowerCase().includes('edge')) return faEdge;
        return faQuestion;
    };

    function getFlagEmoji(countryCode: string) {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }

    // Layout and Player Integration
    return (
        <Layout showChat={false} className="p-0! h-[calc(100vh-64px)] overflow-hidden">
            <div className="flex h-full">
                {/* Sidebar - Sessions List */}
                <div className="w-80 border-r border-border bg-foreground flex flex-col shrink-0">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h2 className="font-semibold text-copy">Recordings</h2>
                        <div className="text-xs text-copy-light bg-border/30 px-2 py-1 rounded-full">
                            {relatedSessions.length} sessions
                        </div>
                    </div>

                    {/* Search/Filter Mock */}
                    <div className="p-3 border-b border-border bg-background/30">
                        <div className="relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-copy-lighter text-xs" />
                            <input
                                type="text"
                                placeholder="Search recordings..."
                                className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-copy focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {sessionLoading ? (
                            <div className="p-4 space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-4 bg-border/50 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-border/30 rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            relatedSessions.map(session => (
                                <div
                                    key={session.sessionId}
                                    onClick={() => navigate(`/sessions/${session.sessionId}/replay`)}
                                    className={`p-4 border-b border-border/50 cursor-pointer hover:bg-border/20 transition-colors ${session.sessionId === sessionId ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <span className="text-sm font-medium text-copy truncate">
                                            {session.userId || session.visitorId?.slice(0, 8) || 'Anonymous'}
                                        </span>
                                        <span className="text-xs text-copy-light whitespace-nowrap">
                                            {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <div className='flex flex-row items-center justify-between'>
                                        <div className="flex items-center gap-1 text-xs text-copy-light">
                                            <span className="truncate mr-1">{getFlagEmoji(session.country || 'US')} {session.city || 'Unknown'}</span>
                                            <div className="flex items-center gap-1.5" title={`${session.browser}`}>
                                                <FontAwesomeIcon icon={getBrowserIcon(session?.browser)} className="text-copy-lighter" />
                                            </div>
                                            <div className="flex items-center gap-1.5" title={`${session.device}`}>
                                                <FontAwesomeIcon icon={getDeviceIcon(session.device)} className="text-copy-lighter" />
                                            </div>
                                            <div className="flex items-center gap-1.5" title={`${session.os}`}>
                                                <FontAwesomeIcon icon={getOSIcon(session.os)} className="text-copy-lighter" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content - Player */}
                <div className="flex-1 bg-background flex flex-col h-full overflow-hidden relative">
                    <div className="flex-1 overflow-hidden flex flex-col bg-background relative">
                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-copy-light animate-pulse z-20 bg-background">
                                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <span>Loading session replay...</span>
                            </div>
                        ) : error ? (
                            <div className="absolute inset-0 flex items-center justify-center p-8 bg-background z-20">
                                <div className="text-center p-8 bg-foreground border border-border rounded-lg max-w-md shadow-lg">
                                    <div className="text-red-500 text-4xl mb-4">
                                        <FontAwesomeIcon icon={faExclamationTriangle} />
                                    </div>
                                    <h3 className="text-lg font-bold text-copy mb-2">Unable to play session</h3>
                                    <p className="text-copy-light text-sm mb-4">{error}</p>
                                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-content rounded-md text-sm hover:bg-primary-dark">
                                        Try Refreshing
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 relative w-full h-full">
                                <SessionPlayer events={events} autoPlay={true} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};
