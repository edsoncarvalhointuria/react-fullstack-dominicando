import type { ReactNode } from "react";
import "./loading.scss";
import { motion } from "framer-motion";
import { localStorageObj } from "../../../data/localStorageObj";
export default function LoadingVideo({ isOpen, children }: { isOpen: boolean; children?: ReactNode }) {
    if (!isOpen) return;

    const link = localStorage.getItem(localStorageObj["dominicando-loading"]) || "/loop.mp4";
    const regex = /.+(\.mp4)|(\.webm)/;
    const isVideo = regex.test(link);
    const isLoop = !isVideo || link === "/loop.mp4";

    return (
        <div className="loading-video" style={isLoop ? { backgroundColor: "#f0f0f0" } : { backgroundColor: "#ffffff" }}>
            <motion.div
                className="loading-video__container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
            >
                <div className={`loading-video__video ${isLoop ? "loading-video__video--loop" : ""}`}>
                    {isLoop ? (
                        <video autoPlay loop muted playsInline width={400} height={300}>
                            <source src="/loop.mp4" />
                        </video>
                    ) : (
                        <video autoPlay loop muted playsInline>
                            <source src={link} />
                        </video>
                    )}
                </div>

                {children}
            </motion.div>
        </div>
    );
}
