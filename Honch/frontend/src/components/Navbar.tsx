import { faSignOut, faSun, faMoon, faCog, faChevronDown, faHome } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MD5 } from "crypto-js";

import { useWebsiteContext } from '../contexts/WebsiteContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [allWebsitesOpen, setAllWebsitesOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const { mode, setMode } = useTheme();
    const { websites, selectedWebsite, handleWebsiteSelect } = useWebsiteContext();

    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (menuOpen) {
            setShouldRender(true);
            setIsAnimating(false);
        } else {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsAnimating(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [menuOpen]);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    const md5Email = user?.email ? MD5(user.email.toLowerCase().trim()).toString() : '';

    return (
        <nav className="flex flex-row items-center justify-between">
            <NavLink to={'/'} className="flex flex-row items-center">
                <span className="text-2xl font-semibold">honch</span>
                <span className="text-xs font-light text-secondary ml-1 -mt-1.5">BETA</span>
            </NavLink>

            <div className="flex flex-row items-center gap-3 text-sm font-medium">
                <div className="relative z-50">
                    <button
                        onClick={() => setAllWebsitesOpen(!allWebsitesOpen)}
                        className="w-full cursor-pointer flex flex-row items-center justify-between gap-2 px-2 h-8.5 rounded-lg bg-foreground border border-border transition-all duration-200 group"
                    >
                        <div className="flex flex-row items-center gap-2 overflow-hidden">
                            {selectedWebsite ? (
                                <>
                                    <span className="shrink-0 text-xs font-bold h-5 w-5 rounded bg-primary text-white flex items-center justify-center uppercase">
                                        {selectedWebsite.name[0]}
                                    </span>
                                    <span className="text-xs font-medium truncate w-full">{selectedWebsite.name}</span>
                                </>
                            ) : (
                                <>
                                    <span className="shrink-0 text-xs font-bold h-5 w-5 rounded bg-copy-lighter text-background flex items-center justify-center">
                                        <FontAwesomeIcon icon={faHome} />
                                    </span>
                                    <span className="text-xs font-medium">All Websites</span>
                                </>
                            )}
                        </div>
                        <FontAwesomeIcon
                            icon={faChevronDown}
                            className={`text-xs text-copy-light transition-transform duration-200 ${allWebsitesOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {allWebsitesOpen && (
                        <div className="absolute top-full right-0 mt-1 w-[200px] bg-background border border-border rounded-lg shadow-xl overflow-hidden animate-scale-in origin-top flex flex-col p-1 gap-0.5">

                            {websites.map((website) => (
                                <button
                                    key={website.id}
                                    onClick={() => handleWebsiteSelect(website)}
                                    className={`cursor-pointer flex flex-row items-center gap-2 p-1 rounded-md transition-colors text-left group ${selectedWebsite?.id === website.id ? 'bg-border' : 'hover:bg-foreground text-copy'}`}
                                >
                                    <span className={`shrink-0 text-xs font-bold h-5 w-5 rounded flex items-center justify-center uppercase ${selectedWebsite?.id === website.id ? 'bg-primary text-white' : 'bg-border border border-border'}`}>
                                        {website.name[0]}
                                    </span>
                                    <span className="text-xs font-medium truncate">{website.name}</span>
                                </button>
                            ))}
                            <Link
                                to={'/site/add'}
                                className="cursor-pointer flex flex-row items-center gap-2 p-1 rounded-md transition-colors text-left group hover:bg-foreground text-copy"
                            >
                                <span className="shrink-0 text-xs font-bold h-5 w-5 rounded flex items-center justify-center uppercase bg-foreground border border-border">
                                    +
                                </span>
                                <span className="text-xs font-medium truncate">Add Website</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* <NavLink to={'/help'} className="flex flex-row items-center gap-2 hover:text-copy text-copy-light duration-200 border border-border rounded-md px-3.5 h-8.5 transition bg-foreground/50">
                    <FontAwesomeIcon icon={faQuestionCircle} className="text-sm" />
                    <p>Help</p>
                </NavLink> */}

                <button onClick={() => setMenuOpen(!menuOpen)} ref={buttonRef} className="hover:brightness-105 hover:bg-foreground/50 flex flex-row items-center gap-2 cursor-pointer duration-200 transition border border-border bg-foreground/50 rounded-md">
                    <img src={`https://www.gravatar.com/avatar/${md5Email}?d=retro`} alt="Profile" className="w-8 h-8 rounded-md" />
                    <FontAwesomeIcon icon={faChevronDown} className={`text-copy-light text-sm mr-2.5 ${menuOpen ? 'rotate-180' : ''} duration-200 transition`} />
                </button>
            </div>

            {shouldRender &&
                <div ref={menuRef} className={`rounded-md z-50 absolute w-1/5 min-w-64 right-4 top-14 px-5 py-4 bg-background drop-shadow-lg border border-border ${isAnimating ? 'animate-fade-out' : 'animate-fade-in'
                    }`}>
                    <div className="border-b border-border pb-2 relative">
                        <h1 className="font-semibold text-lg">{user?.name}</h1>
                        <p className="font-light text-sm -mt-1">{user?.email}</p>

                        <div className="absolute top-0 right-0 flex flex-row w-max h-max">
                            <button
                                aria-label="Light Theme"
                                className={`cursor-pointer rounded-l-md px-2 py-1 text-sm font-medium transition-colors duration-150
                                    ${mode === 'light' ? 'bg-primary text-primary-content' : 'bg-foreground text-copy'}`}
                                onClick={() => setMode('light')}
                                type="button"
                            >
                                <FontAwesomeIcon icon={faSun} />
                            </button>
                            <button
                                aria-label="Dark Theme"
                                className={`cursor-pointer rounded-r-md px-2 text-sm font-medium transition-colors duration-150
                                    ${mode === 'dark' ? 'bg-primary text-primary-content' : 'bg-foreground text-copy'}`}
                                onClick={() => setMode('dark')}
                                type="button"
                            >
                                <FontAwesomeIcon icon={faMoon} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-3 w-full">
                        <NavLink to={'/account'} className="flex flex-row items-center gap-2 hover:cursor-pointer hover:translate-x-0.5 transition-transform duration-200 ease-in-out">
                            <FontAwesomeIcon icon={faCog} className="text-copy  text-sm" />
                            <p className="text-copy font-medium text-sm">Account Settings</p>
                        </NavLink>
                    </div>

                    <div className="flex flex-col gap-2 mt-2 w-full">
                        <button onClick={() => logout()} className="flex flex-row items-center gap-2 hover:cursor-pointer hover:translate-x-0.5 transition-transform duration-200 ease-in-out">
                            <FontAwesomeIcon icon={faSignOut} className="text-copy  text-sm" />
                            <p className="text-copy font-medium text-sm">Sign out</p>
                        </button>
                    </div>
                </div>
            }
        </nav>
    );
}

export default Navbar;