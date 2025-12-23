"use client";

import { CompanySort } from "@/src/lib/db/companyQueries";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { track } from "@/src/lib/analytics";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export function FiltersBar(props: { q: string; industry: string; county: string; sort: CompanySort; isPremium: boolean }) {
  const hasFilters = Boolean(props.q || props.industry || props.county || props.sort !== "romc_desc");
  return (
    <div className="space-y-3">
      <form className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-5" action="/companies" method="get">
        <input
          name="q"
          placeholder="Search name or CUI"
          defaultValue={props.q}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Search companies"
        />
        <input
          name="industry"
          placeholder="Industry slug"
          defaultValue={props.industry}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Filter by industry"
          onChange={(e) => {
            if (e.target.value && props.isPremium) {
              track("InvestorFilterUsed", { filterType: "industry", value: e.target.value });
            }
          }}
        />
        <input
          name="county"
          placeholder="County slug"
          defaultValue={props.county}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Filter by county"
          onChange={(e) => {
            if (e.target.value && props.isPremium) {
              track("InvestorFilterUsed", { filterType: "county", value: e.target.value });
            }
          }}
        />
        <select
          name="sort"
          defaultValue={props.sort}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Sort companies"
          onChange={(e) => {
            if (e.target.value !== "romc_desc") {
              track("InvestorFilterUsed", { filterType: "sort", value: e.target.value });
            }
          }}
        >
          <option value="romc_desc">ROMC (desc)</option>
          <option value="revenue_desc">Revenue (desc)</option>
          <option value="employees_desc">Employees (desc)</option>
          <option value="newest">Newest</option>
        </select>
        <div className="flex items-center justify-end gap-3 sm:col-span-1">
          <Button type="submit" size="sm">
            Apply
          </Button>
          <Link className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground" href="/companies">
            Clear
          </Link>
        </div>
      </form>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Active filters">
          <span className="text-xs font-medium">Active:</span>
          {props.q ? <Badge>{props.q}</Badge> : null}
          {props.industry ? <Badge>{props.industry}</Badge> : null}
          {props.county ? <Badge>{props.county}</Badge> : null}
          {props.sort && props.sort !== "romc_desc" ? <Badge>{props.sort}</Badge> : null}
        </div>
      ) : null}

      {/* Advanced filters - Premium only (show when filters are used) */}
      {!props.isPremium && hasFilters && (
        <Card className="mt-4 border-primary/20 bg-primary/5">
          <CardBody className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Filtre avansate disponibile</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Filtrează după scor ROMC, creștere, integritate și alți indicatori avansați cu Premium.
                </p>
              </div>
              <Link href="/pricing">
                <Button size="sm" variant="outline">
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

