import { motion } from "framer-motion";
import "./modal-skeleton.scss";

function ModalSkeleton() {
    return (
        <motion.div
            className="modal-skeleton__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div className="modal-skeleton" initial={{ y: -10 }} animate={{ y: 0 }}>
                <div className="modal-skeleton__header"></div>

                <div className="modal-skeleton__body">
                    <div className="modal-skeleton__lista">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>

                    <div className="modal-skeleton__buttons">
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default ModalSkeleton;
