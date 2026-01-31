import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { faInfoCircle, faScroll, faShield } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Contact = () => {
    return (
        <div className="mt-7">
            <h2 className="text-2xl tracking-wide font-semibold mb-3">Contact Us</h2>
            <div className="flex flex-col gap-4 w-3/4">
                <a href="mailto:support@honch.io" className="flex flex-row items-center gap-4 text-sm text-copy-light border border-border rounded-md px-4 py-5 hover:bg-foreground/50 transition duration-200 ease-in-out">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-primary-dark/80 text-2xl" />
                    <div className="flex flex-col">
                        <span className="font-semibold">Having account or billing issues?</span>
                        <span className="text-xs tracking-wide">Email us for priority support - <span className="font-semibold">support@honch.io</span></span>
                    </div>
                </a>

                <a href="https://discord.gg/honch" target="_blank" className="flex flex-row items-center gap-4 text-sm text-copy-light border border-border rounded-md px-4 py-5 hover:bg-foreground/50 transition duration-200 ease-in-out">
                    <FontAwesomeIcon icon={faDiscord} className="text-primary-dark/80 text-2xl" />
                    <div className="flex flex-col">
                        <span className="font-semibold">Want to join the Honch community?</span>
                        <span className="text-xs tracking-wide">Join our Discord for support and updates - <span className="font-semibold">https://discord.gg/honch</span></span>
                    </div>
                </a>

                <a href="https://honch.io/privacy" target="_blank" className="flex flex-row items-center gap-4 text-sm text-copy-light border border-border rounded-md px-4 py-5 hover:bg-foreground/50 transition duration-200 ease-in-out">
                    <FontAwesomeIcon icon={faShield} className="text-primary-dark/80 text-2xl" />
                    <div className="flex flex-col">
                        <span className="font-semibold">Privacy Policy</span>
                        <span className="text-xs tracking-wide">View our privacy policy - <span className="font-semibold">https://honch.io/privacy</span></span>
                    </div>
                </a>

                <a href="https://honch.io/terms" target="_blank" className="flex flex-row items-center gap-4 text-sm text-copy-light border border-border rounded-md px-4 py-5 hover:bg-foreground/50 transition duration-200 ease-in-out">
                    <FontAwesomeIcon icon={faScroll} className="text-primary-dark/80 text-2xl" />
                    <div className="flex flex-col">
                        <span className="font-semibold">Terms of Service</span>
                        <span className="text-xs tracking-wide">View our terms of service - <span className="font-semibold">https://honch.io/terms</span></span>
                    </div>
                </a>
            </div>
        </div>
    );
};

export default Contact;