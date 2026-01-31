import { faArrowLeft, faArrowRight, faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import toast from "react-hot-toast";
import { NavLink } from "react-router-dom";
import { API_BASE } from "../../utils/config";
import { useAuth } from "../../contexts/AuthContext";

const AddWebsite = () => {
    const { token } = useAuth();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');
    const [data, setData] = useState<any>(null);
    const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

    const websiteCreateRequest = async (name: string, domain: string, timezone: string): Promise<void> => {
        const response = await fetch(API_BASE + '/api/websites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, domain, timezone }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const data = await response.json();
        return data;
    }

    const next = () => {
        if (domain == '' || name == '') {toast.error('Please fill all of the fields.'); return};
        toast.promise(websiteCreateRequest(name, domain, timezone), {
            loading: 'Creating website...',
            success: 'Website created successfully',
            error: (error: any) => error.message,
        }).then((data) => {
            setData(data);
            setStep(2);
        });
    }

    const ProgressBar = () => {
        const steps = [
            { id: 1, title: "Website Details" },
            { id: 2, title: "Install Script" },
            { id: 3, title: "Done" }
        ];

        return (
            <div className="flex items-center justify-center mb-8 w-xl">
                <div className="flex items-center space-x-4">
                    {steps.map((stepItem, index) => (
                        <div key={stepItem.id} className="flex items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                                step >= stepItem.id 
                                    ? 'bg-primary border-primary text-primary-content' 
                                    : 'bg-transparent border-border text-copy-lighter'
                            }`}>
                                {step > stepItem.id ? (
                                    <FontAwesomeIcon icon={faCheck} className="text-xs" />
                                ) : (
                                    <span className="text-xs font-medium">{stepItem.id}</span>
                                )}
                            </div>
                            <span className={`ml-2 text-sm font-medium transition-colors duration-300 ${
                                step >= stepItem.id ? 'text-copy' : 'text-copy-lighter'
                            }`}>
                                {stepItem.title}
                            </span>
                            {index < steps.length - 1 && (
                                <div className={`w-12 h-0.5 mx-4 transition-all duration-300 ${
                                    step > stepItem.id ? 'bg-primary' : 'bg-border'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={'bg-gradient-to-tr from-background to-background/50 flex flex-col items-center justify-center h-screen w-full relative'}>
            <NavLink to='/' className={'text-sm absolute top-4 left-4 flex items-center gap-2 rounded-full px-5 py-1.5 text-copy-light bg-foreground/10 border border-border hover:bg-foreground hover:text-copy transition duration-200'}>
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Home</span>
            </NavLink>

            <ProgressBar />

            <div className="bg-foreground border border-border rounded-md w-xl">
                <div className="border-b border-border px-6 py-4">
                    {step == 1 ? (
                        <>
                            <h1 className="font-medium">Add a new website</h1>
                            <p className="text-xs font-light text-copy-lighter">Track analytics and insights for your next website</p>
                        </>
                    ) : (
                        <>
                            <h1 className="font-medium">Install the Honch script</h1>
                            <p className="text-xs font-light text-copy-lighter">Paste the code snippet in the head of your site. If you need more help, see our <a className="text-primary-light underline hover:text-primary transition duration-200" href="https://honch.io/docs/installation" target="_blank">installation guides</a> .</p>
                        </>
                    )}
                    
                </div>

                {step == 1 ? (
                    <div className="border-b border-border px-6 py-5">
                        <div className="flex flex-row justify-between">
                            <h1 className="text-sm font-medium text-copy">Name</h1>
                            <div className="w-2/3 flex flex-col">
                                <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full rounded-md bg-background/50 px-4 py-2 text-sm border border-border focus:outline-none focus:border-primary transition duration-200" placeholder="AssetBox"/>
                                <p className="text-xs text-copy-lighter mt-1">This is what we call your website</p>
                            </div>
                        </div>

                        <div className="flex flex-row justify-between mt-5">
                            <h1 className="text-sm font-medium text-copy">Domain</h1>
                            <div className="w-2/3 flex flex-col">
                                <div className="flex flex-row items-center">
                                    <p className="px-4 py-2 text-sm bg-background border-l border-t border-b border-border rounded-l-md">
                                        https://
                                    </p>
                                    <input value={domain} onChange={(e) => setDomain(e.target.value)} type="text" className="w-full rounded-r-md bg-background/50 px-4 py-2 text-sm border border-border focus:outline-none focus:border-primary transition duration-200" placeholder="assetbox.net"/>
                                </div>
                                <p className="text-xs text-copy-lighter mt-1">Do not include www or https://</p>
                            </div>
                        </div>

                        <div className="flex flex-row justify-between mt-5">
                            <h1 className="text-sm font-medium text-copy">Timezone</h1>
                            <div className="w-2/3 flex flex-col">
                                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full rounded-md bg-background/50 px-4 py-2 text-sm border border-border focus:outline-none focus:border-primary transition duration-200">
                                    {Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone').map(tz => (
                                        <option key={tz} value={tz}>{tz}</option>
                                    )) : (
                                        <>
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York">America/New_York</option>
                                            <option value="Europe/London">Europe/London</option>
                                            <option value="Asia/Tokyo">Asia/Tokyo</option>
                                        </>
                                    )}
                                </select>
                                <p className="text-xs text-copy-lighter mt-1">Used for localizing charts and reports</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="border-b border-border px-6 py-5">
                        <pre className="text-xs bg-background/50 p-4 rounded-md border border-border overflow-x-auto relative">
                            <div className="absolute top-3 right-4">
                                <FontAwesomeIcon icon={faCopy} className="text-copy-lighter hover:cursor-pointer hover:text-copy transition duration-200" onClick={() => {
                                    const scriptCode = `<script 
    defer 
    data-website-id="${data.website.publicId}"
    data-domain="${data.website.domain}" 
    src="https://api.honch.io/script.js">
</script>`;
                                    toast.promise(navigator.clipboard.writeText(scriptCode), {
                                        loading: 'Copying to clipboard...',
                                        success: 'Copied to clipboard',
                                        error: 'Failed to copy to clipboard',
                                    });
                                }} />
                            </div>
                            <code className="text-sm">
                                <span className="text-orange-400">&lt;script</span>
                                <br />
                                <span className="text-blue-400 ml-4">defer</span>
                                <br />
                                <span className="text-blue-400 ml-4">data-website-id=</span>
                                <span className="text-green-400">"{data.website.publicId}"</span>
                                <br />
                                <span className="text-blue-400 ml-4">data-domain=</span>
                                <span className="text-green-400">"{data.website.domain}"</span>
                                <br />
                                <span className="text-blue-400 ml-4">src=</span>
                                <span className="text-green-400">"https://api.honch.io/script.js"</span>
                                <span className="text-orange-400">&gt;</span>
                                <br />
                                <span className="text-orange-400">&lt;/script&gt;</span>
                            </code>
                        </pre>
                    </div>
                )}

                <div className="flex flex-row items-center px-6 py-3 gap-2 justify-between">
                    <NavLink to="/" className="text-xs border border-border rounded-md px-6 py-2 hover:cursor-pointer hover:bg-border transition duration-200">
                        Cancel
                    </NavLink>

                    {step == 1 ? (
                        <button onClick={() => next()} className="bg-primary text-primary-content text-xs rounded-md px-6 py-2 hover:cursor-pointer hover:bg-primary/80 hover:text-primary-content/80 transition duration-200">
                            Continue
                            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                        </button>
                    ) : (
                        <NavLink to={'/'} className="bg-primary text-primary-content text-xs rounded-md px-6 py-2 hover:cursor-pointer hover:bg-primary-content hover:text-primary transition duration-200">
                            Done
                            <FontAwesomeIcon icon={faCheck} className="ml-2" />
                        </NavLink>
                    )}
                </div>
            </div>

        </div>
    )
}

export default AddWebsite;