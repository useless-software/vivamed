import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/page-loading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateOnly } from "@/lib/format";
import { t } from "@/lib/messages";
import { patientSearchWhere } from "@/lib/patient-search";

export const metadata: Metadata = { title: t.patients.title };

const PAGE_SIZE = 25;

export default function PatientsPage({ searchParams }: PageProps<"/pazienti">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PatientsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PatientsContent({ searchParams }: Pick<PageProps<"/pazienti">, "searchParams">) {
  await requirePermission("patients.read");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const requestedPage = Math.max(1, Number.parseInt(String(params.pagina ?? "1"), 10) || 1);

  const where = patientSearchWhere(query);
  const total = await db.patient.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const patients = await db.patient.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, firstName: true, lastName: true, fiscalCode: true, birthDate: true, phone: true },
  });

  const pageHref = (target: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (target > 1) search.set("pagina", String(target));
    const text = search.toString();
    return text ? `/pazienti?${text}` : "/pazienti";
  };

  return (
    <>
      <PageHeader title={t.patients.title} subtitle={t.patients.subtitle}>
        <Link href="/pazienti/nuovo" className={buttonVariants()}>
          <PlusIcon /> {t.patients.new}
        </Link>
      </PageHeader>

      <Form action="/pazienti" className="mb-4 flex max-w-xl gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t.patients.searchPlaceholder}
          aria-label={t.common.search}
        />
        <Button type="submit" variant="outline">
          <SearchIcon /> {t.common.search}
        </Button>
      </Form>

      {patients.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {query ? t.patients.empty : t.patients.emptyStart}
        </p>
      ) : (
        <>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.patients.lastName}</TableHead>
                  <TableHead>{t.patients.firstName}</TableHead>
                  <TableHead>{t.patients.fiscalCode}</TableHead>
                  <TableHead>{t.patients.birthDate}</TableHead>
                  <TableHead>{t.patients.phone}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">
                      <Link href={`/pazienti/${patient.id}`} className="text-primary hover:underline">
                        {patient.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{patient.firstName}</TableCell>
                    <TableCell className="font-mono text-xs">{patient.fiscalCode}</TableCell>
                    <TableCell>{formatDateOnly(patient.birthDate)}</TableCell>
                    <TableCell>{patient.phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>{t.patients.count(total)}</span>
            {pages > 1 ? (
              <span className="flex items-center gap-2">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {t.common.previous}
                  </Link>
                ) : null}
                {t.patients.page(page, pages)}
                {page < pages ? (
                  <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {t.common.next}
                  </Link>
                ) : null}
              </span>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
