import { useEffect, useRef, useState } from "react";
import Chat from "./Chat";
import Navbar from "./Navbar";
import { useTheme } from "../contexts/ThemeContext";

const Layout = ({ children, className, showChat = true, allowChat = true }: { children: React.ReactNode, className?: string, showChat?: boolean, allowChat?: boolean }) => {
    const isMobile = window.innerWidth < 768;
    const [chatEnabled, setShowChat] = useState(showChat);
    const { mode, setMode } = useTheme();

    const [chatWidthPercent, setChatWidthPercent] = useState<number>(localStorage.getItem('chatWidthPercent') ? parseInt(localStorage.getItem('chatWidthPercent') || '25') : 25);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chatRef = useRef<HTMLDivElement | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const MIN_CHAT_WIDTH_PX = 300;

    const startResizing = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || !chatRef.current) return;
        isDraggingRef.current = true;
        setIsDragging(true);
        event.preventDefault();

        const onMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || !containerRef.current || !chatRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const chatRect = chatRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;

            let newChatWidthPx = chatRect.right - e.clientX;
            if (newChatWidthPx < MIN_CHAT_WIDTH_PX) newChatWidthPx = MIN_CHAT_WIDTH_PX;
            if (newChatWidthPx > containerWidth - 200) {
                newChatWidthPx = Math.max(containerWidth - 200, MIN_CHAT_WIDTH_PX);
            }
            const percent = (newChatWidthPx / containerWidth) * 100;
            setChatWidthPercent(percent);
            localStorage.setItem('chatWidthPercent', percent.toString());
        };

        const onMouseUp = () => {
            isDraggingRef.current = false;
            setIsDragging(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    useEffect(() => {
        if (!allowChat || isMobile) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.metaKey && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                event.stopPropagation();
                setShowChat((prev) => !prev);
            }

            if (event.metaKey && event.key.toLowerCase() === 'b') {
                event.preventDefault();
                event.stopPropagation();
                setMode(mode === 'light' ? 'dark' : 'light');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [allowChat, isMobile]);

    return (
        <div className="bg-linear-to-tr from-background to-background/50 flex flex-col w-full h-screen p-4 gap-4 overflow-hidden">
            <Navbar />

            <div ref={containerRef} className="relative flex flex-1 h-0 gap-3">
                <div
                    className={`bg-background rounded-md border border-border p-5 h-full overflow-y-scroll scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-foreground scrollbar-track-transparent ${className} transition-all duration-300 ease-in-out`}
                    style={{
                        flexBasis: chatEnabled && !isMobile ? `${100 - chatWidthPercent}%` : '100%',
                        transition: isDragging ? 'none' : 'flex-basis 0.3s ease',
                    }}
                >
                    {children}
                </div>

                {chatEnabled && !isMobile && (
                    <div
                        id="chat"
                        className="hidden md:flex relative bg-foreground border border-border rounded-md h-full overflow-hidden flex-col p-3"
                        ref={chatRef}
                        style={{
                            flexBasis: `${chatWidthPercent}%`,
                            minWidth: MIN_CHAT_WIDTH_PX,
                            transition: isDragging ? 'none' : 'flex-basis 0.3s ease',
                        }}
                    >
                        <div
                            onMouseDown={startResizing}
                            className={`absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-linear-to-r hover:from-primary/10 to-primary/0 ${isDragging && 'from-primary/10'}`}
                            title="Drag to resize"
                            aria-label="Drag to resize chat"
                        />
                        <Chat />
                    </div>
                )}

                {allowChat && !isMobile && (
                    <button
                        title={`${chatEnabled ? 'Hide' : 'Show'} chat (⌘K)`}
                        aria-label={`${chatEnabled ? 'Hide' : 'Show'} chat (Command + K)`}
                        onClick={() => setShowChat(!chatEnabled)}
                        className={`cursor-pointer absolute rounded-md h-8.5 w-8.5 flex items-center justify-center duration-200 transition-all ${chatEnabled ? 'hover:bg-background right-4 top-[7.5px]' : '-top-[50px] right-[198px] bg-border hover:brightness-80'}`}
                    >
                        <SidebarIcon />
                    </button>
                )}
            </div>
        </div>
    )
}

const SidebarIcon = () => {
    return (
        <svg className="text-copy" xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /></svg>
    )
}

export default Layout;