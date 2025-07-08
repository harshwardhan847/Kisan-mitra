import type { Route } from "./+types/home";
import AudioChat from "../audio_chat";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kisan Mitra" },
    {
      name: "description",
      content:
        "Leveraging Google's AI stack to create an intuitive, voice-first intelligent agent, providing farmers with an omnipresent expert for precise crop care, market foresight, and seamless government scheme guidance.",
    },
  ];
}

export default function Home() {
  return <AudioChat />;
}
