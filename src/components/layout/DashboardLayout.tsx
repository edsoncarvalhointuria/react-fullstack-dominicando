import { Outlet } from "react-router-dom";
import Navbar from "./navbar/Navbar";
import Footer from "./footer/Footer";

function DashboardLayout() {
    return (
        <>
            <Navbar />

            <Outlet />

            <Footer />
        </>
    );
}

export default DashboardLayout;
