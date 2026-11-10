"use client";

import dynamic from "next/dynamic";
import { PageLoading } from "@/components/page-loading";
import type { AgendaProps } from "./types";

// Il calendario lavora nel fuso orario del browser: lo disegniamo solo lato
// client, così il server (che può avere un altro fuso) non produce un HTML diverso.
const AgendaView = dynamic(() => import("./agenda-view").then((module) => module.AgendaView), {
  ssr: false,
  loading: () => <PageLoading />,
});

export function AgendaLoader(props: AgendaProps) {
  return <AgendaView {...props} />;
}
