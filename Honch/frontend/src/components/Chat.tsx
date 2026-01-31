import { faArrowUp, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { API_BASE } from "../utils/config";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

const Chat = () => {
    const { user, token } = useAuth();
    const [chatInput, setChatInput] = useState('');
    const [caretIndex, setCaretIndex] = useState<number>(0);
    const [website, setWebsite] = useState<any>(null);
    const [websites, setWebsites] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const currentLocation = (window.location.pathname + window.location.search).replace(/^\//, "");

    useEffect(() => {
        const chatHistory = localStorage.getItem('chatHistory-' + currentLocation.split('/')[1]);
        if (chatHistory) {
            setChatHistory(JSON.parse(chatHistory) as any[]);
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated) {
            localStorage.setItem('chatHistory-' + currentLocation.split('/')[1], JSON.stringify(chatHistory));
        }
    }, [chatHistory, hydrated, currentLocation.split('/')[1]]);

    useEffect(() => {
        if (currentLocation.includes('site/')) {
            setChatInput('');
            fetchWebsite(currentLocation.split('/')[1]);
            fetchEvents(currentLocation.split('/')[1]);
        } else {
            fetchWebsites();
        }
    }, [currentLocation]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [chatInput]);

    useEffect(() => {
        // Keep caretIndex within bounds when text changes
        if (caretIndex > chatInput.length) {
            setCaretIndex(chatInput.length);
        }
    }, [chatInput, caretIndex]);

    const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    };

    useEffect(() => {
        if (hydrated && chatHistory.length > 0) {
            scrollToBottom('auto');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        scrollToBottom('smooth');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatHistory]);

    // Cleanup websocket on unmount to avoid dangling connections
    useEffect(() => {
        return () => {
            try { wsRef.current?.close(); } catch { }
            wsRef.current = null;
        };
    }, []);

    const fetchWebsite = async (publicId: string) => {
        const response = await fetch(`${API_BASE}/api/websites/${publicId}/stats`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();
        setWebsite(data.stats);
    };

    const fetchWebsites = async () => {
        const response = await fetch(`${API_BASE}/api/websites`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();
        setWebsites(data.websites);
    };

    useEffect(() => {
        if (website === null) {
            if (chatInput.includes('@')) {
                const website = websites.find((website: any) => website.domain === chatInput.split('@')[1]);
                if (website) {
                    fetchWebsite(website.publicId).then(async (data: any) => {
                        setWebsite(await data.stats);
                    });
                }
            }
        } else if (!chatInput.includes('@') && website !== null && !currentLocation.includes('site/')) {
            setWebsite(null);
        }
    }, [website, websites, chatInput, currentLocation]);

    const fetchEvents = async (publicId: string) => {
        const response = await fetch(`${API_BASE}/api/analytics/${publicId}/events`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();
        const flattenedEvents = Array.isArray(data.events) ? data.events.flat() : [];
        const events = flattenedEvents.map((event: { eventName: string }) => event.eventName)
        events.push('visitors', 'visitor');
        setEvents(events);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loading) { return }
        if (chatInput.trim() === '') { return }

        setLoading(true);
        const question = chatInput;
        setChatInput('');
        setChatHistory(prev => [...prev, {
            question: question,
            answer: null,
            loading: true,
            timestamp: new Date().toISOString(),
            progress: { agents: {}, steps: [] as string[] }
        }]);

        try {
            const sessionId = crypto.randomUUID();
            const wsProtocol = API_BASE.startsWith('https') ? 'wss' : API_BASE.startsWith('http') ? (window.location.protocol === 'https:' ? 'wss' : 'ws') : 'ws';
            const baseNoHttp = API_BASE.replace(/^https?:\/\//, '');
            const wsUrl = `${wsProtocol}://${baseNoHttp}/ws?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token || '')}`;

            try {
                wsRef.current = new WebSocket(wsUrl);
                wsRef.current.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === 'agent') {
                            setChatHistory(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                const agents = { ...(last.progress?.agents || {}) };
                                agents[msg.name] = msg.status;
                                const steps: string[] = Array.isArray(last.progress?.steps) ? [...last.progress.steps] : [];
                                if (msg.status === 'start') {
                                    if (msg.name === 'PlanningAgent') {
                                        if (!steps.includes('Planning steps...')) steps.push('Planning the next steps');
                                    } else if (msg.name === 'ValidationAgent') {
                                        if (!steps.includes('Querying database...')) steps.push('Generating insights');
                                    }
                                } else if (msg.status === 'complete') {
                                    if (msg.name === 'PlanningAgent') {
                                        const intent: string | undefined = msg?.data?.intent;
                                        if (intent && !steps.includes(intent)) steps.push(intent);
                                    }
                                } else if (msg.status === 'error') {
                                    const errText = `${msg.name} error`;
                                    if (!steps.includes(errText)) steps.push(errText);
                                }
                                updated[updated.length - 1] = { ...last, progress: { agents, steps } };
                                return updated;
                            });
                        } else if (msg.type === 'error') {
                            setChatHistory(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                updated[updated.length - 1] = { ...last, error: msg.error, loading: false };
                                return updated;
                            });
                        } else if (msg.type === 'final') {
                            try { wsRef.current?.close(); } catch { }
                        }
                    } catch { }
                };
                wsRef.current.onclose = () => {
                    wsRef.current = null;
                };
            } catch { }

            const historyForBackend = chatHistory
                .filter(chat => chat.answer)
                .slice(-10)
                .flatMap(chat => [
                    { role: 'user', content: chat.question },
                    { role: 'assistant', content: chat.answer }
                ]);

            const res = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    websiteId: website?.privateId,
                    question: question,
                    chatHistory: historyForBackend,
                    sessionId
                }),
            });

            const data = await res.json();

            if (data.success) {
                setChatHistory(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        answer: data.answer,
                        loading: false,
                        metadata: data.metadata,
                        usage: data.usage,
                        limits: data.limits
                    };
                    return updated;
                });
            } else {
                setChatHistory(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        answer: null,
                        loading: false,
                        error: data.error,
                        usage: data.usage,
                        limits: data.limits
                    };
                    return updated;
                });
            }
        } catch (err) {
            setChatHistory(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    answer: null,
                    loading: false,
                    error: "Failed to get answer",
                };
                return updated;
            });
        } finally {
            setLoading(false);
        }
    };

    const autocompleteEventAtCursor = (): boolean => {
        const textarea = textareaRef.current;
        if (!textarea) return false;
        const input = chatInput;
        const cursorPos = textarea.selectionStart ?? 0;
        const isWhitespace = (ch: string) => /\s/.test(ch);

        let start = cursorPos;
        while (start > 0 && !isWhitespace(input[start - 1])) start--;

        let end = cursorPos;
        while (end < input.length && !isWhitespace(input[end])) end++;

        const prefix = input.slice(start, cursorPos);
        if (!prefix) return false;

        const candidates = [...events, ...websites.map((w: any) => '@' + (w?.domain ?? ''))]
            .filter((name: any): name is string => typeof name === 'string' && name.length > 0)
            .filter((name: string) => name.toLowerCase().startsWith(prefix.toLowerCase()))
            .sort((a: string, b: string) => a.localeCompare(b));

        if (candidates.length === 0) return false;

        const suggestion = candidates[0];
        const currentToken = input.slice(start, end);
        if (currentToken === suggestion) return false;

        const nextValue = input.slice(0, start) + suggestion + input.slice(end);
        const newCaret = start + suggestion.length;
        setChatInput(nextValue);
        requestAnimationFrame(() => {
            try {
                textarea.selectionStart = newCaret;
                textarea.selectionEnd = newCaret;
            } catch { }
        });
        return true;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            const didAutocomplete = autocompleteEventAtCursor();
            if (didAutocomplete) {
                e.preventDefault();
                return;
            }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e as any);
        }
        // update caret after key handling
        requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (textarea) setCaretIndex(textarea.selectionStart ?? 0);
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setChatInput(e.target.value);
        setCaretIndex(e.target.selectionStart ?? e.target.value.length);
    };

    const updateCaretIndexFromRef = () => {
        const textarea = textareaRef.current;
        if (textarea) setCaretIndex(textarea.selectionStart ?? 0);
    };

    const getEndOfInputSuggestionTail = (): string => {
        // Only show preview when caret is at end of input
        if (caretIndex !== chatInput.length) return '';
        const input = chatInput;
        if (!input) return '';
        // find start of last token
        let start = input.length;
        while (start > 0 && !/\s/.test(input[start - 1])) start--;
        const prefix = input.slice(start);
        if (!prefix) return '';
        const candidates = [...events, ...websites.map((w: any) => '@' + (w?.domain ?? ''))]
            .filter((name: any): name is string => typeof name === 'string' && name.length > 0)
            .filter((name: string) => name.toLowerCase().startsWith(prefix.toLowerCase()))
            .sort((a: string, b: string) => a.localeCompare(b));
        if (candidates.length === 0) return '';
        const suggestion = candidates[0];
        if (suggestion.toLowerCase() === prefix.toLowerCase()) return '';
        return suggestion.slice(prefix.length);
    };

    return (
        <>
            <div className="flex justify-between items-center mb-3">
                <button
                    onClick={() => setChatHistory([])}
                    className={`cursor-pointer text-copy-lighter hover:text-copy px-1 duration-200 transition`}
                >
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            </div>

            <div className="flex-1 overflow-x-clip overflow-y-auto mb-2 scrollbar-thin scrollbar-thumb-background scrollbar-track-transparent">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col justify-center h-full opacity-0 chat-fade-in">
                        <h1 className="text-primary text-3xl font-semibold">Hello, {user?.name}</h1>
                        <h2 className="text-3xl mb-4">How can I help you?</h2>

                        <span className="mb-2 text-copy-lighter">Get started with a prompt</span>
                        <SuggestionButton prompt="How many visitors did I have today?" targetInput={setChatInput} />
                        <SuggestionButton prompt="What are my top countries?" targetInput={setChatInput} />
                        <SuggestionButton prompt="At what hour are most of my visitors online?" targetInput={setChatInput} />
                    </div>
                )}
                {chatHistory.map((chat, index) => (
                    <div key={index} className="mb-4 opacity-0 chat-fade-in">
                        <div className="justify-self-end text-sm bg-gradient-to-tr to-primary-light/40 from-primary-dark/35 border border-primary-light/30 rounded-xl px-4 py-2 mb-2">
                            {chat.question}
                        </div>
                        {chat.loading ? (
                            <div>
                                {Array.isArray(chat.progress?.steps) && chat.progress.steps.length > 0 ? (
                                    <>
                                        <div className='flex space-x-1.5 pt-1 items-start justify-start mb-2'>
                                            <LoadingSpinner />
                                            <span className="text-copy-lighter text-sm chat-fade-in">
                                                {chat.progress.steps[chat.progress.steps.length - 1].split(/(\s)/g).map((char: string, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className={`inline-block animate-pulse [animation-delay:calc(-0.3s+var(--i)*120ms)]${char === ' ' ? ' whitespace-pre' : ''}`}
                                                        style={{ ['--i' as any]: idx }}
                                                    >
                                                        {char === ' ' ? '\u00A0' : char}
                                                    </span>
                                                ))}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className='flex space-x-1.5 pt-1 items-center justify-start mb-1'>
                                        <LoadingSpinner />
                                        <span className="text-copy-lighter text-sm">
                                            {"Thinking...".split("").map((char, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-block animate-pulse [animation-delay:calc(-0.3s+var(--i)*120ms)]"
                                                    style={{ ['--i' as any]: idx }}
                                                >
                                                    {char}
                                                </span>
                                            ))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : chat.answer ? (
                            <div>
                                <div className="text-sm text-copy pb-2 pt-1 prose prose-sm max-w-none">
                                    <ReactMarkdown
                                        rehypePlugins={[rehypeSanitize]}
                                        components={{
                                            p: ({ children }) => (
                                                <p className="mb-3 last:mb-0 leading-relaxed text-copy">{children}</p>
                                            ),

                                            ul: ({ children }) => (
                                                <ul className="list-none mb-3 pl-0">{children}</ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="list-none mb-3 pl-0 counter-reset-[item]">{children}</ol>
                                            ),
                                            li: ({ children }) => (
                                                <li className="flex items-start gap-1">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                                                        •
                                                    </span>
                                                    <span className="text-copy leading-relaxed">{children}</span>
                                                </li>
                                            ),

                                            h1: ({ children }) => (
                                                <h1 className="text-lg font-bold text-copy mb-3 mt-4 first:mt-0 border-b border-border pb-1">
                                                    {children}
                                                </h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="text-base font-bold text-copy mb-2 mt-4 first:mt-0 flex items-center gap-2">
                                                    {children}
                                                </h2>
                                            ),
                                            h3: ({ children }) => (
                                                <h3 className="text-sm font-semibold text-copy mb-2 mt-3 first:mt-0">
                                                    {children}
                                                </h3>
                                            ),
                                            h4: ({ children }) => (
                                                <h4 className="text-sm font-medium text-copy-lighter mb-2 mt-3 first:mt-0">
                                                    {children}
                                                </h4>
                                            ),

                                            blockquote: ({ children }) => (
                                                <blockquote className="border-l-3 border-primary bg-primary/5 pl-4 pr-3 py-2 my-3 rounded-r-md">
                                                    <div className="text-copy font-medium text-sm leading-relaxed">{children}</div>
                                                </blockquote>
                                            ),

                                            strong: ({ children }) => (
                                                <strong className="font-bold text-copy">{children}</strong>
                                            ),

                                            em: ({ children }) => (
                                                <em className="italic text-copy font-medium">{children}</em>
                                            ),

                                            a: ({ children, href }) => (
                                                <a
                                                    href={href}
                                                    className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {children}
                                                </a>
                                            ),

                                            hr: () => (
                                                <hr className="border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />
                                            )
                                        }}
                                    >
                                        {chat.answer}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ) : chat.error ? (
                            <div className="text-xs text-red-500">{chat.error}</div>
                        ) : null}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="relative w-full mt-auto">
                <div className="relative">
                    <div
                        aria-hidden
                        className="z-10 absolute inset-0 rounded-md px-4 py-3 pr-12 text-xs whitespace-pre-wrap break-words text-transparent pointer-events-none overflow-hidden"
                    >
                        {chatInput === '' && (
                            <span className="text-copy-lighter">Ask Honcho</span>
                        )}
                        <span>
                            {chatInput.split(' ').map((word, index, arr) => (
                                <span key={index} className={`${(events.includes(word) || websites.some((w: any) => '@' + (w?.domain ?? '') === word)) ? 'text-primary-light' : 'text-copy'}`}>
                                    {word}
                                    {index < arr.length - 1 ? ' ' : ''}
                                </span>
                            ))}
                            {(() => {
                                const tail = getEndOfInputSuggestionTail();
                                if (!tail) return null;
                                return <span className="text-copy-lighter">{tail}</span>;
                            })()}
                        </span>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={chatInput}
                        onChange={handleChange}
                        onClick={updateCaretIndexFromRef}
                        onKeyUp={updateCaretIndexFromRef}
                        onKeyDown={handleKeyDown}
                        className='text-transparent caret-copy-light w-full bg-background rounded-md px-4 py-3 pr-12 text-xs focus:outline-none ring-2 ring-transparent ring-offset-3 ring-offset-foreground focus:ring-primary resize-none overflow-hidden min-h-max max-h-32'
                        placeholder="Ask Honcho"
                        disabled={loading}
                        rows={1}
                        autoComplete="off"
                    />

                    <button
                        type="submit"
                        disabled={loading || !chatInput.trim()}
                        className={'disabled:bg-primary/60 disabled:text-primary-content/60 disabled:cursor-not-allowed bg-primary text-primary-content hover:bg-primary/80 hover:text-primary-content/80 cursor-pointer absolute border-2 border-background rounded-md px-1.5 right-3 top-1.5 duration-200 transition'}
                    >
                        <FontAwesomeIcon icon={faArrowUp} />
                    </button>
                </div>
            </form>
            {currentLocation.includes('site/') ? (
                <div className="flex items-center justify-between mt-2">
                    <span className="border border-primary text-primary bg-primary/5 rounded-md px-2 py-1 text-xs w-max">
                        @ {website?.domain} {!website?.domain && <span className="text-transparent rounded bg-primary/20 animate-pulse">example.com</span>}
                    </span>
                </div>
            ) : (
                (website && (
                    <div className="flex items-center justify-between mt-2">
                        <span className="border border-primary text-primary bg-primary/5 rounded-md px-2 py-1 text-xs w-max">
                            @ {website?.domain} {!website?.domain && <span className="text-transparent rounded bg-primary/20 animate-pulse">example.com</span>}
                        </span>
                    </div>
                ))
            )}
            <small className="text-xs text-copy-lighter mt-1.5 block">
                Honcho can make mistakes, so double-check it.
            </small>
        </>
    )
};

const SuggestionButton = ({ prompt, targetInput }: { prompt: string, targetInput: React.Dispatch<React.SetStateAction<string>> }) => {
    return (
        <button type="button" onClick={() => targetInput(prompt)} className="mt-2 text-copy/70 hover:text-copy hover:bg-border duration-200 transition border border-border rounded-md text-sm w-max px-3 py-1.5 cursor-pointer">
            {prompt}
        </button>
    )
}

const LoadingSpinner = () => {
    return (
        <div className="animate-[spin_6s_linear_infinite] text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>
        </div>
    )
}

export default Chat;