import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260816160747 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "design_draft" ("id" text not null, "customer_id" text not null, "product_id" text not null, "brand_id" text null, "selected_theme" text null, "selected_elements" jsonb not null, "manual_overrides" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "design_draft_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_DESIGN_DRAFT_CUSTOMER_ID" ON "design_draft" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_draft_deleted_at" ON "design_draft" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "design_draft" cascade;`);
  }

}
