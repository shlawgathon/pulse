import { useEffect, useState } from "react";

const Modal = ({ children, className, show, setShow }: { children: React.ReactNode, className?: string, show: boolean, setShow: (show: boolean) => void }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [show]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setShow(false);
        }, 300);
    };

    if (!show) return null;

    return (
        <div onClick={() => handleClose()} className={`fixed inset-0 bg-background/40 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out ${className} ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {children}
        </div>
    )
}

export default Modal;