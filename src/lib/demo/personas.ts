import { DEMO } from "./scenario";
import { NOTARY_OFFICE } from "@/lib/config";
import type { Role } from "@/lib/domain/types";

export const PERSONAS: { key: string; email: string; name: string; role: Role; label: string; description: string }[] = [
  { key: "koper", email: DEMO.kopers[0].email, name: "Sanne de Vries", role: "klant", label: "Koper", description: "Sanne koopt samen met Daan de woning aan de Bloesemlaan 14 (uitgebreide klantreis, 12 stappen)." },
  { key: "medekoper", email: DEMO.kopers[1].email, name: "Daan Bakker", role: "klant", label: "Medekoper", description: "Daan heeft nog een volmachtafspraak openstaan." },
  { key: "verkoper", email: DEMO.verkopers[0].email, name: "Henk Jansen", role: "klant", label: "Verkoper", description: "Henk verkoopt samen met Marijke (eenvoudige klantreis A–G)." },
  { key: "notaris", email: "notaris@example.com", name: NOTARY_OFFICE.notaryShort, role: "notaris", label: "Notaris", description: "Controlerende rol: N1–N7, dossieroverdracht, passeren." },
  { key: "beheer", email: "team@example.com", name: "Team Akteloket", role: "beheer", label: "Platform (beheer)", description: "Wat wij doen: automatisering, termijnen, uitgaande e-mail, ondersteuning." },
];

