import { faArrowRight, faChartSimple } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from 'react';
import { API_BASE } from "../../utils/config";
import { useAuth } from "../../contexts/AuthContext";

const Landing = () => {
    const { user } = useAuth();
    const [visitors, setVisitors] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [hovering, setHovering] = useState(false);

    const companies = [
        "DataFast",
        "Google Analytics",
        "Plausible",
        "Matamo",
        "Mixpanel",
        "Amplitude",
        "PostHog",
        "Hotjar",
        "FullStory",
        "Scoop",
    ];

    const infiniteCompanies = [...companies, ...companies];

    useEffect(() => {
        const fetchVisitors = async () => {
            const response = await fetch(`${API_BASE}/api/analytics/honch.io/visitors`);
            const data = await response.json();
            setVisitors(data.visitors);
        };
        fetchVisitors();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                const nextIndex = prev + 1;
                // Reset to middle section when we reach 2x the original length
                if (nextIndex >= companies.length * 2) {
                    return companies.length;
                }
                return nextIndex;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [companies.length]);

    return (
        <div className="min-h-screen w-full flex flex-col bg-linear-to-tr from-background to-background/50">
            <div className="flex flex-col min-h-screen px-4 py-3 gap-3">
                <div className="flex flex-row items-center w-full justify-between">
                    <h1 className="font-bold text-2xl md:text-3xl">honch<span className="text-copy-lighter">.</span></h1>
                    <div className="flex flex-row items-center gap-2 md:gap-7 text-xs md:text-sm font-medium">
                        <NavLink to={''} className={'flex flex-row items-center gap-1 md:gap-2 hover:text-copy-light duration-200 transition'}>
                            <FontAwesomeIcon icon={faArrowRight} />
                            <p className="">Pricing</p>
                        </NavLink>

                        <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className={'cursor-pointer flex flex-row items-center gap-1 md:gap-2 hover:text-copy-light duration-200 transition'}>
                            <FontAwesomeIcon icon={faArrowRight} />
                            <p className="">About</p>
                        </button>

                        <NavLink to={user ? '/help' : '/login'} className={'hidden md:flex flex-row items-center gap-1 md:gap-2 hover:text-copy-light duration-200 transition'}>
                            <FontAwesomeIcon icon={faArrowRight} />
                            <p className="">{user ? 'Help' : 'Log in'}</p>
                        </NavLink>

                        <NavLink to={user ? '/' : '/register'} className={`ml-2 md:ml-5 rounded-full bg-primary text-primary-content hover:bg-primary-content hover:text-primary px-3 md:px-5 py-1.5 font-semibold duration-200 transition text-xs md:text-sm`}>
                            {user ? 'Dashboard' : 'Get Started'}
                            <FontAwesomeIcon icon={faArrowRight} className="ml-1 md:ml-1.5" />
                        </NavLink>
                    </div>
                </div>

                <div className="flex-1 bg-foreground border border-border w-full rounded-3xl flex flex-col justify-center px-4 md:px-8 py-8 md:py-0">
                    <h1 className="text-copy font-semibold text-2xl sm:text-3xl md:text-6xl lg:text-8xl leading-tight">The analytics platform your team <span className="text-primary-light">doesn't</span> hate.</h1>
                    <span className="font-light text-sm sm:text-base md:text-lg text-copy-light mt-4 md:mt-7 max-w-full md:max-w-2xl">Honch turns complex performance data into clear, actionable insights anyone can understand.</span>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 mb-4 md:mb-0">
                    <div className="flex flex-col justify-between rounded-3xl px-4 md:px-5 py-3 bg-foreground border border-border w-full md:w-2/7 md:h-40">
                        <div className="flex flex-row items-center justify-between text-sm md:text-lg font-medium text-copy-light">
                            <h1>Statistics</h1>
                            <FontAwesomeIcon icon={faChartSimple} />
                        </div>

                        <span className="font-medium text-lg sm:text-xl md:text-3xl mt-2 leading-tight">
                            <span className="text-primary font-semibold">{visitors}</span> visitors within the last <span className="underline underline-offset-3">24 hours</span>.
                        </span>
                    </div>

                    {/* Mobile Version */}
                    <div className="md:hidden flex flex-row items-center justify-center font-semibold text-xl sm:text-xl gap-4 rounded-3xl w-full h-20 bg-foreground border border-border overflow-hidden">
                        <h1 className="">f<span className="text-primary">*</span>ck</h1>
                        <div className="flex flex-col text-copy h-full justify-center relative">
                            <div
                                className="flex flex-col transition-transform duration-500 ease-in-out"
                                style={{
                                    transform: `translateY(calc(50% - ${currentIndex * 32}px - 16px))`
                                }}
                            >
                                {infiniteCompanies.map((company, index) => (
                                    <h1
                                        key={`mobile-${company}-${index}`}
                                        className={`h-8 flex items-center transition-all duration-500 ease-in-out ${index === currentIndex ? 'text-copy scale-110' : 'text-copy-lighter scale-90'
                                            }`}
                                        style={{
                                            opacity: Math.abs(index - currentIndex) <= 2 ?
                                                (index === currentIndex ? 1 : 0.4) : 0.1
                                        }}
                                    >
                                        {company}
                                    </h1>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Version */}
                    <div id="companies" className="hidden md:flex flex-row items-center justify-center font-semibold text-2xl md:text-4xl gap-10 rounded-3xl w-full md:w-3/7 h-40 bg-foreground border border-border overflow-hidden">
                        <h1>f<span className="text-primary">*</span>ck</h1>
                        <div className="flex flex-col text-copy h-full justify-center relative">
                            <div
                                className="flex flex-col transition-transform duration-500 ease-in-out"
                                style={{
                                    transform: `translateY(calc(50% - ${currentIndex * 40}px - 20px))`
                                }}
                            >
                                {infiniteCompanies.map((company, index) => (
                                    <h1
                                        key={`desktop-${company}-${index}`}
                                        className={`h-10 flex items-center transition-all duration-500 ease-in-out ${index === currentIndex ? 'text-copy scale-110' : 'text-copy-lighter scale-90'
                                            }`}
                                        style={{
                                            opacity: Math.abs(index - currentIndex) <= 2 ?
                                                (index === currentIndex ? 1 : 0.4) : 0.1
                                        }}
                                    >
                                        {company}
                                    </h1>
                                ))}
                            </div>
                        </div>
                    </div>

                    <NavLink
                        to={user ? '/' : '/register'}
                        onMouseEnter={() => setHovering(true)}
                        onMouseLeave={() => setHovering(false)}
                        className={'font-[550] hover:font-black text-lg sm:text-2xl md:text-4xl justify-center bg-primary text-primary-content hover:bg-primary-content hover:text-primary rounded-3xl items-center flex flex-row w-full md:w-2/7 md:h-40 py-6 md:py-0 duration-200 transition-all'}
                    >
                        {user ? 'Dashboard' : 'Get Started'}
                        <FontAwesomeIcon icon={faArrowRight} className={`ml-2 md:ml-4 text-lg sm:text-2xl md:text-4xl ${hovering && '-rotate-45'} duration-200 transition`} />
                    </NavLink>
                </div>
            </div>

            <div id="about" className="flex flex-col md:flex-row px-4 gap-3 pb-3">
                <div className="flex flex-col gap-3">
                    <div className="bg-foreground border border-border rounded-3xl p-5 h-full">
                        <h1 className="font-bold text-4xl md:text-5xl">Let honch <span className="text-secondary">speak</span> for itself<span className="text-copy-lighter">.</span></h1>
                        <p className="text-copy-light font-light text-sm md:text-base mt-2">See how Honch can help your team make data-driven decisions.</p>
                    </div>

                    <NavLink
                        to={user ? '/' : '/register'}
                        className={'h-30 font-[550] hover:font-black text-lg sm:text-2xl md:text-4xl justify-center bg-secondary text-secondary-content hover:bg-secondary-content hover:text-secondary rounded-3xl items-center flex flex-row w-full md:h-50 py-6 md:py-0 duration-200 transition-all'}
                    >
                        View Features
                    </NavLink>
                </div>
                <div className="w-full overflow-clip bg-foreground border border-border rounded-3xl items-center justify-center flex">
                    <iframe
                        width="100%"
                        height="500"
                        src="https://www.youtube.com/embed/08e3Ur8KMNk?si=puhKpKW82nMk_P9R"
                        title="2hollis"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>

        </div>
    );
};

export default Landing;