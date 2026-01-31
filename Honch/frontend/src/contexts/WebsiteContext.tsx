import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE } from '../utils/config';

interface Website {
    id: string;
    publicId: string;
    name: string;
    domain: string;
}

interface WebsiteContextType {
    websites: Website[];
    selectedWebsite: Website | null;
    handleWebsiteSelect: (website: Website | null) => void;
    loading: boolean;
    refreshWebsites: () => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export const useWebsiteContext = () => {
    const context = useContext(WebsiteContext);
    if (!context) {
        throw new Error('useWebsiteContext must be used within a WebsiteProvider');
    }
    return context;
};

export const WebsiteProvider = ({ children }: { children: ReactNode }) => {
    const { token } = useAuth();
    const [websites, setWebsites] = useState<Website[]>([]);
    const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(() => {
        const cached = localStorage.getItem('cachedWebsite');
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(true);

    const fetchWebsites = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            if (websites.length === 0 && !selectedWebsite) setLoading(true);

            const response = await fetch(`${API_BASE}/api/websites`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                const fetchedWebsites = (data.websites || []).map((site: any) => ({
                    ...site,
                    name: site.name || site.domain
                }));
                setWebsites(fetchedWebsites);

                // Restore selection if not already set, or validate current selection
                const savedId = localStorage.getItem('selectedWebsiteId');

                if (selectedWebsite) {
                    // Update the currently selected object with fresh data
                    const updated = fetchedWebsites.find((w: Website) => w.id === selectedWebsite.id);
                    if (updated) {
                        setSelectedWebsite(updated);
                        localStorage.setItem('cachedWebsite', JSON.stringify(updated));
                    }
                } else if (savedId) {
                    const found = fetchedWebsites.find((w: Website) => w.id === savedId || w.publicId === savedId);
                    if (found) {
                        setSelectedWebsite(found);
                        localStorage.setItem('cachedWebsite', JSON.stringify(found));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching websites:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchWebsites();
        } else {
            setWebsites([]);
            setSelectedWebsite(null);
            localStorage.removeItem('cachedWebsite');
        }
    }, [token]);

    const handleWebsiteSelect = (website: Website | null) => {
        setSelectedWebsite(website);
        if (website) {
            localStorage.setItem('selectedWebsiteId', website.id);
            localStorage.setItem('cachedWebsite', JSON.stringify(website));
        } else {
            localStorage.removeItem('selectedWebsiteId');
            localStorage.removeItem('cachedWebsite');
        }
    };

    return (
        <WebsiteContext.Provider value={{ websites, selectedWebsite, handleWebsiteSelect, loading, refreshWebsites: fetchWebsites }}>
            {children}
        </WebsiteContext.Provider>
    );
};
