import { localStorageObj } from "../../../data/localStorageObj";
import LoadingImg from "./LoadingImg";
import LoadingVideo from "./LoadingVideo";

export default function Loading() {
    const link = localStorage.getItem(localStorageObj["dominicando-loading"]) || "/loading.webp";
    const isVideo = /.+(\.mp4)|(\.webm)/.test(link);

    return isVideo ? <LoadingVideo isOpen /> : <LoadingImg />;
}
