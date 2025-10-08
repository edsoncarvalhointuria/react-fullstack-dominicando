export async function reduzirImagem(
    file: File,
    maxWidth: number,
    maxHeight: number
): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(
                        maxWidth / width,
                        maxHeight / height
                    );
                    width = width * ratio;
                    height = height * ratio;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject("Sem imagem");
                        const novoArquivo = new File([blob], file.name, {
                            type: "image/jpeg",
                        });
                        resolve(novoArquivo);
                    },
                    "image/jpeg",
                    0.7
                );
            };
            img.src = event.target?.result as string;
        };

        reader.readAsDataURL(file);
    });
}
