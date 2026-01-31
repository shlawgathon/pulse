import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { API_BASE } from '../../../utils/config';

interface Recording {
    sessionId: string;
    startedAt: string;
    duration?: number;
    visitorId?: string;
    city?: string;
    country?: string;
}

const RecordingsList = ({ websiteId, token }: { websiteId?: string, token: string | null }) => {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!websiteId) return;

        const fetchRecordings = async () => {
            try {
                const res = await fetch(`${API_BASE}/recordings?websiteId=${websiteId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                const data = await res.json();
                if (data.success) {
                    setRecordings(data.recordings);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecordings();
    }, [websiteId]);

    // Rethink: I should pass website ID from parent.
    return (
        <div className="bg-foreground border border-border rounded-md overflow-hidden">
            <div className="p-4 border-b border-border">
                <h2 className="font-bold text-lg">Session Recordings</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-border/30 text-copy-light font-medium">
                        <tr>
                            <th className="px-4 py-3">Visitor</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Duration</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {recordings.map((recording) => (
                            <tr key={recording.sessionId} className="hover:bg-border/20 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs">{recording.visitorId?.slice(0, 8)}...</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span>{recording.city ? `${recording.city}, ${recording.country}` : recording.country || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span>{formatDistanceToNow(new Date(recording.startedAt), { addSuffix: true })}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {recording.duration ? `${recording.duration}s` : '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <Link
                                        to={`/sessions/${recording.sessionId}/replay`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-copy text-background hover:bg-copy/90 rounded text-xs font-medium transition-colors"
                                    >
                                        Watch
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {!loading && recordings.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-copy-light">
                                    No recordings found.
                                </td>
                            </tr>
                        )}
                        {loading && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-copy-light animate-pulse">
                                    Loading...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecordingsList;
