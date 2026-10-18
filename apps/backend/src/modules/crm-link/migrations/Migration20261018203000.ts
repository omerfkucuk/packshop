import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018203000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "crm_link" ("id" text not null, "customer_id" text not null, "twenty_person_id" text null, "twenty_company_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "crm_link_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_CRM_LINK_CUSTOMER_ID" ON "crm_link" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_link_deleted_at" ON "crm_link" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "crm_link" cascade;`);
  }

}
