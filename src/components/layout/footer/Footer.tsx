import "./footer.scss";

function Footer() {
    // Pega o ano atual dinamicamente para o copyright
    const anoAtual = new Date().getFullYear();

    return (
        <footer className="main-footer">
            <p>
                <span>&copy; {anoAtual} Dominicando</span>{" "}
                <span>
                    Desenvolvido com ❤️ por{" "}
                    <a
                        href="https://edsoncarvalhointuria.github.io/portfolio/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Edson Carvalho Inturia
                    </a>
                </span>
            </p>
        </footer>
    );
}

export default Footer;
