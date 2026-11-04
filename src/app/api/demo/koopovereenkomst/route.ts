import { isDemo } from "@/lib/config";

export async function GET() {
  if (!isDemo()) return new Response("Niet beschikbaar", { status: 404 });
  const { koopovereenkomstPdf } = await import("@/lib/demo/pdfs");
  const pdf = await koopovereenkomstPdf();
  return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="voorbeeld-koopovereenkomst-bloesemlaan-14.pdf"' } });
}
