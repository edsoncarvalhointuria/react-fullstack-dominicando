import { motion } from "framer-motion";
import "./dashboard-card.scss";

function DashboardCardSkeleton() {
    return (
        <motion.div
            className="dashboard-card dashboard-card--skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="dashboard-card__header">
                <div className="skeleton skeleton-circle"></div>
                <div className="skeleton skeleton-line skeleton-title"></div>
            </div>
            <div className="dashboard-card__body">
                <div className="skeleton skeleton-line skeleton-value"></div>
                <div className="skeleton skeleton-chart"></div>
            </div>
        </motion.div>
    );
}

export default DashboardCardSkeleton;
