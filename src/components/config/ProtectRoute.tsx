import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import type { ReactNode } from "react";

function ProtectRoute({ children }: { children: ReactNode }) {
    const location = useLocation();

    const { user } = useAuthContext();

    return (
        <>
            {user ? (
                <>{children}</>
            ) : (
                <Navigate
                    to={"/"}
                    state={{ from: `${location.pathname}${location.search}` }}
                />
            )}
        </>
    );
}

export default ProtectRoute;
