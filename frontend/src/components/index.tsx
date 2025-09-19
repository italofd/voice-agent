"use client";
import dynamic from "next/dynamic";

const Pipecat = dynamic(() => import("@/components/pipecat"), {
	ssr: false,
});

export default function PipecatRoot() {
	return <Pipecat />;
}
