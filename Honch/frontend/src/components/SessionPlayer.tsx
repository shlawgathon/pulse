import { useEffect, useRef, useState } from 'react';
import { Replayer } from 'rrweb';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlay,
    faPause,
    faExpand,
    faCompress,
    faExternalLinkAlt,
    faEllipsis,
    faFastForward
} from '@fortawesome/free-solid-svg-icons';

interface SessionPlayerProps {
    events: any[];
    width?: number;
    height?: number;
    autoPlay?: boolean;
}

export const SessionPlayer = ({ events, autoPlay = true }: SessionPlayerProps) => {
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const replayerRef = useRef<Replayer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [skipInactive, setSkipInactive] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const formatTime = (ms: number) => {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!events || events.length < 2 || !playerContainerRef.current) return;

        playerContainerRef.current.innerHTML = '';

        const replayer = new Replayer(events, {
            root: playerContainerRef.current,
            speed: speed,
            showWarning: false,
        });

        replayerRef.current = replayer;

        const meta = replayer.getMetaData();
        setTotalTime(meta.totalTime);

        replayer.on('start', () => setIsPlaying(true));
        replayer.on('pause', () => setIsPlaying(false));
        replayer.on('finish', () => {
            setIsPlaying(false);
            setCurrentTime(meta.totalTime);
        });

        const timer = setInterval(() => {
            if (replayerRef.current) {
                const time = replayerRef.current.getCurrentTime();
                setCurrentTime(time);
            }
        }, 100);

        if (autoPlay) {
            replayer.play();
        }

        const handleResize = () => {
            if (playerContainerRef.current) {
                const wrapper = playerContainerRef.current.querySelector('.replayer-wrapper') as HTMLElement;
                if (!wrapper) {
                    const iframe = playerContainerRef.current.querySelector('iframe') as HTMLElement;
                    if (iframe) {
                        iframe.style.width = '100%';
                        iframe.style.height = '100%';
                        iframe.style.border = 'none';
                    }
                    return;
                }

                wrapper.style.transform = '';
                wrapper.style.left = '';
                wrapper.style.top = '';
                wrapper.style.maxWidth = '';
                wrapper.style.maxHeight = '';

                const containerWidth = playerContainerRef.current.clientWidth;
                const containerHeight = playerContainerRef.current.clientHeight;

                const contentWidth = wrapper.offsetWidth;
                const contentHeight = wrapper.offsetHeight;

                if (contentWidth && contentHeight) {
                    const scaleX = containerWidth / contentWidth;
                    const scaleY = containerHeight / contentHeight;
                    const scale = Math.min(scaleX, scaleY);

                    wrapper.style.transformOrigin = 'top left';
                    wrapper.style.transform = `scale(${scale})`;

                    const scaledWidth = contentWidth * scale;
                    const scaledHeight = contentHeight * scale;
                    const x = (containerWidth - scaledWidth) / 2;
                    const y = (containerHeight - scaledHeight) / 2;

                    wrapper.style.position = 'absolute';
                    wrapper.style.left = `${x}px`;
                    wrapper.style.top = `${y}px`;
                }
            }
        };

        setTimeout(handleResize, 100);

        window.addEventListener('resize', handleResize);

        replayer.on('resize', handleResize);

        if (skipInactive) {
            replayer.setConfig({ skipInactive: true });
        }

        return () => {
            clearInterval(timer);
            window.removeEventListener('resize', handleResize);
            replayer.destroy();
            replayerRef.current = null;
        };
    }, [events]);

    useEffect(() => {
        if (replayerRef.current) {
            replayerRef.current.setConfig({ speed });
        }
    }, [speed]);

    useEffect(() => {
        if (replayerRef.current) {
            replayerRef.current.setConfig({ skipInactive });
        }
    }, [skipInactive]);

    const togglePlay = () => {
        if (!replayerRef.current) return;
        if (isPlaying) {
            replayerRef.current.pause();
        } else {
            if (currentTime >= totalTime - 100) {
                replayerRef.current.play(0);
            } else {
                replayerRef.current.play(currentTime);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        setCurrentTime(time);
        if (replayerRef.current) {
            replayerRef.current.pause();
            replayerRef.current.play(time);
            if (!isPlaying) {
                replayerRef.current.pause();
            }
        }
    };

    const toggleFullscreen = () => {
        const container = playerContainerRef.current?.parentElement;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.error(err));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

    interface TimelineMarker {
        type: 'click' | 'navigation' | 'input';
        time: number;
        percent: number;
    }
    const [markers, setMarkers] = useState<TimelineMarker[]>([]);

    useEffect(() => {
        if (!events || events.length < 2) return;

        const startTime = events[0].timestamp;
        const endTime = events[events.length - 1].timestamp;
        const duration = endTime - startTime;

        if (duration <= 0) return;

        const newMarkers: TimelineMarker[] = [];

        events.forEach(event => {
            // FullSnapshot (Navigation/Load) - Type 2
            if (event.type === 2) {
                newMarkers.push({
                    type: 'navigation',
                    time: event.timestamp,
                    percent: ((event.timestamp - startTime) / duration) * 100
                });
            }
            // IncrementalSnapshot (Type 3) -> MouseInteraction (Source 2) -> Click (Type 2)
            else if (event.type === 3 && event.data?.source === 2 && event.data?.type === 2) {
                newMarkers.push({
                    type: 'click',
                    time: event.timestamp,
                    percent: ((event.timestamp - startTime) / duration) * 100
                });
            }
        });

        setMarkers(newMarkers);
    }, [events]);

    return (
        <div className={`flex flex-col w-full h-full bg-background relative group ${isFullscreen ? 'p-0' : ''}`}>
            <div className="h-12 bg-foreground border-b border-border flex items-center px-4 gap-4 shrink-0 z-10 shadow-sm">
                <div className="flex-1 bg-background border border-border rounded-md h-8 flex items-center px-3 text-sm text-copy overflow-hidden relative group">
                    <span className="truncate w-full pr-8">{'page'}</span>
                    <a href={'page'} target="_blank" rel="noopener noreferrer" className="absolute right-2 text-copy-lighter hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                    </a>
                </div>

                {/* drop down, select skip idle here */}
                <div className='relative z-50'>
                    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className='cursor-pointer h-7 w-7 bg-border rounded'>
                        <FontAwesomeIcon icon={faEllipsis} />
                    </button>

                    {isDropdownOpen && (
                        <div className='text-xs absolute right-0 w-48 mt-2 bg-background border border-border rounded-md shadow-lg z-50'>
                            <ul className='py-1'>
                                <li onClick={() => setSkipInactive(!skipInactive)} className={`text-copy ${skipInactive ? 'text-primary' : ''} flex items-center gap-1 px-4 py-2 hover:bg-background/10 cursor-pointer`}>
                                    <FontAwesomeIcon icon={faFastForward} />
                                    <span>Skip Inactivity</span>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Viewport Area */}
            <div className="flex-1 relative overflow-hidden bg-red-100">
                <div
                    ref={playerContainerRef}
                    className="w-full h-full relative bg-background"
                />

                {/* Big Play Button Overlay */}
                {!isPlaying && totalTime > 0 && currentTime < totalTime && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer"
                        onClick={togglePlay}
                    >
                        <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center text-white hover:bg-primary transition-transform hover:scale-110 shadow-lg backdrop-blur-sm">
                            <FontAwesomeIcon icon={faPlay} className="ml-1 text-2xl" />
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className={`bg-foreground border-t border-border px-4 py-3 flex flex-col gap-2 transition-opacity duration-300 ${!isPlaying ? 'opacity-100' : 'group-hover:opacity-100 opacity-90'}`}>
                {/* Progress Slider */}
                <div className="relative h-1 mb-1 group/slider">
                    <div className="absolute top-0 left-0 h-full bg-border rounded-full w-full"></div>
                    <div
                        className="absolute top-0 left-0 h-full bg-primary rounded-full"
                        style={{ width: `${progress}%` }}
                    ></div>

                    {/* Event Markers */}
                    {markers.map((marker, idx) => (
                        <div
                            key={idx}
                            className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full cursor-help hover:scale-150 transition-transform z-10 group/marker
                                ${marker.type === 'click' ? 'bg-primary' : 'bg-secondary w-1 h-3 rounded-sm'}`}
                            style={{ left: `${marker.percent}%` }}
                        >
                            {/* Custom Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/marker:block z-50 whitespace-nowrap">
                                <div className="bg-foreground border border-border text-copy text-[10px] px-2 py-1 rounded shadow-xl flex flex-col items-center gap-0.5">
                                    <span className="font-semibold uppercase tracking-wider text-[9px] text-copy-light">
                                        {marker.type}
                                    </span>
                                    <span className="font-mono">
                                        {formatTime(marker.time - events[0].timestamp)}
                                    </span>
                                </div>
                                {/* Arrow */}
                                <div className="w-2 h-2 bg-border rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1 z-[-1]"></div>
                                <div className="w-2 h-2 bg-foreground rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-[3px]"></div>
                            </div>
                        </div>
                    ))}

                    <input
                        type="range"
                        min={0}
                        max={totalTime}
                        step={100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute top-[-6px] left-0 w-full h-4 opacity-0 cursor-pointer z-20"
                    />
                    {/* Hover visible thumb or highlight could be added here with CSS */}
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="cursor-pointer text-copy hover:text-primary transition-colors w-6">
                            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
                        </button>

                        <span className="text-xs font-mono text-copy-light">
                            {formatTime(currentTime)} / {formatTime(totalTime)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Speed Control */}
                        <button onClick={() => setSpeed(speed === 1 ? 2 : 1)} className="cursor-pointer text-xs font-medium py-1 px-2 bg-background rounded text-copy hover:text-primary transition-colors text-right">
                            {speed}x
                        </button>

                        <button onClick={toggleFullscreen} className="text-copy hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
