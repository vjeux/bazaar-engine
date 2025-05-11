"use client";
import dynamic from "next/dynamic";

const SimulatorPage = dynamic(() => import("./SimulatorPage"), { ssr: false });

export default function Home() {
  return <SimulatorPage />;
}
