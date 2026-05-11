"use client";

import Link from "next/link";
import type { Service } from "@/lib/db-types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, Droplets, Phone, Boxes } from "lucide-react";
import { useState } from "react";
import { CreateServiceDialog } from "@/components/services/create-service-dialog";
import { useEffect } from "react";
import { usePreferencesStore } from "@/stores/preferences-store";

const iconFor = (name: string) => {
  if (name.toLowerCase().includes("élec")) return Zap;
  if (name.toLowerCase().includes("eau")) return Droplets;
  if (name.toLowerCase().includes("télé")) return Phone;
  return Boxes;
};

type Props = {
  services: Service[];
  isAdmin: boolean;
};

export function ServicesGrid({ services, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const { language, initFromStorage } = usePreferencesStore();
  const isEn = language === "en";

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <>
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            {isEn ? "Add service" : "Ajouter un service"}
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => {
          const Icon = iconFor(service.name);
          const last = service.lastReconciled
            ? format(service.lastReconciled, "dd/MM/yyyy", { locale: fr })
            : "—";
          return (
            <Card key={service.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-lg leading-tight">
                    {service.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {service.description ?? (isEn ? "No description" : "Aucune description")}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <Badge variant="secondary" className="text-xs">
                  {isEn ? "Last reconciliation" : "Dernière réconciliation"} : {last}
                </Badge>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/dashboard/reconciliation/${service.id}`}>
                    {isEn ? "Start reconciliation" : "Lancer la réconciliation"}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      {isAdmin && (
        <CreateServiceDialog open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}
