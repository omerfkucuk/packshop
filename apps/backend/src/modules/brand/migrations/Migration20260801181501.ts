import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260801181501 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "brand" ("id" text not null, "customer_id" text not null, "company_name" text null, "brand_name" text not null, "slogan" text null, "colors" text[] null, "heading_font" text null, "body_font" text null, "instagram_url" text null, "facebook_url" text null, "twitter_url" text null, "tiktok_url" text null, "website_url" text null, "logo_url" text null, "alternate_logo_urls" text[] null, "share_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_BRAND_CUSTOMER_ID" ON "brand" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_BRAND_SHARE_ID" ON "brand" ("share_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "brand" cascade;`);
  }

}
