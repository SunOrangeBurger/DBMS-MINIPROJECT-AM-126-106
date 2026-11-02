-- ============================================================
-- AutoCare: 00_install_all.sql
-- One-shot installer. Run from the REPOSITORY ROOT so the relative paths resolve:
--
--     mysql -u root -p < sql/00_install_all.sql
--
-- WARNING: 01_schema.sql starts with DROP DATABASE IF EXISTS autocare,
-- so running this wipes and rebuilds the whole database (fine for development).
--
-- The transaction demo (06) and the example queries (07) are NOT included on
-- purpose: 06 deliberately fails midway to prove rollback, and 07 contains
-- UPDATE/DELETE demo statements. Run them separately when presenting.
-- ============================================================
SOURCE sql/01_schema.sql;
SOURCE sql/02_sample_data.sql;
SOURCE sql/03_views.sql;
SOURCE sql/04_procedures.sql;
SOURCE sql/05_triggers.sql;
SOURCE sql/08_alter_and_extensions.sql;
SOURCE sql/09_app_procedures.sql;
SOURCE sql/10_extra_sample_data.sql;
