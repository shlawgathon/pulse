import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE } from "../../../utils/config";
import { useAuth } from "../../../contexts/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons";
import WebsiteSettingsPanel from "./WebsiteSettingsPanel";

const Websites = () => {
    const { token } = useAuth();
    const [websites, setWebsites] = useState<any[]>([]);
    const [openPublicId, setOpenPublicId] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWebsites = async () => {
            const response = await fetch(API_BASE + '/api/websites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setWebsites(Array.isArray(data.websites) ? data.websites : []);
            setLoading(false);
        }
        if (token) fetchWebsites();
    }, [token]);

    useEffect(() => {
        const open = searchParams.get('open');
        if (open) setOpenPublicId(open);
    }, [searchParams]);

    return (
        <div className="mt-7">
            <h2 className="text-2xl tracking-wide font-semibold">Website Settings</h2>
            <p className="text-sm text-copy-light mb-5">Select a website to view and manage its settings.</p>

            <div className="flex flex-col gap-3 w-5/6">
                {websites.map((website: any) => {
                    const isOpen = openPublicId === website.publicId;
                    return (
                        <div key={website.publicId || website.id} className="flex flex-col">
                            <button
                                onClick={() => setOpenPublicId(isOpen ? null : website.publicId)}
                                className={`cursor-pointer flex flex-row items-center justify-between text-sm text-copy border border-border px-4 py-3 ${isOpen ? 'bg-border/50 rounded-md rounded-b-none' : 'bg-foreground rounded-md'} hover:bg-border/50 transition duration-200 ease-in-out`}
                                aria-expanded={isOpen}
                                aria-controls={`website-settings-${website.publicId}`}
                            >
                                
                                <div className="flex flex-row items-center gap-1">
                                    <h3 className="font-semibold text-copy">{website.name}</h3>
                                    <span className="text-copy-light text-xs font-normal">({website.domain})</span>
                                </div>
                                <FontAwesomeIcon icon={faChevronUp} className={`text-copy ${isOpen ? '-rotate-180' : ''} transition duration-300 ease-in-out`}/>
                            </button>
                            <Collapsible id={`website-settings-${website.publicId}`} isOpen={isOpen}>
                                <WebsiteSettingsPanel publicId={website.publicId} />
                            </Collapsible>
                        </div>
                    );
                })}

                {websites.length === 0 && !loading && (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-copy-light">No websites found</p>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col gap-2">
                        <div className="rounded-md w-full bg-foreground border border-border animate-pulse h-40 py-4 px-5"/>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Websites;

const Collapsible = (
	{ isOpen, children, id }: { isOpen: boolean; children: React.ReactNode; id?: string }
) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const firstRenderRef = useRef(true);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		// Ensure baseline styles
		el.style.overflow = 'hidden';
		el.style.willChange = 'max-height, opacity';
		el.style.transition = 'max-height 300ms ease-in-out, opacity 300ms ease-in-out';
		el.style.display = 'block';

		// On first render, set the correct end state without animating to avoid flashes
		if (firstRenderRef.current) {
			firstRenderRef.current = false;
			if (isOpen) {
				el.style.maxHeight = 'none';
				el.style.opacity = '1';
			} else {
				el.style.maxHeight = '0px';
				el.style.opacity = '0';
			}
			return;
		}

		if (isOpen) {
			// Expand with animation
			const target = el.scrollHeight;
			if (el.style.maxHeight === '' || el.style.maxHeight === '0px') {
				el.style.maxHeight = '0px';
				el.style.opacity = '0';
			}
			requestAnimationFrame(() => {
				el.style.maxHeight = target + 'px';
				el.style.opacity = '1';
			});
			const onEnd = () => {
				el.style.maxHeight = 'none';
				el.removeEventListener('transitionend', onEnd);
			};
			el.addEventListener('transitionend', onEnd);
		} else {
			// Collapse with animation
			const current = el.scrollHeight;
			el.style.maxHeight = current + 'px';
			el.style.opacity = '1';
			requestAnimationFrame(() => {
				el.style.maxHeight = '0px';
				el.style.opacity = '0';
			});
		}
	}, [isOpen]);

	return (
		<div id={id} ref={containerRef} aria-hidden={!isOpen}>
			{children}
		</div>
	);
};