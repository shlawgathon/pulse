import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { API_BASE } from "../../../utils/config";
import { useAuth } from "../../../contexts/AuthContext";

type WebsiteSettingsPanelProps = {
    publicId: string;
};

const WebsiteSettingsPanel = ({ publicId }: WebsiteSettingsPanelProps) => {
    const { token } = useAuth();
    const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const [originalTimezone, setOriginalTimezone] = useState<string>(timezone);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWebsite = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/websites/${publicId}/stats`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load');
                const tz = data.stats?.timezone || 'UTC';
                setTimezone(tz);
                setOriginalTimezone(tz);
            } catch (e: any) {
                toast.error(e.message || 'Failed to load settings');
            } finally {
                setLoading(false);
            }
        };
        if (publicId && token) fetchWebsite();
    }, [publicId, token]);

    const save = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_BASE}/api/websites/${publicId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ timezone }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save');
            toast.success('Timezone updated');
            setOriginalTimezone(timezone);
        } catch (e: any) {
            toast.error(e.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-foreground border border-border rounded-md rounded-t-none border-t-0 p-6 w-full">
            <div className="flex flex-row justify-between items-start">
                <div>
                    <h2 className="text-sm font-medium text-copy">Timezone</h2>
                    <p className="text-xs text-copy-lighter mt-1">Used for localizing charts and reports</p>
                </div>
                <div className="w-2/4">
                    <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-md bg-background/50 px-4 py-2 text-sm border border-border focus:outline-none focus:border-primary transition"
                        disabled={loading}
                    >
                        {typeof (Intl as any).supportedValuesOf === 'function'
                            ? (Intl as any).supportedValuesOf('timeZone').map((tz: string) => (
                                <option key={tz} value={tz}>{tz}</option>
                              ))
                            : (
                                <>
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">America/New_York</option>
                                    <option value="Europe/London">Europe/London</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                                </>
                              )}
                    </select>
                </div>
            </div>

            <div className="mt-10 flex justify-end items-center gap-2">
                <div className="flex gap-2">
                    <button
                        onClick={() => setTimezone(originalTimezone)}
                        disabled={loading || originalTimezone === timezone}
                        className="cursor-pointer disabled:cursor-not-allowed bg-border/30 border border-border transition duration-200 text-copy-light text-xs rounded-md px-6 py-2 disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={saving || loading || originalTimezone === timezone}
                        className="cursor-pointer disabled:cursor-not-allowed bg-primary text-primary-content text-xs rounded-md px-6 py-2 disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebsiteSettingsPanel;


