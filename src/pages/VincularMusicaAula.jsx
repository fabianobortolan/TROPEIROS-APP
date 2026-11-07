import { useNavigate } from "react-router-dom";
import AssociarMusicaAula from "@/components/aulas/AssociarMusicaAula";

export default function VincularMusicaAula() {
  const navigate = useNavigate();
  return <AssociarMusicaAula onVoltar={() => navigate("/PlanoAulas")} />;
}