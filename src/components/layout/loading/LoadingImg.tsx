import { localStorageObj } from "../../../data/localStorageObj";
import "./loading.scss";

function LoadingImg() {
    const link = localStorage.getItem(localStorageObj["dominicando-loading"]) || "/loading.webp";
    const regex = /.+(\.mp4)|(\.webm)/;
    const isVideo = regex.test(link);

    return (
        <div className="loading">
            <div className="loading-img">
                <img src={isVideo ? "/loading.webp" : link} alt="Loading Img" />
            </div>
        </div>
    );
}

export default LoadingImg;
