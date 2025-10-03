import { Outlet } from "react-router-dom";
import Navbar from "./navbar/Navbar";
import { AnimatePresence } from "framer-motion";
import Footer from "./footer/Footer";

function DashboardLayout() {
    return (
        <>
            <Navbar />
            <AnimatePresence>
                <Outlet key={"outlet"} />
            </AnimatePresence>
            <Footer />
        </>
    );
}

export default DashboardLayout;
