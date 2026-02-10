import { useNavigate } from "react-router-dom";
import imgRetirada from "../../assets/retirada.png";
import imgContagem from "../../assets/contagem.png";

export default function PainelEstoquista() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", color: "#e6edf3" }}>
      <div className="flex flex-col items-center justify-start w-full gap-10 pb-20">


        {/* CARD 2 */}
        <div
          onClick={() => navigate("/painel-requisicoes")}
          className="relative w-[90%] max-w-[900px] h-[220px] rounded-xl overflow-hidden cursor-pointer shadow-xl group"
        >
          <img
            src={imgRetirada}
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
          />

          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <p className="text-white font-semibold text-3xl drop-shadow-lg">
              Retirada de Produtos
            </p>
          </div>
        </div>

        {/* CARD 3 */}
        <div
          onClick={() => navigate("/contagem-real")}
          className="relative w-[90%] max-w-[900px] h-[220px] rounded-xl overflow-hidden cursor-pointer shadow-xl group"
        >
          <img
            src={imgContagem}
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
          />

          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <p className="text-white font-semibold text-3xl drop-shadow-lg">
              Contagem Real do Estoque
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}