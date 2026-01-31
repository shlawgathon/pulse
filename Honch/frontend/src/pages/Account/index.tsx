import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faMoon, faSun, faEdit } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import MD5 from "crypto-js/md5";
import { useTheme } from "../../contexts/ThemeContext";
import { useEffect, useState, useRef } from "react";
import { API_BASE } from "../../utils/config";
import Modal from "../../components/Modal";
import { GravatarQuickEditorCore } from '@gravatar-com/quick-editor';
import Contact from "./components/Contact";
import Websites from "./components/Websites";
import toast from "react-hot-toast";

const Account = () => {
    const { page } = useParams();
    const { user, token, logout } = useAuth();
    const { mode, setMode } = useTheme();
    const [usageData, setUsageData] = useState<any>(null);
    const [displayName, setDisplayName] = useState('');
    const [traitsInput, setTraitsInput] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const quickEditorRef = useRef<GravatarQuickEditorCore | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsageData = async () => {
            try {
                const response = await fetch(API_BASE + '/api/ai/usage', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                setUsageData(data.success ? data.websites : []);
            } catch (error) {
                console.error('Error fetching usage data:', error);
            }
        };
        
        if (token) {
            fetchUsageData();
        }
    }, [token]);

    useEffect(() => {
        const loadPreferences = async () => {
            if (!token) return;
            try {
                const res = await fetch(API_BASE + '/api/user/preferences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.preferences) {
                    setDisplayName(data.preferences.displayName || '');
                    const traits = Array.isArray(data.preferences.traits) ? data.preferences.traits : [];
                    setTraitsInput(traits.join(', '));
                    setNotes(data.preferences.notes || '');
                }
            } catch (e) {
                console.error('Failed to load preferences', e);
            }
        };
        loadPreferences();
    }, [token]);

    useEffect(() => {
        if (user?.email && !quickEditorRef.current) {
            quickEditorRef.current = new GravatarQuickEditorCore({
                email: user.email,
                scope: ['avatars', 'about'],
                onProfileUpdated: () => {
                    console.log('Gravatar profile updated!');
                    const avatarImg = document.querySelector('img[alt="Avatar"]') as HTMLImageElement;
                    if (avatarImg) {
                        const currentSrc = avatarImg.src;
                        const separator = currentSrc.includes('?') ? '&' : '?';
                        avatarImg.src = `${currentSrc}${separator}t=${Date.now()}`;
                    }
                },
                onOpened: () => {
                    console.log('Gravatar editor opened!');
                },
            });
        }

        return () => {
            if (quickEditorRef.current) {
                quickEditorRef.current = null;
            }
        };
    }, [user?.email]);

    const md5Email = user?.email ? MD5(user.email.toLowerCase().trim()).toString() : '';

    const deleteAccount = async () => {
        const response = await fetch(`${API_BASE}/api/auth/delete`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (data.success) {
            logout();
            navigate('/');
        }
    }

    const handleEditProfile = () => {
        if (quickEditorRef.current) {
            quickEditorRef.current.open();
        }
    }

    const savePreferences = async () => {
        setSaving(true);

        await toast.promise(fetch(API_BASE + '/api/user/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                displayName,
                traits: traitsInput,
                notes,
            })
        }), {
            loading: 'Saving preferences...',
            success: 'Preferences saved',
            error: 'Failed to save preferences'
        }).finally(() => {
            setSaving(false);
        });
    }

    return (
        <>
            <Modal show={showDeleteAccountModal} setShow={setShowDeleteAccountModal}>
                <div className="bg-foreground border border-border rounded-md p-4 max-w-md">
                    <h2 className="text-xl font-semibold mb-3">Are you absolutely sure?</h2>
                    <p className="text-xs text-copy-light">This will permanently delete your account and all associated data. This action cannot be undone.</p>
                    <div className="flex flex-row items-center justify-end gap-2 mt-5">
                        <button className="bg-gradient-to-tr to-background/40 from-background/35 border border-border text-sm text-copy-light w-max rounded-md px-8 py-1.5 hover:bg-background/50 hover:text-copy transition duration-200 ease-in-out cursor-pointer" onClick={() => setShowDeleteAccountModal(false)}>Cancel</button>
                        <button className="bg-gradient-to-tr to-error/40 from-error/35 border border-error/30 text-sm text-error-content/80 w-max rounded-md px-8 py-1.5 hover:bg-error/50 hover:text-error-content/90 transition duration-200 ease-in-out cursor-pointer" onClick={deleteAccount}>Delete Account</button>
                    </div>
                </div>
            </Modal>
            <div className={'bg-gradient-to-tl from-foreground to-background flex flex-col min-h-screen w-full'}>
                <div className="flex flex-col min-w-6xl mx-auto h-full my-5">
                    <div className="flex flex-row items-center justify-between">
                        <NavLink to='/' className={'w-max text-sm flex items-center gap-2 rounded-full px-5 py-1.5 text-copy-light bg-foreground/10 border border-border hover:bg-foreground hover:text-copy transition duration-200'}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            <span>Back to Home</span>
                        </NavLink>

                        <div className="flex flex-row items-center gap-3">
                            <div className="flex flex-row w-max h-max">
                                <button
                                    aria-label="Light Theme"
                                    className={`cursor-pointer rounded-l-md px-2 py-1 text-sm font-medium transition-colors duration-150
                                        ${mode === 'light' ? 'bg-primary text-primary-content' : 'bg-border text-copy'}`}
                                    onClick={() => setMode('light')}
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faSun} />
                                </button>
                                <button
                                    aria-label="Dark Theme"
                                    className={`cursor-pointer rounded-r-md px-2 text-sm font-medium transition-colors duration-150
                                        ${mode === 'dark' ? 'bg-primary text-primary-content' : 'bg-border text-copy'}`}
                                    onClick={() => setMode('dark')}
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faMoon} />
                                </button>
                            </div>

                            <button className="flex flex-row items-center gap-2 border border-border bg-foreground hover:cursor-pointer hover:bg-border rounded-md px-3 py-1.5 duration-200 ease-in-out" onClick={logout}>
                                <span className="text-sm font-medium">Sign out</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-10">
                        <div className="flex flex-col items-center col-span-1">
                            <div className="relative group">
                                <img src={`https://www.gravatar.com/avatar/${md5Email}?d=retro`} alt="Avatar" className="w-40 h-40 rounded-md" />
                                <button 
                                    onClick={handleEditProfile}
                                    className="cursor-pointer absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md flex items-center justify-center"
                                    title="Edit Gravatar Profile"
                                >
                                    <FontAwesomeIcon icon={faEdit} className="text-white text-xl" />
                                </button>
                            </div>
                            <h1 className="text-2xl font-bold mt-3">{user?.name}</h1>
                            <p className="text-sm text-copy-light mt-1">{user?.email}</p>

                            <div className="flex flex-col py-5 px-4 w-full bg-foreground rounded-md mt-10 border border-border">
                                <h2 className="text-sm font-semibold tracking-wide">Keyboard Shortcuts</h2>
                                
                                <div className="flex flex-row justify-between items-center mt-5">
                                    <span className="text-sm">Chat Sidebar</span>
                                    <div className="flex flex-row gap-1 text-sm">
                                        <div className="bg-border rounded-md py-1 px-1.5">⌘</div>
                                        <div className="bg-border rounded-md py-1 px-2">K</div>
                                    </div>
                                </div>

                                <div className="flex flex-row justify-between items-center mt-3">
                                    <span className="text-sm">Toggle Theme</span>
                                    <div className="flex flex-row gap-1 text-sm">
                                        <div className="bg-border rounded-md py-1 px-1.5">⌘</div>
                                        <div className="bg-border rounded-md py-1 px-2">B</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col col-span-3">
                                <div className="flex flex-row items-center gap-2 bg-foreground border border-border rounded-md p-2 w-max">
                                    <NavLink end to={'/account'} className={({ isActive }) => isActive ? 'drop-shadow-md text-xs font-semibold tracking-wide rounded-md bg-border px-3 py-1.5' : 'text-copy-light hover:text-copy hover:bg-border/50 text-xs font-semibold tracking-wide rounded-md px-3 py-1.5 duration-200 ease-in-out'}>Account</NavLink>
                                    <NavLink to={'/account/websites'} className={({ isActive }) => isActive ? 'drop-shadow-md text-xs font-semibold tracking-wide rounded-md bg-border px-3 py-1.5' : 'text-copy-light hover:text-copy hover:bg-border/50 text-xs font-semibold tracking-wide rounded-md px-3 py-1.5 duration-200 ease-in-out'}>Websites</NavLink>
                                    <NavLink to={'/account/usage'} className={({ isActive }) => isActive ? 'drop-shadow-md text-xs font-semibold tracking-wide rounded-md bg-border px-3 py-1.5' : 'text-copy-light hover:text-copy hover:bg-border/50 text-xs font-semibold tracking-wide rounded-md px-3 py-1.5 duration-200 ease-in-out'}>AI Usage</NavLink>
                                    <NavLink to={'/account/billing'} className={({ isActive }) => isActive ? 'drop-shadow-md text-xs font-semibold tracking-wide rounded-md bg-border px-3 py-1.5' : 'text-copy-light hover:text-copy hover:bg-border/50 text-xs font-semibold tracking-wide rounded-md px-3 py-1.5 duration-200 ease-in-out'}>Billing</NavLink>
                                    <NavLink to={'/account/contact'} className={({ isActive }) => isActive ? 'drop-shadow-md text-xs font-semibold tracking-wide rounded-md bg-border px-3 py-1.5' : 'text-copy-light hover:text-copy hover:bg-border/50 text-xs font-semibold tracking-wide rounded-md px-3 py-1.5 duration-200 ease-in-out'}>Contact Us</NavLink>
                                </div>

                                {!page && (
                                    <div className="mt-7">
                                        <h2 className="text-2xl tracking-wide font-semibold mb-3">Customize Honcho</h2>
                                    <div className="flex flex-col gap-2 mb-5">
                                            <span className="text-sm text-copy-light">What should Honcho call you?</span>
                                            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} type="text" placeholder="Enter your name" className="placeholder:text-copy/50 text-copy border border-border outline-none focus:border-primary-light/50 transition duration-200 ease-in-out text-sm rounded-md px-3 py-2" />

                                            <span className="text-sm text-copy-light mt-4">What traits should Honcho have?</span>
                                            <input value={traitsInput} onChange={(e) => setTraitsInput(e.target.value)} type="text" placeholder="e.g. friendly, concise, analytical" className="placeholder:text-copy/50 text-copy border border-border outline-none focus:border-primary-light/50 transition duration-200 ease-in-out text-sm rounded-md px-3 py-2" />

                                            <span className="text-sm text-copy-light mt-4">What else should Honcho know?</span>
                                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interests, values, or preferences to keep in mind" rows={4} className="placeholder:text-copy/50 text-copy border border-border outline-none focus:border-primary-light/50 transition duration-200 ease-in-out text-sm rounded-md px-3 py-2" />

                                            <button disabled={saving} onClick={savePreferences} className="mt-4 bg-gradient-to-tr to-primary-light/40 from-primary-dark/35 border border-primary-light/30 text-sm text-primary-content/80 w-max rounded-md px-8 py-1.5 hover:bg-primary-light/50 hover:text-primary-content/90 transition duration-200 ease-in-out cursor-pointer">Save Preferences</button>
                                        </div>

                                        <h2 className="text-xl font-semibold mt-8 mb-3">Danger Zone</h2>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-sm text-copy-light">Permanently delete your account and all associated data.</span>
                                            <button onClick={() => setShowDeleteAccountModal(true)} className="bg-gradient-to-tr to-error/40 from-error/35 border border-error/30 text-sm text-error-content/80 w-max rounded-md px-8 py-1.5 hover:bg-error/50 hover:text-error-content/90 transition duration-200 ease-in-out cursor-pointer">Delete Account</button>
                                        </div>
                                    </div>
                                )}

                                {page === 'websites' && (
                                    <Websites />
                                )}

                                {page === 'usage' && (
                                    <div className="mt-7">
                                        <h2 className="text-2xl tracking-wide font-semibold mb-3">AI Usage</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {usageData.map((website: any) => (
                                                <UsageCard key={website.websiteId} website={website} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {page === 'billing' && (
                                    <div className="mt-7">
                                        <h2 className="text-2xl tracking-wide font-semibold mb-3">Billing</h2>
                                    </div>
                                )}

                                {page === 'contact' && (
                                    <Contact />
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
};

const UsageCard = ({ website }: { website: any }) => {
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const getUsagePercentage = (usage: number, limit: number) => {
        if (limit === -1) return 0;
        return Math.min((usage / limit) * 100, 100);
    };

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return 'text-error';
        if (percentage >= 70) return 'text-warning';
        return 'text-copy';
    };

    const isUnlimited = (limit: number) => limit === -1;

    return (
        <div className="bg-foreground border border-border rounded-md p-4">
            <div className="flex flex-row items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-copy">{website.websiteName}</h3>
                    <p className="text-xs text-copy-lighter">{website.websiteDomain}</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider ${
                    website.plan === 'enterprise' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-border text-copy-light'
                }`}>
                    {website.plan}
                </span>
            </div>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-copy-light uppercase font-semibold tracking-wider">
                            Daily Queries
                        </span>
                        <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(website.usage.dailyQueries, website.limits.dailyQueries))}`}>
                            {website.usage.dailyQueries}{isUnlimited(website.limits.dailyQueries) ? '' : ` / ${website.limits.dailyQueries}`}
                        </span>
                    </div>
                    {!isUnlimited(website.limits.dailyQueries) && (
                        <div className="w-full bg-border rounded-full h-1.5">
                            <div 
                                className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${getUsagePercentage(website.usage.dailyQueries, website.limits.dailyQueries)}%` }}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-copy-light uppercase font-semibold tracking-wider">
                            Monthly Queries
                        </span>
                        <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(website.usage.monthlyQueries, website.limits.monthlyQueries))}`}>
                            {website.usage.monthlyQueries}{isUnlimited(website.limits.monthlyQueries) ? '' : ` / ${website.limits.monthlyQueries}`}
                        </span>
                    </div>
                    {!isUnlimited(website.limits.monthlyQueries) && (
                        <div className="w-full bg-border rounded-full h-1.5">
                            <div 
                                className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${getUsagePercentage(website.usage.monthlyQueries, website.limits.monthlyQueries)}%` }}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-copy-light uppercase font-semibold tracking-wider">
                            Daily Tokens
                        </span>
                        <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(website.usage.dailyTokens, website.limits.dailyTokens))}`}>
                            {formatNumber(website.usage.dailyTokens)}{isUnlimited(website.limits.dailyTokens) ? '' : ` / ${formatNumber(website.limits.dailyTokens)}`}
                        </span>
                    </div>
                    {!isUnlimited(website.limits.dailyTokens) && (
                        <div className="w-full bg-border rounded-full h-1.5">
                            <div 
                                className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${getUsagePercentage(website.usage.dailyTokens, website.limits.dailyTokens)}%` }}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-copy-light uppercase font-semibold tracking-wider">
                            Monthly Tokens
                        </span>
                        <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(website.usage.monthlyTokens, website.limits.monthlyTokens))}`}>
                            {formatNumber(website.usage.monthlyTokens)}{isUnlimited(website.limits.monthlyTokens) ? '' : ` / ${formatNumber(website.limits.monthlyTokens)}`}
                        </span>
                    </div>
                    {!isUnlimited(website.limits.monthlyTokens) && (
                        <div className="w-full bg-border rounded-full h-1.5">
                            <div 
                                className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${getUsagePercentage(website.usage.monthlyTokens, website.limits.monthlyTokens)}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Account;