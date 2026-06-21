import type { ReactNode } from "react";
import "./loading.scss";
import { motion } from "framer-motion";
export default function LoadingVideo({ isOpen, children }: { isOpen: boolean; children?: ReactNode }) {
    if (!isOpen) return;
    return (
        <div className="loading-video">
            <motion.div
                className="loading-video__container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
            >
                <div className="loading-video__video">
                    <video autoPlay loop muted playsInline width={400} height={300}>
                        <source src="/loop.mp4" />
                    </video>
                </div>

                {children}
            </motion.div>
        </div>
    );
}
