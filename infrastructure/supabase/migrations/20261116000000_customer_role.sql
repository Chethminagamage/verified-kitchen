-- =====================================================================
-- Consumer accounts: a 'customer' role for people using the mobile app.
--
-- On its own because a new enum value must be committed before it can be
-- used (the next migration makes it the default role of new sign-ups).
-- =====================================================================

alter type public.user_role add value if not exists 'customer';
