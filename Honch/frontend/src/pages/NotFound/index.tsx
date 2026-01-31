import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faDog } from "@fortawesome/free-solid-svg-icons";

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center bg-gradient-to-tr from-background to-background/50 h-screen">
            <FontAwesomeIcon icon={faDog} className="text-primary text-6xl" />
            <h1 className="text-4xl font-bold mt-5">Page not found</h1>
            <p className="text-lg mt-1">Honcho couldn't fetch the page you were looking for, he is very sorry.</p>
            {/* router go back a page */}
            <button onClick={() => window.history.back()} className={'cursor-pointer mt-5 text-sm flex items-center gap-2 rounded-full px-6 py-1.5 text-copy-light bg-foreground/10 border border-border hover:bg-foreground hover:text-copy transition duration-200'}>
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Go Back</span>
            </button>
        </div>
    );
};

export default NotFound;